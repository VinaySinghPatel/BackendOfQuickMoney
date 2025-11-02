// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');
const User = require('../models/User');
const mongoose = require('mongoose');

router.post('/send', async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;
    // Fix: Use hyphen to match frontend and socket.io format
    const roomId = [senderId, receiverId].sort().join('-');

    const newMessage = new Chat({
      senderId,
      receiverId,
      message,
      roomId
    });

    await newMessage.save();
    res.status(201).json({ success: true, data: newMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Message not sent' });
  }
});

router.get('/history/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    // Validate both userIds
    if (!mongoose.Types.ObjectId.isValid(user1) || !mongoose.Types.ObjectId.isValid(user2)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    // Build roomId (same format as used in send endpoint)
    const roomId = [user1, user2].sort().join('-');

    // Fetch ALL messages for this conversation, sorted by timestamp (oldest first)
    const allMessages = await Chat.find({ roomId })
      .sort({ timestamp: 1 }) // Ascending order: oldest messages first
      .lean();

    // Deduplicate messages: remove duplicates based on _id first, then content and timestamp
    const seenIds = new Set();
    const seenMessages = new Map();
    const messages = [];
    
    for (const msg of allMessages) {
      // First check: Skip if we've already seen this exact _id
      if (seenIds.has(msg._id.toString())) {
        continue;
      }
      
      // Second check: Look for duplicates with same content, sender, receiver, and timestamp (within 2 seconds)
      const msgTimestamp = new Date(msg.timestamp).getTime();
      let isDuplicate = false;
      
      for (const [key, seenMsg] of seenMessages.entries()) {
        // Check if same message content, same participants
        if (seenMsg.message === msg.message && 
            seenMsg.senderId.toString() === msg.senderId.toString() && 
            seenMsg.receiverId.toString() === msg.receiverId.toString()) {
          const seenTimestamp = new Date(seenMsg.timestamp).getTime();
          const timeDiff = Math.abs(seenTimestamp - msgTimestamp);
          
          // If messages are identical and within 2 seconds, treat as duplicate
          if (timeDiff < 2000) {
            isDuplicate = true;
            // Keep the one with earlier timestamp (or keep first one seen)
            break;
          }
        }
      }
      
      if (!isDuplicate) {
        messages.push(msg);
        seenIds.add(msg._id.toString());
        // Use a composite key for tracking
        const messageKey = `${msg.senderId.toString()}-${msg.receiverId.toString()}-${msg.message}-${msgTimestamp}`;
        seenMessages.set(messageKey, msg);
      }
    }

    res.json({ 
      success: true, 
      data: messages,
      count: messages.length,
      roomId: roomId
    });
  } catch (err) {
    console.error('Error fetching chat history:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// New endpoint: Get all conversations for a user
router.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find all messages where user is either sender or receiver
    const messages = await Chat.find({
      $or: [
        { senderId: userObjectId },
        { receiverId: userObjectId }
      ]
    })
    .sort({ timestamp: -1 })
    .lean();

    // If no messages, return empty array
    if (!messages || messages.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        count: 0
      });
    }

    // Group messages by participant pair (to avoid duplicates from different roomId formats)
    // Use sorted participant IDs as the unique key
    const conversationsMap = new Map();

    for (const msg of messages) {
      // Get participant IDs
      const senderIdStr = msg.senderId?.toString();
      const receiverIdStr = msg.receiverId?.toString();
      
      if (!senderIdStr || !receiverIdStr) {
        continue;
      }

      // Create a normalized key based on sorted participant IDs (regardless of roomId format)
      const participantIds = [senderIdStr, receiverIdStr].sort();
      const conversationKey = participantIds.join('-');
      
      // Normalize roomId to use hyphen format
      const normalizedRoomId = participantIds.join('-');
      
      // Update message with normalized roomId
      msg.roomId = normalizedRoomId;
      
      // Only keep the most recent message for this conversation
      if (!conversationsMap.has(conversationKey)) {
        conversationsMap.set(conversationKey, msg);
      } else {
        // Compare timestamps and keep the more recent message
        const existingMsg = conversationsMap.get(conversationKey);
        const existingTime = new Date(existingMsg.timestamp || 0);
        const currentTime = new Date(msg.timestamp || 0);
        
        if (currentTime > existingTime) {
          conversationsMap.set(conversationKey, msg);
        }
      }
    }

    // Convert map to array and identify the other participant
    const conversations = [];

    for (const [conversationKey, lastMessage] of conversationsMap) {
      try {
        // Determine who the other participant is
        const senderIdStr = lastMessage.senderId?.toString();
        const receiverIdStr = lastMessage.receiverId?.toString();
        const userIdStr = userId;
        
        if (!senderIdStr || !receiverIdStr) {
          continue;
        }
        
        const otherParticipantId = 
          senderIdStr === userIdStr 
            ? lastMessage.receiverId 
            : lastMessage.senderId;

        // Fetch other participant's user details
        const otherParticipant = await User.findById(otherParticipantId).lean();

        if (otherParticipant) {
          // Use normalized roomId (hyphen format)
          const normalizedRoomId = [senderIdStr, receiverIdStr].sort().join('-');
          
          conversations.push({
            roomId: normalizedRoomId,
            otherParticipant: {
              _id: otherParticipant._id,
              name: otherParticipant.name || 'Unknown User',
              username: otherParticipant.username || null,
              email: otherParticipant.email || null,
              city: otherParticipant.city || null,
              state: otherParticipant.state || null,
              country: otherParticipant.country || null,
            },
            lastMessage: {
              message: lastMessage.message || '',
              timestamp: lastMessage.timestamp || new Date(),
              senderId: lastMessage.senderId,
              receiverId: lastMessage.receiverId,
              isSentByMe: senderIdStr === userIdStr
            }
          });
        }
      } catch (participantError) {
        console.error('Error processing participant:', participantError);
        // Continue to next conversation instead of failing entire request
        continue;
      }
    }

    // Sort by timestamp (most recent first)
    conversations.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.timestamp || 0);
      const timeB = new Date(b.lastMessage?.timestamp || 0);
      return timeB - timeA;
    });

    res.json({ 
      success: true, 
      data: conversations,
      count: conversations.length
    });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch conversations',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;

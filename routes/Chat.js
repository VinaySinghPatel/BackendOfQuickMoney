// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');

router.post('/send', async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;
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
    const roomId = [user1, user2].sort().join('-');

    const messages = await Chat.find({ roomId }).sort({ timestamp: 1 });

    res.json({ success: true, data: messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

module.exports = router;

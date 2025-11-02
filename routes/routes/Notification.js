const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');
const FetchUser = require('../middleware/FetchUser');

// Send notification API - Send loan request notification
router.post('/send-notification', FetchUser, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user.id;

    // Validate receiverId
    if (!receiverId) {
      return res.status(400).json({ success: false, error: 'Receiver ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, error: 'Invalid receiver ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ success: false, error: 'Invalid sender ID format' });
    }

    // Fetch sender's profile data
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ success: false, error: 'Sender not found' });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, error: 'Receiver not found' });
    }

    // Check if user is trying to send notification to themselves
    if (senderId === receiverId) {
      return res.status(400).json({ success: false, error: 'Cannot send notification to yourself' });
    }

    // Prepare sender profile data
    const senderProfile = {
      name: sender.name || '',
      email: sender.email || '',
      username: sender.username || '',
      city: sender.city || '',
      state: sender.state || '',
      country: sender.country || '',
      mobilenumber: sender.mobilenumber || null,
      aadharNumber: sender.aadharNumber || '',
      panCardNumber: sender.panCardNumber || '',
      pinCode: sender.pinCode || ''
    };

    // Create notification
    const newNotification = new Notification({
      senderId,
      receiverId,
      message: message || 'Loan request',
      type: 'loan_request',
      status: 'pending',
      senderProfile
    });

    await newNotification.save();

    res.status(201).json({ 
      success: true, 
      data: newNotification,
      message: 'Notification sent successfully'
    });
  } catch (err) {
    console.error('Error sending notification:', err);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

// Respond API - Accept or reject loan request
router.post('/respond', FetchUser, async (req, res) => {
  try {
    const { notificationId, response } = req.body; // response: 'accepted' or 'rejected'
    const responderId = req.user.id;

    // Validate inputs
    if (!notificationId) {
      return res.status(400).json({ success: false, error: 'Notification ID is required' });
    }

    if (!response || (response !== 'accepted' && response !== 'rejected')) {
      return res.status(400).json({ success: false, error: 'Response must be either "accepted" or "rejected"' });
    }

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ success: false, error: 'Invalid notification ID format' });
    }

    // Find the notification
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    // Verify that the responder is the receiver of the notification
    if (notification.receiverId.toString() !== responderId) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only respond to notifications sent to you' });
    }

    // Check if notification is already responded to
    if (notification.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Notification has already been responded to' });
    }

    // Update notification status
    const status = response === 'accepted' ? 'accepted' : 'rejected';
    notification.status = status;
    await notification.save();

    // Get responder's profile data
    const responder = await User.findById(responderId);
    if (!responder) {
      return res.status(404).json({ success: false, error: 'Responder not found' });
    }

    // Create a response notification to send back to the original sender
    const responderProfile = {
      name: responder.name || '',
      email: responder.email || '',
      username: responder.username || '',
      city: responder.city || '',
      state: responder.state || '',
      country: responder.country || '',
      mobilenumber: responder.mobilenumber || null,
      aadharNumber: responder.aadharNumber || '',
      panCardNumber: responder.panCardNumber || '',
      pinCode: responder.pinCode || ''
    };

    // Create response notification (sender becomes responder, receiver becomes original sender)
    const responseNotification = new Notification({
      senderId: responderId, // The person who is responding
      receiverId: notification.senderId, // The original sender
      message: response === 'accepted' 
        ? `Your loan request has been accepted by ${responder.name || 'the user'}`
        : `Your loan request has been rejected by ${responder.name || 'the user'}`,
      type: 'loan_response',
      status: status,
      senderProfile: responderProfile
    });

    await responseNotification.save();

    res.status(200).json({ 
      success: true, 
      data: {
        originalNotification: notification,
        responseNotification: responseNotification
      },
      message: `Loan request ${status} successfully`
    });
  } catch (err) {
    console.error('Error responding to notification:', err);
    res.status(500).json({ success: false, error: 'Failed to respond to notification' });
  }
});

// Get all notifications API - Fetch all notifications for a user
router.get('/all-notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    // Fetch all notifications where user is either sender or receiver
    const notifications = await Notification.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
    .populate('senderId', 'name email username')
    .populate('receiverId', 'name email username')
    .sort({ timestamp: -1 }) // Most recent first
    .lean();

    // Transform notifications to include user details
    const formattedNotifications = notifications.map(notif => ({
      _id: notif._id,
      senderId: notif.senderId,
      receiverId: notif.receiverId,
      senderProfile: notif.senderProfile,
      message: notif.message,
      type: notif.type,
      status: notif.status,
      timestamp: notif.timestamp,
      // Add user details for easy access
      sender: notif.senderId && typeof notif.senderId === 'object' ? {
        _id: notif.senderId._id,
        name: notif.senderId.name,
        email: notif.senderId.email,
        username: notif.senderId.username
      } : null,
      receiver: notif.receiverId && typeof notif.receiverId === 'object' ? {
        _id: notif.receiverId._id,
        name: notif.receiverId.name,
        email: notif.receiverId.email,
        username: notif.receiverId.username
      } : null,
      // Helper flag to check if current user is the sender
      isSentByMe: (notif.senderId && typeof notif.senderId === 'object' && notif.senderId._id) 
        ? notif.senderId._id.toString() === userId 
        : notif.senderId.toString() === userId
    }));

    res.json({ 
      success: true, 
      data: formattedNotifications,
      count: formattedNotifications.length
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

module.exports = router;


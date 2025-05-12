const express = require('express');
const router = express.Router();
const LoanAgreement = require('../models/LoanAgreement');
const Chat = require('../models/chat');
const FetchUser = require('../middleware/FetchUser');
const User = require('../models/User');

router.post('/confirm', FetchUser, async (req, res) => {
  try {
    const { postId, borrowerId, lenderId, loanAmount, interestRate, signatureUrl, borrowerName } = req.body;

    // Validate borrowerId matches authenticated user
    if (req.user.id !== borrowerId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Verify lender exists
    const lender = await User.findById(lenderId);
    if (!lender) {
      return res.status(404).json({ success: false, error: 'Lender not found' });
    }

    // Create loan agreement
    const agreement = new LoanAgreement({
      postId,
      borrowerId,
      lenderId,
      loanAmount,
      interestRate,
      signatureUrl,
      status: 'approved',
    });
    await agreement.save();

    // Send chat notifications
    const roomId = [borrowerId, lenderId].sort().join('_');
    const borrowerMessage = new Chat({
      senderId: 'system',
      receiverId: borrowerId,
      message: `Your loan of ₹${loanAmount} from ${lender.name || 'Anonymous'} has been approved.`,
      roomId,
    });
    const lenderMessage = new Chat({
      senderId: 'system',
      receiverId: lenderId,
      message: `${borrowerName} has taken your loan of ₹${loanAmount}.`,
      roomId,
    });
    await Promise.all([borrowerMessage.save(), lenderMessage.save()]);

    // Emit Socket.IO notifications
    req.io.to(roomId).emit('receiveMessage', {
      senderId: 'system',
      receiverId: borrowerId,
      message: borrowerMessage.message,
      roomId,
      timestamp: new Date(),
    });
    req.io.to(roomId).emit('receiveMessage', {
      senderId: 'system',
      receiverId: lenderId,
      message: lenderMessage.message,
      roomId,
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, data: agreement });
  } catch (err) {
    console.error('Error confirming agreement:', err);
    res.status(500).json({ success: false, error: 'Failed to confirm agreement' });
  }
});

module.exports = router;
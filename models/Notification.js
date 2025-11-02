const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['loan_request', 'loan_response'],
    default: 'loan_request'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  senderProfile: {
    name: String,
    email: String,
    username: String,
    city: String,
    state: String,
    country: String,
    mobilenumber: Number,
    aadharNumber: String,
    panCardNumber: String,
    pinCode: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);


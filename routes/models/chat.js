const mongoose = require('mongoose');
const { Schema } = mongoose; 

const ChatSchema = new Schema({
    roomId: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  });
  
module.exports = mongoose.model('Chat', ChatSchema);
require('dotenv').config();
const connectTomongo = require('./database');
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Chat = require('./models/chat');
const chatRoutes = require('./routes/Chat');
const agreementsRouter = require('./routes/Agreements');

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'https://67564946d8f04f4373e76ea3--deft-semifreddo-592c5a.netlify.app',
  'https://famous-marigold-70f8e4.netlify.app'
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS origin check:', origin); 
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS (Socket.IO)"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  }
});

// Socket.IO logic
io.on('connection', (socket) => {
  // console.log('User connected:', socket.id);

 
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    // console.log(`User joined room: ${roomId}`);
  });

  socket.on('sendMessage', async ({ senderId, receiverId, message, timestamp }) => {
    const roomId = [senderId, receiverId].sort().join('-'); // match frontend format
    const newMessage = new Chat({ senderId, receiverId, message, roomId, timestamp });

    await newMessage.save();
    io.to(roomId).emit('receiveMessage', {
      senderId,
      receiverId,
      message,
      timestamp
    });
  });

  socket.on('typing', ({ room, isTyping }) => {
    socket.to(room).emit('typing', { room, isTyping });
  });

  socket.on('disconnect', () => {
    // console.log('User disconnected:', socket.id);
  });
});

// Middleware
app.use(express.json());
connectTomongo().then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection failed:', error);
  process.exit(1);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/post', require('./routes/post'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/Chat', chatRoutes);
app.use('/api/agreements', agreementsRouter);

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

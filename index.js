require('dotenv').config();
const connectTomongo = require('./database');
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;


const allowedOrigins = [
  'http://localhost:3000',
  'https://67564946d8f04f4373e76ea3--deft-semifreddo-592c5a.netlify.app' 
 
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));

// app.use(cors());

app.use(express.json());

connectTomongo().then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection failed:', error);
  process.exit(1);
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/post', require('./routes/post'));
app.use('/api/otp', require('./routes/otp'));


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();


let otpStorage = {}; 

router.post('/send-otp', async (req, res) => {
  let Success = false;
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000); 
    otpStorage[email] = otp;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Verify Your Account Using this OTP Bhai!! ${otp}`
  };

  try {
    await transporter.sendMail(mailOptions);
    Success = true;
    res.status(200).json({Succes : Success, message: 'OTP sent successfully!' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Error sending OTP' });
  }
});

router.post('/verify-otp', (req, res) => {
  let Success = false;
  const { email, otp } = req.body;
  if (otpStorage[email] == otp) {
    delete otpStorage[email]; 
    Success = true;
    res.status(200).json({Succes : Success, message: 'OTP verified successfully!' });
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
});

module.exports = router;

const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const express = require('express');
const router = express.Router();
let jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
let jwt_token = "VinaySinghPatel"
const fecthUser = require('../middleware/FetchUser');
const jwt_secret = "ThisIsAnSecret";

// Try to use multer if available, otherwise handle without it
let multer, upload;
try {
  multer = require('multer');
  upload = multer({ storage: multer.memoryStorage() });
} catch (e) {
  console.log('Multer not installed - file uploads will not work');
  upload = {
    single: () => (req, res, next) => next() // Pass-through middleware
  };
}  

router.post('/createuser',[
  body('email').isEmail().withMessage('Not a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('name').notEmpty().withMessage('Name must be at least 2 characters long'),
  body('username').notEmpty().withMessage('Username must be at least 3 characters long'),
  body('mobilenumber').isLength({ min: 10 }).withMessage('Mobile Number must be 10 character'),
  body('aadharNumber').isLength({ min: 12 }).withMessage('Please Enter a Valid Aadhar number'),
  body('panCardNumber').isLength({ min: 10 }).withMessage('Please Enter a Valid Pan Card Number'),
], async (req,res) => {
    let Succes = false;
    // Yaha per ham validationResult ki mdad se erro pata laga rahe hai req kar ke
    try { 
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).json({ Succes, errors: errors.array() });
      }

        let user = await User.findOne({Email : req.body.email});
        if(user){
            return res.status(401).json({Succes,error : "Ye Gmail Pehle Se Registered hai"});
        }


        var salt = await bcrypt.genSaltSync(10);
      var SaltPass = await bcrypt.hashSync(req.body.password, salt);


      // Yaha per ham Body me Requiest kar ke User ka data mongoose ke jariye store kar rahe hai
      user = await User.create({
        name : req.body.name,
        username : req.body.username,
        password : SaltPass,
        email : req.body.email,
        mobilenumber : req.body.mobilenumber,
        aadharNumber : req.body.aadharNumber,
        panCardNumber : req.body.panCardNumber
      })


      
        // yaha per ham User ki id nikal kar use jwt ke jariye Auhttoken Return kar rahe hai
      let UserId  = {
        user : {
            id : user.id
        }
      }
      let AuthToken = jwt.sign(UserId,jwt_token);
      const userdata = await user.id;
      Succes = true;
       res.json({Succes,AuthToken,userdata});
        
    } catch (error) {
      console.error(error.message);
        return res.status(400).json({error : "There is an error there Are"});
    }
})


router.post('/Login',[
  body('email').isEmail().withMessage('Not a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
],async (req,res)=>{


    let Succes = false;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ Succes, errors: errors.array() });
  }

  const {email,password} = req.body;

  try {
  const user = await User.findOne({email});
    if(!user){
        return res.status(401).json({Succes,error : "Ye Gmail galat hai"});
    }

  const PassCompare = await bcrypt.compare(password,user.password);
  if(!PassCompare){
    return res.status(401).json({error:"The Pass is Not Correct"});
  }

  const UserId = {
   user :  {
    id : user.id
  }}

    // Yaha per sign kr rahe kyu ham crediatial se login kar rahe hai 
  const Authtoken = await jwt.sign(UserId,jwt_token);
  const userdata = await user.id;
  Succes = true;
  res.json({Succes : "Succesfully Login",Authtoken,userdata})
} catch (error) {
  console.error(error.message);
  console.log("There is an error in Email Pass Login ");
}
 
})


router.post('/signup', upload.single('profileImage'), [
  body('email').isEmail().withMessage('Not a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('name').notEmpty().withMessage('Name is required'),
  body('mobilenumber').isLength({ min: 10 }).withMessage('Mobile Number must be 10 digits'),
  body('aadharNumber').isLength({ min: 12 }).withMessage('Please Enter a Valid Aadhar number'),
], async (req,res) => {
    let success = false;
    try { 
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).json({ success, errors: errors.array() });
      }

        let user = await User.findOne({ email : req.body.email });
        if(user){
            return res.status(401).json({success, error : "This email is already registered"});
        }

        var salt = await bcrypt.genSaltSync(10);
        var SaltPass = await bcrypt.hashSync(req.body.password, salt);

        // Get field values from request body
        const mobileNum = req.body.mobilenumber || req.body.mobileNumber;
        const aadharNum = req.body.aadharNumber || req.body.aadhaar;
        const panNum = req.body.panCardNumber || req.body.pan;

        // Create user with all fields including address fields
        user = await User.create({
          name : req.body.name,
          email : req.body.email,
          password : SaltPass,
          mobilenumber : mobileNum ? parseInt(mobileNum) : undefined,
          aadharNumber : aadharNum ? aadharNum.toString() : undefined,
          panCardNumber : panNum ? panNum.toString() : undefined,
          city : req.body.city,
          state : req.body.state,
          country : req.body.country,
          pinCode : req.body.pinCode || req.body.pincode,
          username : req.body.email.split('@')[0] // Generate username from email if not provided
        })

        let UserId  = {
          user : {
              id : user.id
          }
        }
        let AuthToken = jwt.sign(UserId,jwt_token);
        const userdata = await user.id;
        success = true;
        res.json({success, AuthToken, userdata});
        
    } catch (error) {
      console.error(error.message);
        return res.status(400).json({success, error : "There is an error occurred during signup"});
    }
})

router.get('/GetUserData/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/getuser', fecthUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.put('/updateuser/:id', fecthUser, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUserId = req.user.id;

    // Ensure user can only update their own profile
    if (userId !== requestingUserId.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized to update this profile' });
    }

    const { name, mobilenumber } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (mobilenumber) updateFields.mobilenumber = parseInt(mobilenumber);

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, user, message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});



module.exports = router;
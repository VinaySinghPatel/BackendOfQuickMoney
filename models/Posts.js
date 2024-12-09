const mongoose = require('mongoose');
const { Schema } = mongoose;


const PostSchema = new Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'user'
     },
     userId : {
     type : mongoose.Schema.Types.ObjectId,
     ref : 'user', 
     required : true
   },
    tittle: {
      type: String,
      required: true
    },
    money : {
      type:Number,
      required : true
    },
      description: {
        type: String,
        required: true
      },
      mobilenumber: {
        type:Number,
        required : true
      },
      fromDate:{
        type:Date,
        default : Date.now
     }
  });

  module.exports = mongoose.model('post', PostSchema);

const mongoose = require("mongoose")
const {Schema} = mongoose;

const UserSchema = new Schema ({
   userId : {
      type : mongoose.Schema.Types.ObjectId,
      ref : 'user'
   },
    name : {
        type : String,
        required : true
    },
    username : {
            type: String,
            required : true
    },
    email:{
        type:String,
        required : true
     },
     password:{
        type:String,
        required:true
     },
     mobilenumber:{
      type:Number,
      required:false
   },
   verified : {
         type : Boolean,
         default : false
   },
     fromDate:{
        type:Date,
        default : Date.now
     }
})

module.exports = mongoose.model('user',UserSchema);

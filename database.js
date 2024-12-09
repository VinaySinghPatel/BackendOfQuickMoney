const mongoose = require('mongoose');
const mongourl = "mongodb://localhost:27017/QuickMoney";

const connectTomongo = async () => {
    try {
      await  mongoose.connect(mongourl,{
        });
        console.log("Connected to the Mongo Server");
    } catch (error) {
        console.log("There is an error while conneting to the database server",error);
    }
}

module.exports = connectTomongo;
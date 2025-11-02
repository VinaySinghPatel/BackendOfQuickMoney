let jwt = require('jsonwebtoken');
let jwt_secret = "VinaySinghPatel";  
const FetchUser = (req, res, next) => {
  let token = req.header('Authtoken');

  if (!token) {
    return res.status(400).json({ error: "Token is missing or invalid" });
  }

  try {
    let data = jwt.verify(token, jwt_secret);
console.log(data);
    req.user = data.user; 
    next();
  } catch (error) {
    console.error("Error in verifying token:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = FetchUser;

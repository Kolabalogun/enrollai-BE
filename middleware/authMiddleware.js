const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/Organization");
require("dotenv").config();

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({ msg: "No token, authorization denied" });
      }

      console.log(jwt.decode(token));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      switch (decoded.accountType) {
        case "organization":
          req.user = await Organization.findById(decoded.userId).select(
            "-password"
          );
          break;
        case "provider":
        default:
          req.user = await User.findById(decoded.userId).select("-password");
          break;
      }

      // console.log("Found User/Organization:", req.user);

      if (!req.user) {
        return res
          .status(404)
          .json({ message: "User or organization not found" });
      }

      next();
    } catch (err) {
      console.error("Error during token validation:", err.message);
      return res.status(401).json({ message: "Token is not valid" });
    }
  } else {
    return res.status(401).json({ message: "Token not provided" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.accountType)) {
      return res.status(403).json({
        message: `User type ${req.user.accountType} is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };

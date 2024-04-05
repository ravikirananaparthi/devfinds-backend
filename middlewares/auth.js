import { User } from "../models/user.js";
import jwt  from "jsonwebtoken";


export const isAuthenticated = async (req, res, next) => {
  const { token } = req.cookies;

  if (token) {
    try {
      // Verify JWT token for traditional login
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded._id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  } else if (req.user) {
    // User is authenticated via Google authentication (Passport.js)
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};
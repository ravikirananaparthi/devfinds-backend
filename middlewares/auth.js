import { User } from "../models/user.js";
import jwt  from "jsonwebtoken";


export const isAuthenticated = async (req, res, next) => {
  // Check for token in local storage (if supported)
  const token = localStorage.getItem('userToken');

  if (!token && token1 ) {
    return res.status(401).json({
      success: false,
      message: "Not authorized"
    });
  }

  try {
    // Verify the token on the backend (optional)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Assuming verification is done elsewhere, set req.user for convenience
    req.user = await User.findById(decoded._id); // Fetch user data if needed
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};

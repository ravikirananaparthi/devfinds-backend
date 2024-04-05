import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import { sendCookie } from "../utils/features.js";
import ErrorHandler from "../middlewares/errorHandling.js";
import { Post } from "../models/post.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: true,
});

// Helper function to send confirmation email
function sendConfirmationEmail(email, userName) {
  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/devfinds-ravi8130.appspot.com/o/df%20(1).png?alt=media&token=16c00285-2bba-4424-958c-608f86ea248d";
  const htmlContent = `
    <html>
      <head>
        <style>
          /* Add your CSS styles here */
          body {
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .logo {
            display: block;
            margin: 0 auto;
            width: 150px;
          }
          .message {
            text-align: center;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${logoUrl}" alt="DevFinds Logo" class="logo">
          <div class="message">
            <h1>Welcome onboard, programmer extraordinaire, ${userName}!</h1>
            <p>Showcase your coding journey, learnings, and wins on <strong>DevFinds</strong>. Collaborate, connect, and build something amazing with a vibrant developer community. Let's code the future, together!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Welcome to DevFinds",
    html: htmlContent,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending confirmation email:", error);
    } else {
      console.log("Confirmation email sent:", info.response);
    }
  });
}

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) return next(new ErrorHandler("Invalid User or Password", 400));

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return next(new ErrorHandler("Invalid User or Password", 400));
    else {
      user.status = "online";
      await user.save();
      sendCookie(user, res, `Welcome back ${user.name}`, 200);
    }
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password,image, programmingExperience, learnedTechnologies } = req.body;
    
    let img=null;
    if (image!=null){
      img=image;
    }
    let user = await User.findOne({ email });

    if (user) return next(new ErrorHandler("User AllReady Exists", 400));
  
    const hashedPassword = await bcrypt.hash(password, 10);

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      image: img,
      programmingExperience,
      learnedTechnologies,
     
    });
    sendConfirmationEmail(email,name);
    sendCookie(user, res, "Registered successfully", 201);
  } catch (error) {
    next(error);
  }
};



export const getMyprofile = (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const logout = (req, res) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      sameSite: "none",
      secure: true,
    })
    .json({
      success: true,
      user: req.user,
    });
};

export const feed = async (req, res, next) => {
  try {
    // Fetch all posts from the database
    const posts = await Post.find().sort({ createdAt: -1 }).populate({
      path: "user",
      select: "name image", 
    });
  
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const friendRequest = async (req, res) => {
  try {
    const userId  = req.user._id;
    console.log(userId);
    const { requestTo } = req.body;
    console.log(userId);
    console.log(requestTo);
    const requestedUser = await User.findById(requestTo);
    if (!requestedUser) {
      return res
        .status(404)
        .json({ message: 'Requested user not found', success: false });
    }

    if (userId == requestedUser._id) {
      return res.status(400).json({
        message: 'Cannot send friend request to oneself',
        success: false,
      });
    }

    if (requestedUser.inRequest.includes(userId)) {
      return res
        .status(400)
        .json({ message: 'Friend request already sent', success: false });
    }

    if (requestedUser.friends.includes(userId)) {
      return res
        .status(400)
        .json({ message: 'Users are already friends', success: false });
    }

    if (requestedUser.outRequest.includes(userId)) {
      return res
        .status(400)
        .json({ message: 'Friend request already received', success: false });
    }

    requestedUser.inRequest.push(userId);
    await requestedUser.save();

    const currentUser = await User.findById(userId);
    currentUser.outRequest.push(requestTo);
    await currentUser.save();

    res
      .status(200)
      .json({ message: 'Friend request sent successfully', success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', success: false });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
  
    const userId = req.user._id;

    const currentUser = await User.findById(userId);
    console.log(currentUser);
    if (!currentUser) {
      return res
        .status(404)
        .json({ message: 'User not found', success: false });
    }

    const inRequestDetails = await User.find({
      _id: { $in: currentUser.inRequest },
    })
      .select('name image')
      .exec();
    console.log(inRequestDetails);
    res.status(200).json({ friendRequests: inRequestDetails, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', success: false });
  }
};



export const acceptRequest = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { requestBy, status } = req.body;

    const requestingUser = await User.findById(requestBy);
    if (!requestingUser) {
      return res
        .status(404)
        .json({ message: 'Requesting user not found', success: false });
    }

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Status can be "Accepted" or "Rejected"',
        success: false,
      });
    }

    if (!requestingUser.outRequest.includes(userId)) {
      return res
        .status(400)
        .json({ message: 'Friend request not found', success: false });
    }

    const currentUser = await User.findById(userId);

    const index = currentUser.inRequest.indexOf(requestBy);
    if (index !== -1) {
      currentUser.inRequest.splice(index, 1);
    }

    const indexOutRequest = requestingUser.outRequest.indexOf(userId);

    if (indexOutRequest !== -1) {
      requestingUser.outRequest.splice(indexOutRequest, 1);
    }

    if (status === 'Accepted') {
      currentUser.friends.push(requestBy);
      requestingUser.friends.push(userId);
    }

    await currentUser.save();
    await requestingUser.save();

    res.status(200).json({
      message: `Friend request ${status.toLowerCase()} successfully`,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', success: false });
  }
};
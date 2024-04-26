import express from "express";
import { Server } from "socket.io";
import userRouter from "./routes/user.js";
import postRouter from "./routes/post.js";
import messageRouter from "./routes/message.js";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import { errorMiddleWare } from "./middlewares/errorHandling.js";
import cors from "cors";
import { createServer } from "http";
import { Post } from "./models/post.js";
import { Like } from "./models/like.js";
import { isAuthenticated } from "./middlewares/auth.js";
import { User } from "./models/user.js";




import * as fs from 'fs';

import helmet from "helmet";
import morgan from "morgan";
import { Notification } from "./models/notify.js";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import jwt from "jsonwebtoken";
const serviceAccountKey = JSON.parse(fs.readFileSync('./devfinds-ravi8130-firebase-adminsdk-noa3y-c825cb47bf.json'));
export const app = express();
export const server = new createServer(app);
try {
  config({ path: "./data/config.env" });
  console.log("Environment variables loaded from config.env");
} catch (error) {
  console.error("Error loading environment variables:", error);
}
const frontendOrigin = ["http://localhost:5173",'https://devfinds-frontend.vercel.app'];


export const io = new Server(server, {
  cors: {
    origin: frontendOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

//using middleware
app.use(helmet());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: frontendOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

//using Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/message", messageRouter);

app.get("/", (req, res) => {
  res.send("working");
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});


app.post("/api/v1/users/new/google", async (req, res) => {
  try {
    const { name, email, password, image, programmingExperience, learnedTechnologies, token } = req.body;
    console.log(req.body);
    let img=null;
    if (image===null){
      image=img;
    }
    // Verify ID token using Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(token);
    console.log(decodedToken);
    // Check for existing user with the same email
    let user= await User.findOne({ email }).select('socialauth');
    console.log(user);
    if (user) {
      if (!user.socialauth) {
        return res.status(403).json({
          error: 'This email is signed up without Google (Login with Email and password)'
        });
      }
      // User already exists and signed up with Google
      return res.json({ message: 'User already exists with Google sign-in' });
    }

    
     user = new User({
      name,
      email,
      password,
      image,
      programmingExperience,
      learnedTechnologies,
      socialauth:true,
    });
    await user.save();
    const tokeen = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "2 days" });

    res.json({ success: true, message: 'Registered successfully', tokeen });
  } catch (err) {
    console.error(err); 
    if (err.code === 'auth/invalid-token') {
      return res.status(401).json({ error: 'Invalid Google sign-in token' });
    } else {
      return res.status(500).json({ error: 'An error occurred during registration' });
    }
  }
});
function generateJWT(userId) {
  
  return jwt.sign({ _id: userId }, process.env.JWT_SECRET, { expiresIn: '2 days' }); 
}
app.post('/api/v1/users/google-login', async (req, res) => {
  try {
    const { token } = req.body;

  
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log(decodedToken);

   
    const user = await User.findOne({ email: decodedToken.email }).select('socialauth');
    console.log(user);

    if (!user) {
     
      return res.status(404).json({ error: 'User not found with this email' });
    }

    if (!user.socialauth) {
      return res.status(403).json({
        error: 'This email is signed up without Google (Login with Email and password)'
      });
    }

  
    const jwtToken = generateJWT(user._id);

    res.json({ success: true, message: 'Logged in successfully', token: jwtToken });
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/invalid-token') {
      return res.status(401).json({ error: 'Invalid Google sign-in token' });
    } else {
      return res.status(500).json({ error: 'An error occurred during login' });
    }
  }
});


app.get("/api/v1/notifications", isAuthenticated, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (error) {
    // Handle errors
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});
global.onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`user connected ${socket.id}`);

  global.chatSocket = socket;

  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.message);
    }
  });

  socket.on("new-comment", (newComment) => {
    io.emit("new-comment", newComment);
  });
});
app.get("/api/v1/friends", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch the user's data from the database
    const user = await User.findById(userId).populate(
      "friends",
      "name email image"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const friends = user.friends;

    res.status(200).json({ friends });
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// Backend route to delete a notification by ID
app.delete(
  "/api/v1/notifications/:notificationId",
  isAuthenticated,
  async (req, res) => {
    try {
      const { notificationId } = req.params;
      // Delete the notification from the database
      await Notification.findByIdAndDelete(notificationId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

app.use(errorMiddleWare);

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
import firebaseConfig from "./utils/firebase.js";
import helmet from "helmet";
import morgan from "morgan";
import { Notification } from "./models/notify.js";

export const app = express();
export const server = new createServer(app);
const frontendOrigin = process.env.FRONTEND || "http://localhost:5173";
export const io = new Server(server, {
  cors: {
    origin: frontendOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
config({
  path: "./data/config.env",
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
    origin: [frontendOrigin],
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

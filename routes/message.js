import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addMessage, getMessages } from "../controllers/message.js";

const router = express.Router();



router.post("/addmsg",isAuthenticated, addMessage);


router.post("/getmsg", isAuthenticated,getMessages);

export default router;
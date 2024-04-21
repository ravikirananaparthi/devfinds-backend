import { Message } from "../models/message.js";

export const getMessages1 = async (req, res, next) => {
  try {
    const { from, to } = req.body;
    console.log(from, to);

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "Both 'from' and 'to' are required." });
    }

    const messages = await Message.find({
      users: { $all: [from, to] },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => ({
      fromSelf: msg.sender.toString() === from,
      message: msg.message.text,
    }));

    res.json(projectedMessages);
  } catch (ex) {
    console.error("Error in getMessages:", ex);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;
    console.log(from, to);

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "Both 'from' and 'to' are required." });
    }

    const messages = await Message.find({
      users: { $all: [from, to] },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      if (msg.messageType === "text") {
        return {
          fromSelf: msg.sender.toString() === from,
          message: msg.message.text,
          createdAt: msg.createdAt,
        };
      } else if (msg.messageType === "post") {
        return {
          fromSelf: msg.sender.toString() === from,
          message: msg.message.post, // Assuming 'post' is the object you want to send
          createdAt: msg.createdAt,
        };
      }
    });

    res.json(projectedMessages.filter((msg) => msg)); // Remove any undefined elements
  } catch (ex) {
    console.error("Error in getMessages:", ex);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addMessage = async (req, res, next) => {
  try {
    const { from, to, message, messageType } = req.body;
    console.log(req.body);
    // Validate request body
    if (!from || !to || !message || !messageType) {
      return res
        .status(400)
        .json({
          error: "'from', 'to', 'message', and 'messageType' are required.",
        });
    }

    let data;

    if (messageType === "text") {
      data = await Message.create({
        messageType: messageType,
        message: { text: message },
        users: [from, to],
        sender: from,
      });
    } else if (messageType === "post") {
      // If messageType is 'post', create a message with post object
      data = await Message.create({
        messageType: messageType,
        message: { post: message }, // Assuming 'message' contains the entire post object
        users: [from, to],
        sender: from,
      });
    } else {
      return res.status(400).json({ error: "Invalid 'messageType'." });
    }

    if (data) {
      return res.json({ msg: "Message added successfully." });
    } else {
      return res
        .status(500)
        .json({ error: "Failed to add message to the database" });
    }
  } catch (ex) {
    console.error("Error in addMessage:", ex);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addMessage1 = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    console.log(req.body);
    console.log(req.body);

    // Validate request body
    if (!from || !to || !message) {
      return res
        .status(400)
        .json({ error: "'from', 'to', and 'message' are required." });
    }

    const data = await Message.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    if (data) {
      return res.json({ msg: "Message added successfully." });
    } else {
      return res
        .status(500)
        .json({ error: "Failed to add message to the database" });
    }
  } catch (ex) {
    // Handle errors
    console.error("Error in addMessage:", ex);
    res.status(500).json({ error: "Internal server error" });
  }
};

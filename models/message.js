import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    messageType: {
      type: String,
    },
    message: {
      text: {
        type: String,
      },
      post: {
        type: Object,
      },
    },
    users: Array,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);

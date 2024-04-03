import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post", // Reference to the Post model
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
    required: true,
  },
});

// Define compound unique index to ensure a user can only like a post once
likeSchema.index({ post: 1, user: 1 }, { unique: true });

export const Like = mongoose.model("Like", likeSchema);

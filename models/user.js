import mongoose from "mongoose";

//creating schema
const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    socialauth: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    image: {
      type: String,
    },
    status: {
      type: String,
      default: "online",
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    inRequest: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    outRequest: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    searchHistory: [String],
    programmingExperience: {
      type: String,
      enum: ["0 years", "1 year", "2 years", "3 years", "4+ years"],
      required: true,
    },
    learnedTechnologies: {
      type: [String],
      required: true,
    },
  },
  { minimize: false }
);

export const User = mongoose.model("User", schema);

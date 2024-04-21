import express from "express";

import { isAuthenticated } from "../middlewares/auth.js";
import { Post } from "../models/post.js";
import {
  comment,
  deletePost,
  displaypost,
  like,
  reachclick,
  search,
  trending,
  unlike,
  userposts,
} from "../controllers/post.js";

const router = express.Router();
router.get('/trendingpost',isAuthenticated,trending);
router.get("/post/:postId", displaypost);
router.get("/user/:userId", isAuthenticated, userposts);

// Route for searching posts by title
//router.get("/search", isAuthenticated, search);

// Route for displaying a specific post

// Route for updating post reach count
//router.put("/post/:postId/click", isAuthenticated, reachclick);

// Route for adding comments to a post
router.post("/comment/post/:postId", isAuthenticated, comment);

// Route for liking a post
router.put("/like/post/:postId", isAuthenticated, like);
router.put("/unlike/post/:postId", isAuthenticated, unlike);
router.delete("/delete/:postId",isAuthenticated,deletePost);

export default router;

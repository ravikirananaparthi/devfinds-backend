import express from "express";

import {
  acceptRequest,
  feed,
  friendRequest,
  getFriendRequests,
  getMyprofile,
  login,
  logout,
  register,
} from "../controllers/user.js";

import { Post } from "../models/post.js";
import { User } from "../models/user.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { Notification } from "../models/notify.js";


const router = express.Router();

router.post("/posts", isAuthenticated, async (req, res) => {
  const { title, description, image, tof } = req.body;
  const user = req.user;

  try {
    const newPost = await Post.create({
      title,
      description,
      image,
      user,
      tof,
    });

    // Send success response
    res
      .status(201)
      .json({ success: true, message: "New post created successfully!" });
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/new", register);

router.post("/login", login);

router.get("/logout", logout);

router.get("/me", isAuthenticated, getMyprofile);

router.get("/viewposts", isAuthenticated, feed);

router.post("/friendrequest", isAuthenticated, friendRequest);

router.get("/receiverequest", isAuthenticated, getFriendRequests);

router.post("/acceptrequest", isAuthenticated, acceptRequest);

router.get("/friendslist", isAuthenticated, async (req, res) => {
  try {
    // Assuming the current user's ID is stored in req.user.id after authentication
    const userId = req.user.id;

    // Fetch the current user's data and populate only specific fields of the friends
    const currentUser = await User.findById(userId).populate({
      path: "friends",
      select: "name email image", // Specify the fields you want to populate
    });

    // Extract the friend list from the current user's data
    const friendsList = currentUser.friends;

    res.status(200).json({ friends: friendsList });
  } catch (error) {
    console.error("Error fetching friends list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/profilepic", isAuthenticated, async (req, res) => {
  const { imageUrl } = req.body; // Assuming the frontend sends the image URL as imageUrl

  try {
    // Find the authenticated user by their ID
    const user = await User.findById(req.user._id);
    console.log(user);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the user's image URL

    user.image = imageUrl;
    await user.save();

    res.status(200).json({ message: "Profile picture updated successfully" });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/findusers", isAuthenticated, async (req, res) => {
  try {
    const { query } = req.query; // Access query parameters using req.query

    // Ensure that the query parameter is a string
    if (typeof query !== "string") {
      return res.status(400).json({ message: "Invalid search query" });
    }

    // Get the current user
    const currentUser = await User.findById(req.user._id);
    currentUser.searchHistory.push(query);
    await currentUser.save();
    // Query the database for users whose names match the search query
    const users = await User.find({ name: { $regex: query, $options: "i" } });

    // Iterate through each user and check friend request status
    const usersWithStatus = users.map((user) => {
      let status = "";
      if (currentUser.inRequest.includes(user._id)) {
        status = "Request already sent";
      } else if (currentUser.friends.includes(user._id)) {
        status = "Friends already";
      }
      return { ...user._doc, status };
    });

    res.status(200).json(usersWithStatus);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/trendingsearches", async (req, res) => {
  try {
    // Aggregate and count the occurrences of each search term
    const trendingSearches = await User.aggregate([
      { $unwind: "$searchHistory" }, // Unwind the searchHistory array
      { $group: { _id: "$searchHistory", count: { $sum: 1 } } }, // Group by search term and count occurrences
      { $sort: { count: -1 } }, // Sort by count in descending order
      { $limit: 5 } // Limit the results to the top 5
    ]);

    // Extract search terms from the result
    const topSearches = trendingSearches.map(search => search._id);

    // Return the trending searches
    res.status(200).json(topSearches);
  } catch (error) {
    console.error("Error fetching trending searches:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.get("/searchhistory", isAuthenticated, async (req, res) => {
  try {
    // Get the current user
    console.log(req.user);
    const currentUser = await User.findById(req.user._id);
    const searchHistory = currentUser.searchHistory.slice(-5);
    // Return the search history of the current user
    res.status(200).json(searchHistory);
  } catch (error) {
    console.error("Error fetching search history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;

  // Here you would implement your logic to fetch the user by userId from your database
  // For demonstration purposes, let's assume you have a User model and you fetch the user using Mongoose
  User.findById(userId)
    .then((user) => {
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      // Return the user data
      res.status(200).json({ success: true, user });
    })
    .catch((error) => {
      console.error("Error fetching user:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    });
});

// Export the router
export default router;

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
  trend,
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
router.get("/trendingposts", isAuthenticated, trend);

router.post("/friendrequest", isAuthenticated, friendRequest);

router.get("/receiverequest", isAuthenticated, getFriendRequests);

router.post("/acceptrequest", isAuthenticated, acceptRequest);

router.get("/friendslist", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const currentUser = await User.findById(userId).populate({
      path: "friends",
      select: "name email image",
    });

    const friendsList = currentUser.friends;

    res.status(200).json({ friends: friendsList });
  } catch (error) {
    console.error("Error fetching friends list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/profilepic", isAuthenticated, async (req, res) => {
  const { imageUrl } = req.body;

  try {
    const user = await User.findById(req.user._id);
    console.log(user);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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
    const { query } = req.query;
    console.log(query);
    if (typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({ message: "Invalid search query" });
    }

    const currentUser = await User.findById(req.user._id);
    if (query.slice(-1) === "$") {
      currentUser.searchHistory.push(query.slice(0,-1));
    }
    await currentUser.save();
    if (query.slice(-1) === "$") {
    const users = await User.find({ name: { $regex: query.slice(0,-1), $options: "i" } });
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
    }
    else{
      const users = await User.find({ name: { $regex: query, $options: "i" } });
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
    }

  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get('/trendingsearches', async (req, res) => {
  try {
    // Fetch all user documents
    const allUsers = await User.find();

    // Extract search history from each user and flatten into a single array
    const allSearchHistory = allUsers.reduce((accumulator, currentUser) => {
      accumulator.push(...currentUser.searchHistory);
      return accumulator;
    }, []);

    // Count occurrences of each search term
    const searchCounts = {};
    allSearchHistory.forEach(term => {
      searchCounts[term] = (searchCounts[term] || 0) + 1;
    });

    // Sort search terms by their occurrences
    const sortedSearchTerms = Object.keys(searchCounts).sort(
      (a, b) => searchCounts[b] - searchCounts[a]
    );

    // Select the top 5 most searched keys
    const trendingSearchKeys = sortedSearchTerms.slice(0, 5);

    res.json({ trendingSearchKeys });
  } catch (error) {
    console.error('Error fetching trending search keys:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get("/trendingsearches1", async (req, res) => {
  try {
    const trendingSearches = await User.aggregate([
      { $unwind: "$searchHistory" },
      { $group: { _id: "$searchHistory", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const topSearches = trendingSearches.map((search) => search._id);

    res.status(200).json(topSearches);
  } catch (error) {
    console.error("Error fetching trending searches:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/searchhistory", isAuthenticated, async (req, res) => {
  try {
    console.log(req.user);
    const currentUser = await User.findById(req.user._id);
    const searchHistory = currentUser.searchHistory.slice(-5);
    console.log(searchHistory);
    res.status(200).json(searchHistory);
  } catch (error) {
    console.error("Error fetching search history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;

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

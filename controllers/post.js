import { io } from "../app.js";
import { Notification } from "../models/notify.js";
import { Post } from "../models/post.js";

export const userposts = async (req, res) => {
  const userId = req.params.userId;

  try {
   
    const posts = await Post.find({ user: userId })
      .populate("user")
      .populate("comments.postedBy")
      .exec();


    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching user posts" });
  }
};

export const displaypost = async (req, res) => {
  try {
    const postId = req.params.postId; 
  

    const post = await Post.findById(postId)
      .populate({
        path: "comments",
        populate: {
          path: "postedBy",
          select: "name image", // select only the 'name' field from the user document
        },
      })
      .populate("user", "name image"); 
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }
    res.status(200).json({ success: true, post }); 
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const comment = async (req, res, next) => {
  const { comment } = req.body;

  try {
    const postComment = await Post.findByIdAndUpdate(
      req.params.postId,

      {
        $push: { comments: { text: comment, postedBy: req.user._id } },
      },
      { new: true }
    );
    const post = await Post.findById(postComment._id).populate(
      "comments.postedBy",
      "name email image"
    );
    // Create a notification for the post owner
    
    const notifications = `${req.user.name} has commented on your post: "${postComment.title}" - ${comment}`;
    const notification = new Notification({
      userId: post.user._id,
      image: req.user.image, // Owner of the post
      postId: post._id,
      type: "comment",
      message: notifications,
    });
    await notification.save();

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const reachclick = async (req, res) => {
  try {
    const postId = req.params.postId;
 
    await Post.findByIdAndUpdate(postId, { $inc: { reach: 1 } });
    res.status(200).json({ message: "Post reach updated successfully" });
  } catch (error) {
    console.error("Error updating post reach:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const like = async (req, res, next) => {
  try {
   
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        $addToSet: { likes: req.user._id },
      },
      { new: true }
    )
      .populate({
        path: "comments",
        populate: { path: "postedBy", select: "name" }, // Populate the 'postedBy' field within the 'comments' array
      })
      .populate("user", "name"); 

  
    io.emit("add-like", post);
    console.log(post);
    // Send the response with the updated post
    const notifications = `${req.user.name} has Liked on your post: "${post.title}"`;
    const notification = new Notification({
      userId: post.user._id,
      image: req.user.image, // Owner of the post
      postId: post._id,
      type: "like",
      message: notifications,
    });
    await notification.save();
    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    
    next(error);
  }
};
export const unlike = async (req, res, next) => {
  try {
    // Update the post by removing the user's ID from the likes array
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        $pull: { likes: req.user._id },
      },
      { new: true }
    )
      .populate({
        path: "comments",
        populate: { path: "postedBy", select: "name" }, 
      })
      .populate("user", "name"); // Populate the 'user' field

    // Emit an event to notify clients about the unlike operation
    io.emit("remove-like", post);

    // Send the response with the updated post
    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
   
    next(error);
  }
};

export const search = async (req, res) => {
  try {
    const { title } = req.query;
    const regex = new RegExp(title, "i"); 

  
    const posts = await Post.find({ title: regex });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error searching posts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId; 

   
    const deletedPost = await Post.findByIdAndDelete(postId);

   
    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

  
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

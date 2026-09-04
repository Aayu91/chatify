import User from "../models/User.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Send Friend Request
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { targetUserId } = req.params;

    if (senderId.toString() === targetUserId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Check if already friends
    if (targetUser.friends.includes(senderId)) {
      return res.status(400).json({ message: "Already friends" });
    }

    // Check if request already pending
    const alreadyRequested = targetUser.friendRequests.some(
      (r) => r.from.toString() === senderId.toString() && r.status === "pending"
    );
    if (alreadyRequested) {
      return res.status(400).json({ message: "Request already sent" });
    }

    targetUser.friendRequests.push({ from: senderId, status: "pending" });
    await targetUser.save();

    // Real-time socket notification
    const receiverSocketId = getReceiverSocketId(targetUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friend:new-request", {
        from: req.user,
      });
    }

    res.status(200).json({ message: "Friend request sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Accept Friend Request
export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { senderId } = req.params;

    const user = await User.findById(userId);
    const sender = await User.findById(senderId);

    if (!user || !sender) return res.status(404).json({ message: "User not found" });

    // Mark request accepted and mutual friendship
    user.friendRequests = user.friendRequests.filter(
      (r) => r.from.toString() !== senderId.toString()
    );

    if (!user.friends.includes(senderId)) user.friends.push(senderId);
    if (!sender.friends.includes(userId)) sender.friends.push(userId);

    await user.save();
    await sender.save();

    res.status(200).json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Reject Friend Request
export const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { senderId } = req.params;

    await User.findByIdAndUpdate(userId, {
      $pull: { friendRequests: { from: senderId } },
    });

    res.status(200).json({ message: "Friend request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
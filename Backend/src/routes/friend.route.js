import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.post("/send/:targetUserId", protectRoute, sendFriendRequest);
router.post("/accept/:senderId", protectRoute, acceptFriendRequest);
router.post("/reject/:senderId", protectRoute, rejectFriendRequest);

export default router;
const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const Message = mongoose.model("Message");

// ✅ Get private chat history between logged-in user and another user
// GET /api/messages/private/:userId?limit=50
router.get("/private/:userId", authMiddleware, async (req, res) => {
  const otherUserId = req.params.userId;
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

  const messages = await Message.find({
    $or: [
      { sender: req.user.userId, receiver: otherUserId },
      { sender: otherUserId, receiver: req.user.userId },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  res.json(messages);
});

// ✅ Get group room history
// GET /api/messages/room/:roomId?limit=50
router.get("/room/:roomId", authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

  const messages = await Message.find({ roomId })
    .sort({ createdAt: 1 })
    .limit(limit);

  res.json(messages);
});

module.exports = router;

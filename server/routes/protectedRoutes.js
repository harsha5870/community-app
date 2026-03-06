const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Message = require("../models/Message");

const router = express.Router();

// ✅ Chat history (latest 50 messages)
router.get("/chat/history", authMiddleware, async (req, res) => {
  try {
    const msgs = await Message.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "username email role")
      .populate("receiver", "username email role");

    res.json(msgs);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch chat history", error: err.message });
  }
});

module.exports = router;

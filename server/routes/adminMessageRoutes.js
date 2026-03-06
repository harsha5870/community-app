const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();
const Message = mongoose.model("Message");

// ✅ Admin view all messages (latest first)
// GET /api/admin/messages?limit=100
router.get("/messages", authMiddleware, adminMiddleware, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);

  const messages = await Message.find().sort({ createdAt: -1 }).limit(limit);

  res.json(messages);
});

module.exports = router;

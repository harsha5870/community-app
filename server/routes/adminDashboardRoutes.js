const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();
const SecurityEvent = mongoose.model("SecurityEvent");
const Message = mongoose.model("Message");

const { getOnlineUsers } = require("../sockets/socket");

// GET /api/admin/dashboard
router.get("/dashboard", authMiddleware, adminMiddleware, async (req, res) => {
  const onlineUserIds = getOnlineUsers();

  const latestSecurityEvents = await SecurityEvent.find()
    .sort({ createdAt: -1 })
    .limit(20);

  const latestMessages = await Message.find().sort({ createdAt: -1 }).limit(20);

  res.json({
    onlineUsersCount: onlineUserIds.length,
    onlineUserIds,
    latestSecurityEvents,
    latestMessages,
  });
});

module.exports = router;

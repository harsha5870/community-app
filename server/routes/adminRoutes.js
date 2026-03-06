const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const User = require("../models/User");
const SecurityEvent = require("../models/SecurityEvent");
const Message = require("../models/Message");

const router = express.Router();

// ✅ Users list (admin)
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: err.message,
    });
  }
});

// ✅ Block user
router.put("/block/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    await SecurityEvent.create({
      user: user._id,
      eventType: "ACCOUNT_BLOCKED",
      severity: "high",
      ip: req.ip,
      details: { by: req.user.userId },
    });

    res.json({ message: "User blocked", user });
  } catch (err) {
    res.status(500).json({
      message: "Failed to block user",
      error: err.message,
    });
  }
});

// ✅ Unblock user
router.put(
  "/unblock/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: true },
        { new: true },
      ).select("-password");

      if (!user) return res.status(404).json({ message: "User not found" });

      await SecurityEvent.create({
        user: user._id,
        eventType: "ACCOUNT_UNBLOCKED",
        severity: "medium",
        ip: req.ip,
        details: { by: req.user.userId },
      });

      res.json({ message: "User unblocked", user });
    } catch (err) {
      res.status(500).json({
        message: "Failed to unblock user",
        error: err.message,
      });
    }
  },
);

// ✅ Latest security events (admin)
router.get(
  "/security-events",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const events = await SecurityEvent.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("user", "username email role");

      res.json(events);
    } catch (err) {
      res.status(500).json({
        message: "Failed to fetch security events",
        error: err.message,
      });
    }
  },
);

// ✅ Latest messages (admin)
router.get("/messages", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const msgs = await Message.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "username email role")
      .populate("receiver", "username email role"); // receiver can be null; populate is fine

    res.json(msgs);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch messages",
      error: err.message,
    });
  }
});

// ✅ Online users count (admin) - OPTIONAL
router.get(
  "/stats/online",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const io = req.app.get("io");
      const map = io?.onlineUsers;
      res.json({ count: map ? map.size : 0 });
    } catch (err) {
      res.status(500).json({
        message: "Failed to fetch online stats",
        error: err.message,
      });
    }
  },
);

module.exports = router;

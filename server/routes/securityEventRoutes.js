const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();
const SecurityEvent = mongoose.model("SecurityEvent");

// ✅ Admin: view latest security events (with filters)
// GET /api/admin/security-events?limit=100&severity=high&eventType=LOGIN_LOCKED
router.get(
  "/security-events",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);

    const filter = {};
    if (req.query.severity) filter.severity = req.query.severity; // low|medium|high
    if (req.query.eventType) filter.eventType = req.query.eventType; // string

    const events = await SecurityEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "username email role");

    res.json(events);
  },
);

// ✅ Admin: clear events (danger)
// DELETE /api/admin/security-events   -> clears ALL events
// DELETE /api/admin/security-events?severity=high -> clears only high severity
router.delete(
  "/security-events",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const filter = {};
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.eventType) filter.eventType = req.query.eventType;

    const result = await SecurityEvent.deleteMany(filter);
    res.json({
      message: "Security events deleted",
      deletedCount: result.deletedCount,
    });
  },
);

module.exports = router;

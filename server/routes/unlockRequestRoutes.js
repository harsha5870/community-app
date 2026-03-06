const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const UnlockRequest = mongoose.model("UnlockRequest");
const SecurityEvent = mongoose.model("SecurityEvent");

// POST /api/unlock-request
router.post("/", authMiddleware, async (req, res) => {
  const reason = (req.body?.reason || "").toString().trim();

  // avoid spam: only one pending request per user
  const existing = await UnlockRequest.findOne({
    user: req.user.userId,
    status: "pending",
  });
  if (existing)
    return res.status(400).json({ message: "Already have a pending request" });

  const doc = await UnlockRequest.create({
    user: req.user.userId,
    reason,
  });

  await SecurityEvent.create({
    user: req.user.userId,
    eventType: "UNLOCK_REQUEST_CREATED",
    severity: "medium",
    ip: req.ip,
    details: { unlockRequestId: doc._id },
  });

  res
    .status(201)
    .json({ message: "Unlock request sent to admin", request: doc });
});

module.exports = router;

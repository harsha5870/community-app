const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();
const UnlockRequest = mongoose.model("UnlockRequest");
const User = mongoose.model("User");
const SecurityEvent = mongoose.model("SecurityEvent");

// GET /api/admin/unlock-requests?status=pending
router.get(
  "/unlock-requests",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const status = req.query.status || "pending";
    const list = await UnlockRequest.find({ status })
      .sort({ createdAt: -1 })
      .populate(
        "user",
        "username email lockUntil failedLoginAttempts isActive",
      );

    res.json(list);
  },
);

// PUT /api/admin/unlock-requests/:id/approve
router.put(
  "/unlock-requests/:id/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const reqDoc = await UnlockRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending")
      return res.status(400).json({ message: "Request already handled" });

    // unlock user
    await User.findByIdAndUpdate(reqDoc.user, {
      $set: { failedLoginAttempts: 0, lockUntil: null },
    });

    reqDoc.status = "approved";
    reqDoc.handledBy = req.user.userId;
    reqDoc.handledAt = new Date();
    await reqDoc.save();

    await SecurityEvent.create({
      user: reqDoc.user,
      eventType: "UNLOCK_REQUEST_APPROVED",
      severity: "medium",
      ip: req.ip,
      details: { requestId: reqDoc._id, adminId: req.user.userId },
    });

    res.json({ message: "Approved + user unlocked", request: reqDoc });
  },
);

// PUT /api/admin/unlock-requests/:id/reject
router.put(
  "/unlock-requests/:id/reject",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const reqDoc = await UnlockRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending")
      return res.status(400).json({ message: "Request already handled" });

    reqDoc.status = "rejected";
    reqDoc.handledBy = req.user.userId;
    reqDoc.handledAt = new Date();
    await reqDoc.save();

    await SecurityEvent.create({
      user: reqDoc.user,
      eventType: "UNLOCK_REQUEST_REJECTED",
      severity: "low",
      ip: req.ip,
      details: { requestId: reqDoc._id, adminId: req.user.userId },
    });

    res.json({ message: "Rejected", request: reqDoc });
  },
);

module.exports = router;

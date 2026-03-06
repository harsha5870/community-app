const mongoose = require("mongoose");

const unlockRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who is requesting
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    }, // admin
    handledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UnlockRequest", unlockRequestSchema);

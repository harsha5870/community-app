const mongoose = require("mongoose");

const securityEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    ip: { type: String, default: null },
    eventType: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high"], default: "low" },
    details: { type: Object, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SecurityEvent", securityEventSchema);

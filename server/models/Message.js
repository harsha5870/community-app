const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ optional: for direct messages; keep null for public/group chat messages
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    text: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);

const mongoose = require("mongoose");

const FriendshipSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Ensure a single friendship record between two users (order doesn't matter for query, but for index we can enforce)
FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

module.exports = mongoose.model("Friendship", FriendshipSchema);

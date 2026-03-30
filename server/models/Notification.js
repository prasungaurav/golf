const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["info", "tournament_update", "match_live", "player_blocked", "leader_changed", "new_player_needed", "tournament_invite"],
      default: "info",
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", default: null },
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", default: null },
    read: { type: Boolean, default: false, index: true },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);

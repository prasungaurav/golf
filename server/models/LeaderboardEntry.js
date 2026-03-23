const mongoose = require("mongoose");

const LeaderboardEntrySchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    pos: { type: Number, default: 0 },
    score: { type: Number, default: 0 }, // store numeric; UI me -4, E convert
    thru: { type: Number, default: 0 }, // holes completed
    status: { type: String, enum: ["online", "offline"], default: "online" },

    round: { type: Number, default: 1 },
    updatedAtLive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LeaderboardEntrySchema.index({ tournamentId: 1, round: 1, score: 1 });

module.exports = mongoose.model("LeaderboardEntry", LeaderboardEntrySchema);

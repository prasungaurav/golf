const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },

    name: { type: String, required: true, trim: true },

    // UI fields
    group: { type: String, default: "" },

    teamA: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    teamB: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],

    teamAName: { type: String, default: "" },
    teamBName: { type: String, default: "" },

    hole: { type: Number, default: 0 },
    scoreA: { type: Number, default: null },
    scoreB: { type: Number, default: null },

    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },

    ground: { type: String, default: "" },

    status: {
      type: String,
      enum: ["scheduled", "live", "paused", "finished", "cancelled"],
      default: "scheduled",
      index: true,
    },
    holeScores: [
      {
        hole: { type: Number, required: true },
        scoreA: { type: Number, default: null }, // Team A score on this hole
        scoreB: { type: Number, default: null }, // Team B score on this hole
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", MatchSchema);
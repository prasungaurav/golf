const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },

    name: { type: String, required: true, trim: true },

    // UI fields
    group: { type: String, default: "" },

    playerA: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // ya Player model
    playerB: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", MatchSchema);
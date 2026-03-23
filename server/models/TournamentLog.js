const mongoose = require("mongoose");

const TournamentLogSchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
    action: { type: String, required: true },
    meta: { type: String, default: "" },
    at: { type: Date, default: Date.now }
  }
);

module.exports = mongoose.model("TournamentLog", TournamentLogSchema);

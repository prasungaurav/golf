const mongoose = require("mongoose");

const TournamentUpdateSchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },

    title: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true },

    pinned: { type: Boolean, default: false, index: true },

    visibility: { type: String, enum: ["public", "private"], default: "public", index: true },

    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TournamentUpdate", TournamentUpdateSchema);

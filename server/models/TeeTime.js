const mongoose = require("mongoose");

const TeeTimeSchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },

    date: { type: Date, required: true }, // Feb 10, 2026
    tee: { type: String, default: "1st Tee" }, // 1st Tee / 10th Tee
    time: { type: String, required: true }, // "07:20 AM" (keep string for UI)
    groupCode: { type: String, default: "" }, // "G-01"
    holeStart: { type: Number, default: 1, min: 1, max: 18 },

    // store players by id (not names)
    playerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

TeeTimeSchema.index({ tournamentId: 1, date: 1 });

module.exports = mongoose.model("TeeTime", TeeTimeSchema);

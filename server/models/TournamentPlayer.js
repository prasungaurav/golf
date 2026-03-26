const mongoose = require("mongoose");

const TournamentPlayerSchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "waitlist", "blocked"],
      default: "pending",
      index: true,
    },

    handicapAtJoin: { type: Number, default: null },
    club: { type: String, default: "" },

    // paid stuff
    paid: { type: Boolean, default: false },
    paymentRef: { type: String, default: "" },

    // extras chosen
    extrasChosen: [
      {
        extraId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],

    notes: { type: String, default: "" },

    // ✅ Team Registration
    teamName: { type: String, default: "" },
    partnerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }], // References other players in the same team
    registrationGroupId: { type: String, default: "", index: true }, // Links players registered in the same session

    // ✅ Entry pass (QR)
    entryCode: { type: String, default: "", index: true },
    entrySecret: { type: String, default: "" },
    entryIssuedAt: { type: Date, default: null },

    // ✅ Check-in (organiser scan)
    checkInAt: { type: Date, default: null },
    checkInBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

TournamentPlayerSchema.index({ tournamentId: 1, playerId: 1 }, { unique: true });

// optional: unique entryCode per tournament (sparse so empty allowed)
TournamentPlayerSchema.index({ tournamentId: 1, entryCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("TournamentPlayer", TournamentPlayerSchema);
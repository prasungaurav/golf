// models/SponsorBid.js
const mongoose = require("mongoose");

const SponsorBidSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    organiserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sponsorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    slotType: {
      type: String,
      enum: ["title", "gold", "silver"],
      required: true,
    },
    amount: { type: Number, required: true },

    brandCategory: { type: String, default: "" },
    message: { type: String, default: "" },

    contactName: { type: String, default: "" },
    contactPhone: { type: String, default: "" },

    logoUrl: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn", "won", "lost"],
      default: "pending",
    },

    decidedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// indexes
SponsorBidSchema.index({
  tournamentId: 1,
  slotType: 1,
  status: 1,
  amount: -1,
  createdAt: 1,
});
SponsorBidSchema.index({ sponsorId: 1, createdAt: -1 });

// ✅ CommonJS export
module.exports = mongoose.model("SponsorBid", SponsorBidSchema);
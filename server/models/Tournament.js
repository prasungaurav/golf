const mongoose = require("mongoose");

const ExtraSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const RegistrationSchema = new mongoose.Schema(
  {
    fee: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "₹" },
    maxPlayers: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    waitlistEnabled: { type: Boolean, default: true },
    handicapMin: { type: Number, default: 0, min: 0 },
    handicapMax: { type: Number, default: 54, min: 0 },
    teamAllowed: { type: Boolean, default: false },
    extras: { type: [ExtraSchema], default: [] },
    regClosesAt: { type: Date, required: true },
    policyText: { type: String, default: "" }, // optional
  },
  { _id: false }
);

const SponsorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tier: {
      type: String,
      enum: ["Title", "Gold", "Silver", "Partner", "Bronze", "Other"],
      default: "Other",
    },
    url: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
  },
  { _id: true }
);

const TournamentSchema = new mongoose.Schema(
  {
    organiserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    status: {
      type: String,
      enum: ["draft", "published", "live", "completed", "cancelled"],
      default: "draft",
      index: true,
    },
    visibility: { type: String, enum: ["public", "private"], default: "public", index: true },

    bannerUrl: { type: String, default: "" },

    course: { type: String, required: true, trim: true }, // your UI: course/ground
    city: { type: String, default: "", trim: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    teeOffWindow: { type: String, default: "" }, // "07:00 AM – 03:30 PM"
    format: { type: String, default: "" }, // "Stroke Play" etc
    rounds: { type: Number, default: 1, min: 1 },

    rules: { type: [String], default: [] },

    registration: { type: RegistrationSchema, required: true },

    sponsors: { type: [SponsorSchema], default: [] },

    // quick counters (optional but super useful for UI)
    stats: {
      playersCount: { type: Number, default: 0, min: 0 },
      matchesCount: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

TournamentSchema.index({ organiserId: 1, status: 1 });
TournamentSchema.index({ startDate: 1 });

module.exports = mongoose.model("Tournament", TournamentSchema);

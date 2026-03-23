const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["player", "sponsor", "organiser", "admin"], required: true },

    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    phone: { type: String, trim: true, unique: true, sparse: true },

    passwordHash: { type: String },

    // player
    playerName: String,
    handicap: { type: String, enum: ["yes", "no"], default: "no" },

    // sponsor
    companyName: String,
    industryCategory: String,
    companyWebsite: String,
    companyAddress: String,

    // organiser
    organiserName: String,
    organiserType: { type: String, enum: ["golf club", "charity", "corporate"] },
    organiserAddress: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);

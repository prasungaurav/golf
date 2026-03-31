const mongoose = require("mongoose");

const SiteContentSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true }, // e.g. "about-us", "privacy"
    title: { type: String, required: true },
    content: { type: String, default: "" }, // HTML or Markdown string
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteContent", SiteContentSchema);

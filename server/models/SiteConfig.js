const mongoose = require("mongoose");

const SlideSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  cta: String,
  image: String
}, { _id: false });

const LeaderboardSchema = new mongoose.Schema({
  name: String,
  score: String
}, { _id: false });

const LiveMatchSchema = new mongoose.Schema({
  status: String,
  hole: String,
  title: String,
  score: String,
  course: String
}, { _id: false });

const UpcomingMatchSchema = new mongoose.Schema({
  t: String,
  name: String
}, { _id: false });

const NewsSchema = new mongoose.Schema({
  img: String,
  title: String,
  meta: String
}, { _id: false });

const VideoSchema = new mongoose.Schema({
  img: String,
  title: String,
  meta: String,
  dur: String
}, { _id: false });

const SiteConfigSchema = new mongoose.Schema({
  singleton_id: { type: String, default: "GLOBAL", unique: true },
  heroSlides: [SlideSchema],
  leaderboard: [LeaderboardSchema],
  liveMatches: [LiveMatchSchema],
  upcomingMatches: [UpcomingMatchSchema],
  media: {
    newsItems: [NewsSchema],
    photos: [String],
    videos: [VideoSchema]
  }
});

module.exports = mongoose.model("SiteConfig", SiteConfigSchema);

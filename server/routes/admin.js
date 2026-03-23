const express = require("express");
const router = express.Router();
const SiteConfig = require("../models/SiteConfig");
const Match = require("../models/Match");
const Tournament = require("../models/Tournament");
const { requireRole } = require("../middleware/sessionAuth");

// @route   GET /api/admin/dashboard
// @desc    Get the global site configuration + dynamic matches
// @access  Public (So that common Dashboard.jsx can read it without logging in)
router.get("/dashboard", async (req, res) => {
  try {
    let config = await SiteConfig.findOne({ singleton_id: "GLOBAL" }).lean();
    if (!config) {
      config = new SiteConfig({ singleton_id: "GLOBAL" });
      await config.save();
      config = config.toObject();
    }

    // ✅ Fetch dynamic Live matches
    const liveMatches = await Match.find({ status: "live" })
      .populate("tournamentId", "title course")
      .limit(4)
      .lean();

    const dynamicLive = liveMatches.map(m => ({
      title: m.name || "Match",
      status: "Live",
      hole: `Hole ${m.hole || 1}`,
      score: `${m.scoreA ?? 0} - ${m.scoreB ?? 0}`,
      course: m.tournamentId?.course || "Course",
      matchId: m._id
    }));

    // ✅ Fetch dynamic Upcoming matches
    const upcomingMatches = await Match.find({ status: "scheduled" })
      .populate("tournamentId", "title course")
      .sort({ startTime: 1 })
      .limit(5)
      .lean();

    const dynamicUpcoming = upcomingMatches.map(m => ({
      t: m.startTime ? m.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBA",
      name: m.name || "Scheduled Match",
      matchId: m._id
    }));

    // Merge: prioritise real matches over static if real matches exist
    // Or just append them. Let's merge them.
    const finalData = {
      ...config,
      liveMatches: dynamicLive.length > 0 ? dynamicLive : config.liveMatches,
      upcomingMatches: dynamicUpcoming.length > 0 ? dynamicUpcoming : config.upcomingMatches
    };

    res.json({ ok: true, data: finalData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// @route   POST /api/admin/dashboard
// @desc    Update the global site configuration
// @access  Admin
router.post("/dashboard", requireRole("admin"), async (req, res) => {
  try {
    const payload = req.body;
    
    let config = await SiteConfig.findOne({ singleton_id: "GLOBAL" });
    if (!config) {
      config = new SiteConfig({ singleton_id: "GLOBAL" });
    }
    
    config.heroSlides = payload.heroSlides || [];
    config.leaderboard = payload.leaderboard || [];
    config.liveMatches = payload.liveMatches || [];
    config.upcomingMatches = payload.upcomingMatches || [];
    
    if (payload.media) {
      config.media = {
        newsItems: payload.media.newsItems || [],
        photos: payload.media.photos || [],
        videos: payload.media.videos || []
      };
    }
    
    await config.save();
    res.json({ ok: true, data: config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Mock routes for the other unused admin features
// @route   POST /api/admin/live
router.post("/live", requireRole("admin"), async (req, res) => {
  res.json({ ok: true, message: "Live matches saved" });
});

// @route   POST /api/admin/tournaments
router.post("/tournaments", requireRole("admin"), async (req, res) => {
  res.json({ ok: true, message: "Tournaments config saved" });
});

module.exports = router;

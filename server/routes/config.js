const express = require("express");
const router = express.Router();
const SiteConfig = require("../models/SiteConfig");
const Match = require("../models/Match");

// 1. GET PUBLIC CONFIG
router.get("/", async (req, res) => {
  try {
    let config = await SiteConfig.findOne({ singleton_id: "GLOBAL" }).lean();
    
    if (!config) {
      config = {
        heroSlides: [],
        leaderboard: [],
        liveMatches: [],
        upcomingMatches: [],
        media: { newsItems: [], photos: [], videos: [] },
        rulesSummary: []
      };
    }

    // Dynamic Overlays (Live telemetry)
    const dynamicLive = await Match.find({ status: "live" })
      .populate("tournamentId", "title course")
      .limit(4)
      .lean();

    const dynamicUpcoming = await Match.find({ status: "scheduled" })
      .populate("tournamentId", "title course")
      .sort({ startTime: 1 })
      .limit(5)
      .lean();

    const finalData = {
      ...config,
      liveMatches: dynamicLive.length > 0 ? dynamicLive.map(m => ({
        matchId: m._id,
        title: m.name,
        score: `${m.scoreA || 0} - ${m.scoreB || 0}`,
        course: m.tournamentId?.course || "TBD",
        status: m.status,
        hole: `Hole ${m.hole || 1}`
      })) : config.liveMatches,
      upcomingMatches: dynamicUpcoming.length > 0 ? dynamicUpcoming.map(m => ({
        t: new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        name: m.name
      })) : config.upcomingMatches
    };

    res.json({ ok: true, data: finalData });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;

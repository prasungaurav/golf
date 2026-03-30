const express = require("express");
const router = express.Router();
const SiteConfig = require("../models/SiteConfig");
const Match = require("../models/Match");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const TournamentPlayer = require("../models/TournamentPlayer");
const { handlePlayerRemoval } = require("../utils/tournament.utils");
const SponsorBid = require("../models/SponsorBid");
const { requireRole } = require("../middleware/sessionAuth");

/**
 * @route   GET /api/admin/dashboard
 * @access  Public
 */
router.get("/dashboard", async (req, res) => {
  try {
    let config = await SiteConfig.findOne({ singleton_id: "GLOBAL" }).lean();
    if (!config) {
      config = new SiteConfig({ singleton_id: "GLOBAL" });
      await config.save();
      config = config.toObject();
    }
    const liveMatches = await Match.find({ status: "live" }).populate("tournamentId", "title course").limit(4).lean();
    const dynamicLive = liveMatches.map(m => ({
      title: m.name || "Match",
      status: "Live",
      hole: `Hole ${m.hole || 1}`,
      score: `${m.scoreA ?? 0} - ${m.scoreB ?? 0}`,
      course: m.tournamentId?.course || "Course",
      matchId: m._id
    }));
    const upcomingMatches = await Match.find({ status: "scheduled" }).populate("tournamentId", "title course").sort({ startTime: 1 }).limit(5).lean();
    const dynamicUpcoming = upcomingMatches.map(m => ({
      t: m.startTime ? m.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBA",
      name: m.name || "Scheduled Match",
      matchId: m._id
    }));
    const finalData = {
      ...config,
      liveMatches: dynamicLive.length > 0 ? dynamicLive : config.liveMatches,
      upcomingMatches: dynamicUpcoming.length > 0 ? dynamicUpcoming : config.upcomingMatches
    };
    res.json({ ok: true, data: finalData });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * @route   POST /api/admin/dashboard
 */
router.post("/dashboard", requireRole("admin", "organiser"), async (req, res) => {
  try {
    const payload = req.body;
    let config = await SiteConfig.findOne({ singleton_id: "GLOBAL" });
    if (!config) config = new SiteConfig({ singleton_id: "GLOBAL" });
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
    config.rulesSummary = payload.rulesSummary || [];
    await config.save();
    res.json({ ok: true, data: config });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/admin/analytics
 */
router.get("/analytics", requireRole("admin"), async (req, res) => {
  try {
    const totalPlayers = await User.countDocuments({ role: "player" });
    const totalTournaments = await Tournament.countDocuments({});
    const totalSponsorships = await SponsorBid.countDocuments({ status: "approved" });
    const liveMatches = await Match.countDocuments({ status: "live" });
    res.json({ ok: true, data: { totalPlayers, totalTournaments, totalSponsorships, liveMatches } });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Analytics fetch failed" });
  }
});

/**
 * @route   GET /api/admin/users
 */
router.get("/users", requireRole("admin"), async (req, res) => {
  try {
    const list = await User.find({}).select("-passwordHash").sort({ createdAt: -1 }).lean();
    res.json({ ok: true, users: list });
  } catch (err) {
    res.status(500).json({ ok: false, message: "User list fetch failed" });
  }
});

/**
 * @route   PATCH /api/admin/users/:id/status
 */
router.patch("/users/:id/status", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["active", "blocked"].includes(status)) return res.status(400).json({ ok: false, message: "Invalid status" });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    if (status === "blocked" && (user.role === "admin" || user.role === "organiser")) {
      return res.status(403).json({ ok: false, message: "Safety Protection: Cannot block Admin/Organiser." });
    }
    user.status = status;
    await user.save();

    // ✅ If blocked, remove from all tournament teams
    if (status === "blocked") {
      const registrations = await TournamentPlayer.find({ playerId: id, status: { $ne: "blocked" } });
      for (const reg of registrations) {
        await handlePlayerRemoval(id, reg.tournamentId, "User Blocked by Admin");
      }
    }
    res.json({ ok: true, message: `User is now ${status}`, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Update failed" });
  }
});

/**
 * UNUSED MOCKS
 */
router.post("/live", requireRole("admin"), (req, res) => res.json({ ok: true }));
router.post("/tournaments", requireRole("admin"), (req, res) => res.json({ ok: true }));

module.exports = router;

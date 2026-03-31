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

const SiteContent = require("../models/SiteContent");

/**
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin/Organiser)
 */
router.get("/dashboard", requireRole("admin", "organiser"), async (req, res) => {
  try {
    let config = await SiteConfig.findOne({ singleton_id: "GLOBAL" }).lean();
    if (!config) {
      config = new SiteConfig({ singleton_id: "GLOBAL" });
      await config.save();
      config = config.toObject();
    }
    
    // Fetch real live matches
    const liveMatches = await Match.find({ status: "live" }).populate("tournamentId", "title course").limit(4).lean();
    const dynamicLive = liveMatches.map(m => ({
      title: m.name || "Match",
      status: "Live",
      hole: `Hole ${m.hole || 1}`,
      score: `${m.scoreA ?? 0} - ${m.scoreB ?? 0}`,
      course: m.tournamentId?.course || "Course",
      matchId: m._id
    }));

    // Fetch real upcoming matches
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
router.post("/dashboard", requireRole("admin"), async (req, res) => {
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
    const totalOrganisers = await User.countDocuments({ role: "organiser" });
    const totalSponsors = await User.countDocuments({ role: "sponsor" });
    const totalTournaments = await Tournament.countDocuments({});
    
    const pendingBids = await SponsorBid.countDocuments({ status: "pending" });
    const liveMatches = await Match.countDocuments({ status: "live" });
    
    res.json({
      ok: true,
      data: {
        totalPlayers,
        totalOrganisers,
        totalSponsors,
        totalTournaments,
        pendingBids,
        liveMatches
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Analytics fetch failed" });
  }
});

/**
 * @route   GET /api/admin/users
 */
router.get("/users", requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const list = await User.find(filter).select("-passwordHash").sort({ createdAt: -1 }).lean();
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
    
    if (status === "blocked" && (user.role === "admin")) {
      return res.status(403).json({ ok: false, message: "Safety Protection: Cannot block Admin." });
    }
    
    user.status = status;
    await user.save();

    if (status === "blocked") {
      await TournamentPlayer.updateMany({ playerId: id }, { status: "blocked" });
    }
    
    res.json({ ok: true, message: `User is now ${status}`, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Update failed" });
  }
});

/**
 * CMS ROUTES
 */

// List all pages
router.get("/pages", requireRole("admin"), async (req, res) => {
  try {
    const pages = await SiteContent.find({}).sort({ updatedAt: -1 }).lean();
    res.json({ ok: true, pages });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Pages fetch failed" });
  }
});

// Get single page by slug
router.get("/pages/:slug", async (req, res) => {
  try {
    const page = await SiteContent.findOne({ slug: req.params.slug }).lean();
    if (!page) return res.status(404).json({ ok: false, message: "Page not found" });
    res.json({ ok: true, page });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Page fetch failed" });
  }
});

// Create/Update page
router.post("/pages", requireRole("admin"), async (req, res) => {
  try {
    const { slug, title, content } = req.body;
    let page = await SiteContent.findOne({ slug });
    if (!page) {
      page = new SiteContent({ slug, title, content });
    } else {
      page.title = title || page.title;
      page.content = content || page.content;
    }
    page.lastModifiedBy = req.session.userId;
    await page.save();
    res.json({ ok: true, page });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Page save failed" });
  }
});

// Sponsor Bids Overview
router.get("/sponsors/bids", requireRole("admin"), async (req, res) => {
  try {
    const bids = await SponsorBid.find({})
      .populate("sponsorId", "companyName email")
      .populate("tournamentId", "title")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ ok: true, bids });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Bids fetch failed" });
  }
});

// Update Sponsor Bid Status
router.patch("/bids/:bidId", requireRole("admin"), async (req, res) => {
  try {
    const { bidId } = req.params;
    const { status } = req.body;
    const bid = await SponsorBid.findByIdAndUpdate(bidId, { status }, { new: true });
    if (!bid) return res.status(404).json({ ok: false, message: "Bid not found" });
    res.json({ ok: true, bid });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Bid update failed" });
  }
});

// Live Matches CRUD
router.get("/live", requireRole("admin"), async (req, res) => {
  try {
    const matches = await Match.find({}).sort({ startedAt: -1 }).lean();
    res.json({ ok: true, matches });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Live matches fetch failed" });
  }
});

router.post("/live", requireRole("admin"), async (req, res) => {
  try {
    const { matches } = req.body;
    // This is a bulk save/update approach for simplicity in admin terminal
    for (let m of matches) {
      if (m._id) {
        await Match.findByIdAndUpdate(m._id, m);
      } else {
        const newMatch = new Match(m);
        await newMatch.save();
      }
    }
    res.json({ ok: true, message: "Telemetry synchronized" });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Sync failed" });
  }
});

// Tournament Advanced Logistics
router.patch("/tournaments/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const t = await Tournament.findByIdAndUpdate(id, update, { new: true });
    if (!t) return res.status(404).json({ ok: false, message: "Tournament not found" });
    res.json({ ok: true, tournament: t });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Logistics update failed" });
  }
});

// Tournament List (Admin version - all events)
router.get("/tournaments", requireRole("admin"), async (req, res) => {
  try {
    const list = await Tournament.find({}).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, tournaments: list });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Tournament list fetch failed" });
  }
});

module.exports = router;

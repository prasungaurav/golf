const express = require("express");
const Tournament = require("../models/Tournament");
const SponsorBid = require("../models/SponsorBid");

const { requireSession, requireRole } = require("../middleware/sessionAuth"); 
// 👆 path apne project ke according set karo (maybe ../middleware/auth)

const router = express.Router();

/** helpers */
function bidPhase(t, now = new Date()) {
  // support multiple possible field names and nested registration schema
  const closeAtVal = (t.registration && t.registration.regClosesAt) || t.registrationCloseAt || t.registration?.closeAt;
  const closeAt = closeAtVal ? new Date(closeAtVal) : new Date(NaN);
  if (Number.isNaN(closeAt.getTime())) return "unknown";
  if (now < closeAt) return "open";

  const selectionEnd = new Date(closeAt.getTime() + 2 * 60 * 60 * 1000);
  if (now <= selectionEnd) return "processing";
  return "published";
}

// ✅ Use the same auth system (session-based)
router.use(requireSession, requireRole("sponsor"));

/**
 * GET tournaments
 * /api/sponsor/tournaments?view=available&q=&location=all
 */
router.get("/tournaments", async (req, res) => {
  try {
    const view = req.query.view || "available";
    const q = req.query.q || "";
    const location = req.query.location || "all";

    const filter = {
      visibility: "public",
    };

    if (location !== "all") filter.location = location;
    if (q.trim()) filter.title = { $regex: q.trim(), $options: "i" };

    // include registration close time (nested) and basic metadata
    let tournaments = await Tournament.find(filter)
      .select(
        "title course startDate endDate registration.regClosesAt bannerUrl description sponsors visibility organiserId"
      )
      .lean();

    const now = new Date();

    tournaments = tournaments
      .map((t) => ({ ...t, phase: bidPhase(t, now) }))
      .filter((t) => (view === "available" ? t.phase === "open" : true))
      .sort((a, b) => new Date(a.registration?.regClosesAt || a.registrationCloseAt || 0) - new Date(b.registration?.regClosesAt || b.registrationCloseAt || 0));

    res.json({ tournaments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * GET my bids
 * /api/sponsor/bids?tournamentId=...
 */
router.get("/bids", async (req, res) => {
  try {
    const tournamentId = req.query.tournamentId;

    // ✅ your auth stores user in req.session.user
    const sponsorId = req.session.user._id;

    const filter = { sponsorId };
    if (tournamentId) filter.tournamentId = tournamentId;

    const bids = await SponsorBid.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ bids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * POST place a bid
 * /api/sponsor/bids
 */
router.post("/bids", async (req, res) => {
  try {
    const { tournamentId, slotType, amount, brandCategory, message, contactName, contactPhone, logoUrl } = req.body;

    const t = await Tournament.findById(tournamentId).lean();
    if (!t) return res.status(404).json({ message: "Tournament not found" });

    // only require tournament to be public (some projects used sponsorBiddingEnabled; make tolerant)
    if (t.visibility !== "public") {
      return res.status(400).json({ message: "Bidding not enabled" });
    }

    const phase = bidPhase(t, new Date());
    if (phase !== "open") return res.status(400).json({ message: "Bidding closed" });

    // support tournaments that either define `slots` or do not
    let slot = null;
    let minBid = 0;
    if (t.slots) {
      slot = t.slots?.[slotType];
      if (!slot) return res.status(400).json({ message: "Invalid slotType" });
      if (slot.filled) return res.status(400).json({ message: "Slot already filled" });
      minBid = Number(slot.minBid || 0);
    }

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });
    if (amt < minBid) return res.status(400).json({ message: `Minimum bid is ₹${minBid}` });

    const sponsorId =
  req.session?.user?._id ||
  req.session?.user?.id ||
  req.session?.user?.userId;

if (!sponsorId) {
  return res.status(401).json({
    message: "Session user id missing. Please login again.",
  });
}

    const bid = await SponsorBid.create({
      tournamentId: t._id,
      organiserId: t.organiserId,
      sponsorId: toObjId(sponsorId),
      slotType,
      amount: amt,
      brandCategory: brandCategory || "",
      message: message || "",
      contactName: contactName || "",
      contactPhone: contactPhone || "",
      logoUrl: logoUrl || "",
      status: "pending",
    });

    res.status(201).json({ bid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/my-bid-tournaments", async (req, res) => {
  try {
    const sponsorId =
      req.session?.user?._id ||
      req.session?.user?.id ||
      req.session?.user?.userId;

    if (!sponsorId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    // 1) sponsor ke saare bids nikalo, tournament populate
    const bids = await SponsorBid.find({ sponsorId })
      .populate({
        path: "tournamentId",
        select: "title course city registration.regClosesAt startDate endDate visibility",
      })
      .sort({ createdAt: -1 })
      .lean();

    // 2) unique tournaments nikalo
    const map = new Map();
    for (const b of bids) {
      const t = b.tournamentId;
      if (t?._id && !map.has(String(t._id))) map.set(String(t._id), t);
    }

    const tournaments = Array.from(map.values());
    return res.json({ tournaments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error" });
  }
});
module.exports = router;
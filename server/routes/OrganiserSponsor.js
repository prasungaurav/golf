// routes/organiserSponsorBids.js
const express = require("express");
const SponsorBid = require("../models/SponsorBid");
const Tournament = require("../models/Tournament");
const { requireSession, requireRole } = require("../middleware/sessionAuth");

const router = express.Router();

// organiser/admin only
router.use(requireSession, requireRole("organiser", "admin"));

function getSessionUserId(req) {
  // ✅ your session stores: { id: user._id.toString(), role, ... }
  return req.session?.user?.id || null;
}

/**
 * GET bids for a tournament
 * /api/organiser/sponsor-bids?tournamentId=...
 */
router.get("/sponsor-bids", async (req, res) => {
  try {
    const tournamentId = req.query.tournamentId;
    if (!tournamentId) return res.status(400).json({ message: "tournamentId required" });

    const role = req.session?.user?.role;
    const userId = getSessionUserId(req);

    if (!userId) return res.status(401).json({ message: "Not logged in" });

    // organiser ownership check
    const t = await Tournament.findById(tournamentId).select("organiserId").lean();
    if (!t) return res.status(404).json({ message: "Tournament not found" });

    // ✅ IMPORTANT: compare tournament.organiserId with session.user.id (NOT _id)
    if (role !== "admin" && String(t.organiserId) !== String(userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const bids = await SponsorBid.find({ tournamentId })
      .populate({
        path: "sponsorId",
        select: "companyName email phone industryCategory companyWebsite companyAddress",
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ bids });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error" });
  }
});

/**
 * PATCH approve/reject a bid
 * /api/organiser/sponsor-bids/:bidId
 * body: { action: "approve" | "reject", rejectionReason?: string }
 */
router.patch("/sponsor-bids/:bidId", async (req, res) => {
  try {
    const { bidId } = req.params;
    const { action } = req.body || {};

    const role = req.session?.user?.role;
    const userId = getSessionUserId(req);

    if (!userId) return res.status(401).json({ message: "Not logged in" });
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const bid = await SponsorBid.findById(bidId).lean();
    if (!bid) return res.status(404).json({ message: "Bid not found" });

    // organiser ownership check
    const t = await Tournament.findById(bid.tournamentId).select("organiserId").lean();
    if (!t) return res.status(404).json({ message: "Tournament not found" });

    // ✅ compare with session.user.id
    if (role !== "admin" && String(t.organiserId) !== String(userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (action === "approve") {
      // 1) accept this bid
      await SponsorBid.updateOne(
        { _id: bidId },
        { $set: { status: "accepted", decidedAt: new Date(), rejectionReason: "" } }
      );

      // 2) mark others in this slot as 'lost'
      await SponsorBid.updateMany(
        {
          tournamentId: bid.tournamentId,
          slotType: bid.slotType,
          _id: { $ne: bidId },
          status: { $in: ["pending", "accepted"] }, 
        },
        { $set: { status: "lost", decidedAt: new Date() } }
      );

      await syncTournamentSponsors(bid.tournamentId);

      return res.json({ ok: true });
    }

    // action === "reject"
    await SponsorBid.updateOne(
      { _id: bidId },
      {
        $set: {
          status: "rejected",
          decidedAt: new Date(),
          rejectionReason: String(req.body?.rejectionReason || ""),
        },
      }
    );

    // if there is already an accepted one in this slot -> do nothing
    const accepted = await SponsorBid.findOne({
      tournamentId: bid.tournamentId,
      slotType: bid.slotType,
      status: "accepted",
    }).lean();

    if (accepted) return res.json({ ok: true, autoApprovedId: null });

    // auto pick next best pending: highest amount, tie -> earliest
    const next = await SponsorBid.findOne({
      tournamentId: bid.tournamentId,
      slotType: bid.slotType,
      status: "pending",
    })
      .sort({ amount: -1, createdAt: 1 })
      .lean();

    if (next) {
      await SponsorBid.updateOne(
        { _id: next._id },
        { $set: { status: "accepted", decidedAt: new Date(), rejectionReason: "" } }
      );
      await syncTournamentSponsors(bid.tournamentId);
    }

    return res.json({ ok: true, autoApprovedId: next?._id || null });

    return res.json({ ok: true, autoApprovedId: next?._id || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error" });
  }
});

async function syncTournamentSponsors(tid) {
  // Find all accepted bids for this tournament
  const acceptedBids = await SponsorBid.find({ tournamentId: tid, status: "accepted" })
    .populate("sponsorId", "companyName companyWebsite logoUrl")
    .lean();

  const sponsors = acceptedBids.map(b => ({
    name: b.brandCategory || b.sponsorId?.companyName || "Sponsor",
    tier: b.slotType === "title" ? "Title" : b.slotType === "gold" ? "Gold" : "Silver",
    url: b.sponsorId?.companyWebsite || "",
    logoUrl: b.logoUrl || b.sponsorId?.logoUrl || ""
  }));

  await Tournament.findByIdAndUpdate(tid, { $set: { sponsors } });
}

module.exports = router;
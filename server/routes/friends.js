const express = require("express");
const mongoose = require("mongoose");
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const { requireSession } = require("../middleware/sessionAuth");

const router = express.Router();

// Helper to check if user is a player
const requirePlayer = (req, res, next) => {
  const u = req.session?.user;
  if (!u || u.role !== "player") {
    return res.status(403).json({ ok: false, message: "Only players can use social features" });
  }
  next();
};

// ------------------------------
// GET: Search for other players to add
// GET /api/friends/search?q=...
// ------------------------------
router.get("/search", requireSession, requirePlayer, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ ok: true, players: [] });

    const myId = req.session.user.id;

    // Find players matching name or email, excluding self
    const players = await User.find({
      role: "player",
      _id: { $ne: myId },
      $or: [
        { playerName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
      status: "active"
    })
    .select("playerName email _id status")
    .limit(10)
    .lean();

    // Check existing friendship status for each found player
    const results = await Promise.all(players.map(async (p) => {
      const friendship = await Friendship.findOne({
        $or: [
          { requesterId: myId, recipientId: p._id },
          { requesterId: p._id, recipientId: myId }
        ]
      });

      return {
        ...p,
        friendshipStatus: friendship ? friendship.status : "none",
        isRequester: friendship ? String(friendship.requesterId) === String(myId) : false
      };
    }));

    res.json({ ok: true, players: results });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------
// POST: Invite a friend
// POST /api/friends/invite
// body: { recipientId }
// ------------------------------
router.post("/invite", requireSession, requirePlayer, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const myId = req.session.user.id;

    if (!recipientId || String(recipientId) === String(myId)) {
      return res.status(400).json({ ok: false, message: "Invalid recipient" });
    }

    // Ensure recipient is a player
    const recipient = await User.findOne({ _id: recipientId, role: "player" });
    if (!recipient) return res.status(404).json({ ok: false, message: "Player not found" });

    // Check if already exists
    const existing = await Friendship.findOne({
      $or: [
        { requesterId: myId, recipientId },
        { requesterId: recipientId, recipientId: myId }
      ]
    });

    if (existing) {
      return res.status(400).json({ ok: false, message: "Friendship already exists or pending" });
    }

    const f = new Friendship({ requesterId: myId, recipientId });
    await f.save();

    res.json({ ok: true, message: "Invite sent" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------
// POST: Accept/Reject/Cancel
// POST /api/friends/respond
// body: { friendshipId, action: 'accept' | 'reject' | 'cancel' }
// ------------------------------
router.post("/respond", requireSession, requirePlayer, async (req, res) => {
  try {
    const { friendshipId, action } = req.body;
    const myId = req.session.user.id;

    const f = await Friendship.findById(friendshipId);
    if (!f) return res.status(404).json({ ok: false, message: "Invite not found" });

    if (action === "accept") {
      if (String(f.recipientId) !== String(myId)) return res.status(403).json({ ok: false, message: "Only recipient can accept" });
      f.status = "accepted";
      await f.save();
    } else if (action === "reject") {
      if (String(f.recipientId) !== String(myId)) return res.status(403).json({ ok: false, message: "Only recipient can reject" });
      f.status = "rejected";
      await f.save();
    } else if (action === "cancel") {
      if (String(f.requesterId) !== String(myId)) return res.status(403).json({ ok: false, message: "Only requester can cancel" });
      await Friendship.findByIdAndDelete(friendshipId);
    } else {
      return res.status(400).json({ ok: false, message: "Invalid action" });
    }

    res.json({ ok: true, message: `Friendship ${action}ed` });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------
// GET: List friends
// GET /api/friends/list
// ------------------------------
router.get("/list", requireSession, requirePlayer, async (req, res) => {
  try {
    const myId = req.session.user.id;

    // Find all accepted friendships where user is either requester or recipient
    const list = await Friendship.find({
      $or: [{ requesterId: myId }, { recipientId: myId }],
      status: "accepted"
    })
    .populate("requesterId", "playerName email _id status")
    .populate("recipientId", "playerName email _id status")
    .lean();

    const friends = list.map(f => {
      const isRequester = String(f.requesterId._id) === String(myId);
      return isRequester ? f.recipientId : f.requesterId;
    });

    res.json({ ok: true, friends });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------
// GET: Pending requests
// GET /api/friends/requests
// ------------------------------
router.get("/requests", requireSession, requirePlayer, async (req, res) => {
  try {
    const myId = req.session.user.id;

    const incoming = await Friendship.find({ recipientId: myId, status: "pending" })
      .populate("requesterId", "playerName email _id")
      .lean();

    const outgoing = await Friendship.find({ requesterId: myId, status: "pending" })
      .populate("recipientId", "playerName email _id")
      .lean();

    res.json({ ok: true, incoming, outgoing });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;

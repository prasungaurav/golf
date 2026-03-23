const express = require("express");
const mongoose = require("mongoose");
const Match = require("../models/Match");
const Tournament = require("../models/Tournament");
const { requireSession } = require("../middleware/sessionAuth");

const router = express.Router();

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}
function toObjId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

// organiser only helper
function requireOrganiser(req, res, next) {
  const u = req.session?.user;
  if (!u?.id) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const role = String(u.role || "").toLowerCase();
  if (role !== "organiser") return res.status(403).json({ ok: false, message: "Only organiser allowed" });
  next();
}

// ------------------------------
// GET matches by tournament (public or session-based your choice)
// GET /api/matches/tournament/:tid
// ------------------------------
router.get("/tournament/:tid", async (req, res) => {
  try {
    const { tid } = req.params;
    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });

    const list = await Match.find({ tournamentId: toObjId(tid) })
      .populate("playerA", "playerName")
      .populate("playerB", "playerName")
      .sort({ startTime: 1 })
      .lean();

    // UI-friendly shape
    const matches = list.map((m) => ({
      _id: m._id,
      name: m.name,
      status: (m.status || "").toLowerCase(), // "live" etc.
      hole: m.hole ?? 0,
      scoreA: m.scoreA ?? null,
      scoreB: m.scoreB ?? null,
      group: m.group || "",
      playerA: { name: m.playerA?.playerName || "Player A" },
      playerB: { name: m.playerB?.playerName || "Player B" },
    }));

    return res.json({ ok: true, matches });
  } catch (err) {
    console.error("GET MATCHES ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------
// PATCH quick update (organiser)
// PATCH /api/matches/:id
// body: { scoreA, scoreB, hole, status }
// ------------------------------
router.patch("/:id", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid match id" });

    const body = req.body || {};
    const update = {};

    if (body.scoreA !== undefined) update.scoreA = body.scoreA === null || body.scoreA === "" ? null : Number(body.scoreA);
    if (body.scoreB !== undefined) update.scoreB = body.scoreB === null || body.scoreB === "" ? null : Number(body.scoreB);
    if (body.hole !== undefined) update.hole = body.hole === null || body.hole === "" ? 0 : Number(body.hole);

    if (body.status !== undefined) {
      const st = String(body.status || "").toLowerCase();
      const allowed = ["scheduled", "live", "paused", "finished", "cancelled"];
      if (!allowed.includes(st)) return res.status(400).json({ ok: false, message: "Invalid status" });
      update.status = st;
    }

    const match = await Match.findByIdAndUpdate(toObjId(id), { $set: update }, { new: true })
      .populate("playerA", "playerName")
      .populate("playerB", "playerName")
      .lean();

    if (!match) return res.status(404).json({ ok: false, message: "Match not found" });

    return res.json({
      ok: true,
      match: {
        _id: match._id,
        name: match.name,
        status: match.status,
        hole: match.hole ?? 0,
        scoreA: match.scoreA ?? null,
        scoreB: match.scoreB ?? null,
        group: match.group || "",
        playerA: { name: match.playerA?.playerName || "Player A" },
        playerB: { name: match.playerB?.playerName || "Player B" },
      },
    });
  } catch (err) {
    console.error("PATCH MATCH ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------
// ✅ POST: Create matches from schedule (Auto-Scheduling)
// POST /api/matches/tournament/me/:tid/schedule
// ------------------------------------------------------------
router.post("/tournament/me/:tid/schedule", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { tid } = req.params;
    const { date, slots, replaceExisting } = req.body;

    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });
    if (!slots || !Array.isArray(slots)) return res.status(400).json({ ok: false, message: "No slots provided" });

    // 1. Agar replaceExisting true hai, toh purane matches delete karein
    if (replaceExisting) {
      await Match.deleteMany({ tournamentId: toObjId(tid) });
    }

    const matchesToCreate = [];

    // 2. Slots se Matches banana (Pairing Logic)
    slots.forEach((slot) => {
      const { time, tee, group } = slot;
      if (!group || group.length === 0) return;

      // Har 2 players ke liye ek match banega
      for (let i = 0; i < group.length; i += 2) {
        const pA = group[i];
        const pB = group[i + 1] || null; // Agar akela player hai toh pB null

        matchesToCreate.push({
          tournamentId: toObjId(tid),
          name: `Match ${time} - ${tee}`,
          group: tee, // Tee 1 ya Tee 10
          playerA: pA ? toObjId(pA) : null,
          playerB: pB ? toObjId(pB) : null,
          startTime: new Date(`${date}T${time}:00`),
          status: "scheduled",
          hole: 1,
          ground: tee
        });
      }
    });

    if (matchesToCreate.length > 0) {
      await Match.insertMany(matchesToCreate);
    }

    return res.json({
      ok: true,
      created: matchesToCreate.length,
      totalMatches: await Match.countDocuments({ tournamentId: tid })
    });

  } catch (err) {
    console.error("PUBLISH ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});
// ✅ GET ALL MATCHES
// /api/matches/all
router.get("/all", async (req, res) => {
  try {
    const list = await Match.find({})
      .populate("playerA", "playerName")
      .populate("playerB", "playerName")
      .sort({ startTime: 1 })
      .lean();

    const matches = list.map((m) => ({
      _id: m._id,
      name: m.name,
      status: (m.status || "").toLowerCase(),
      hole: m.hole ?? 0,
      scoreA: m.scoreA ?? null,
      scoreB: m.scoreB ?? null,
      group: m.group || "",
      playerA: { name: m.playerA?.playerName || "Player A" },
      playerB: { name: m.playerB?.playerName || "Player B" },
    }));

    return res.json({ ok: true, matches });
  } catch (err) {
    console.error("GET ALL MATCHES ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});
module.exports = router;
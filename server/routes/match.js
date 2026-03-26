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
      .populate("teamA", "playerName")
      .populate("teamB", "playerName")
      .sort({ startTime: 1 })
      .lean();

    // UI-friendly shape
    const matches = list.map((m) => ({
      _id: m._id,
      name: m.name,
      status: (m.status || "").toLowerCase(),
      hole: m.hole ?? 0,
      scoreA: m.scoreA ?? null,
      scoreB: m.scoreB ?? null,
      group: m.group || "",
      teamA: (m.teamA || []).map(p => ({ _id: p?._id, name: p?.playerName || "—" })),
      teamB: (m.teamB || []).map(p => ({ _id: p?._id, name: p?.playerName || "—" })),
      teamAName: m.teamAName || "",
      teamBName: m.teamBName || "",
      startTime: m.startTime,
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

    if (body.holeScores !== undefined && Array.isArray(body.holeScores)) {
      update.holeScores = body.holeScores;
    }

    const match = await Match.findByIdAndUpdate(toObjId(id), { $set: update }, { new: true })
      .populate("teamA", "playerName")
      .populate("teamB", "playerName")
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
        teamA: (match.teamA || []).map(p => ({ _id: p?._id, name: p?.playerName || "—" })),
        teamB: (match.teamB || []).map(p => ({ _id: p?._id, name: p?.playerName || "—" })),
        teamAName: match.teamAName || "",
        teamBName: match.teamBName || "",
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

    // ✅ VALIDATE TOURNAMENT & OWNER
    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(tid), organiserId });
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found or you don't own it" });

    const matchDate = new Date(date);
    const tStart = new Date(tournament.startDate);
    const tEnd = new Date(tournament.endDate);

    if (matchDate < tStart || matchDate > tEnd) {
      return res.status(400).json({ 
        ok: false, 
        message: `Date ${date} is outside tournament range (${tStart.toLocaleDateString()} to ${tEnd.toLocaleDateString()})` 
      });
    }

    if (replaceExisting) {
      await Match.deleteMany({ tournamentId: toObjId(tid) });
    }

    const matchesToCreate = [];
    const playerTimeMap = new Set(); 

    const TournamentPlayer = require("../models/TournamentPlayer");
    const approvedRegs = await TournamentPlayer.find({ 
      tournamentId: toObjId(tid), 
      status: "approved" 
    }).select("playerId").lean();
    const approvedPlayerIds = new Set(approvedRegs.map(r => String(r.playerId)));

    for (const slot of slots) {
      const { time, tee, teams } = slot;
      if (!teams || teams.length === 0) continue;

      const startTimeRaw = `${date}T${time}:00`;
      const startTime = new Date(startTimeRaw);
      if (isNaN(startTime)) return res.status(400).json({ ok: false, message: `Invalid time: ${time}` });

      for (let i = 0; i < teams.length; i += 2) {
        const teamA = teams[i];
        const teamB = teams[i + 1] || null;

        const allPlayerIdsInMatch = [...teamA.playerIds, ...(teamB ? teamB.playerIds : [])];

        for (const pId of allPlayerIdsInMatch) {
          if (!approvedPlayerIds.has(String(pId))) {
            return res.status(400).json({ ok: false, message: `Player ${pId} is not approved or part of a valid team.` });
          }

          const key = `${pId}_${startTimeRaw}`;
          if (playerTimeMap.has(key)) {
            return res.status(400).json({ ok: false, message: `Conflict: Player ${pId} is scheduled multiple times at ${time}.` });
          }
          playerTimeMap.add(key);
        }

        matchesToCreate.push({
          tournamentId: toObjId(tid),
          name: `Match ${time} - ${tee}`,
          group: tee, 
          teamA: teamA.playerIds.map(id => toObjId(id)),
          teamB: teamB ? teamB.playerIds.map(id => toObjId(id)) : [],
          teamAName: teamA.name || "Team A",
          teamBName: teamB ? (teamB.name || "Team B") : "",
          startTime,
          status: "scheduled",
          hole: 1,
          ground: tee
        });
      }
    }

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
router.get("/all", async (req, res) => {
  try {
    const list = await Match.find({})
      .populate("teamA", "playerName")
      .populate("teamB", "playerName")
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
      teamA: (m.teamA || []).map(p => ({ _id: p?._id, name: p?.playerName || "—" })),
      teamB: (m.teamB || []).map(p => ({ _id: p?._id, name: p?.playerName || "—" })),
      teamAName: m.teamAName || "",
      teamBName: m.teamBName || "",
    }));

    return res.json({ ok: true, matches });
  } catch (err) {
    console.error("GET ALL MATCHES ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});
module.exports = router;
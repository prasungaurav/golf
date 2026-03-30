const express = require("express");
const mongoose = require("mongoose");
const Match = require("../models/Match");
const User = require("../models/User");
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
// GET matches by tournament
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
      holeScores: m.holeScores || []
    }));

    return res.json({ ok: true, matches });
  } catch (err) {
    console.error("GET MATCHES ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------
// PATCH match update
// ------------------------------
router.patch("/:id", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid match id" });

    const body = req.body || {};
    const update = {};

    if (body.scoreA !== undefined) update.scoreA = body.scoreA === null ? null : Number(body.scoreA);
    if (body.scoreB !== undefined) update.scoreB = body.scoreB === null ? null : Number(body.scoreB);
    if (body.hole !== undefined) update.hole = body.hole === null ? 0 : Number(body.hole);
    if (body.status !== undefined) {
      const allowed = ["scheduled", "live", "paused", "finished", "cancelled"];
      const st = String(body.status).toLowerCase();
      if (allowed.includes(st)) update.status = st;
    }
    if (body.holeScores !== undefined) update.holeScores = body.holeScores;

    const match = await Match.findByIdAndUpdate(toObjId(id), { $set: update }, { new: true })
      .populate("teamA", "playerName wins losses draws")
      .populate("teamB", "playerName wins losses draws")
      .lean();

    // ✅ AUTOMATIC RANKING UPDATE
    if (update.status === "finished") {
      const sA = match.scoreA;
      const sB = match.scoreB;

      if (sA !== null && sB !== null) {
        let winners = [];
        let losers = [];
        let isDraw = false;

        if (sA < sB) {
          winners = match.teamA.map((p) => p._id);
          losers = match.teamB.map((p) => p._id);
        } else if (sB < sA) {
          winners = match.teamB.map((p) => p._id);
          losers = match.teamA.map((p) => p._id);
        } else {
          isDraw = true;
        }

        if (isDraw) {
          const allPlayers = [...match.teamA.map((p) => p._id), ...match.teamB.map((p) => p._id)];
          await User.updateMany({ _id: { $in: allPlayers } }, { $inc: { draws: 1 } });
        } else {
          await User.updateMany({ _id: { $in: winners } }, { $inc: { wins: 1 } });
          await User.updateMany({ _id: { $in: losers } }, { $inc: { losses: 1 } });
        }

        // 🏆 AUTO-GENERATE NEWS ITEM
        try {
          const News = require("../models/News");
          const winnerNames = match.scoreA < match.scoreB 
            ? match.teamA.map(p => p.playerName || p.name).join(" & ")
            : match.teamB.map(p => p.playerName || p.name).join(" & ");
            
          const newsTitle = isDraw 
            ? `Match Draw: ${match.teamAName} vs ${match.teamBName}`
            : `Match Result: ${winnerNames} Wins!`;
            
          const newsContent = isDraw
            ? `The match between ${match.teamAName} and ${match.teamBName} ended in a draw after ${match.hole} holes.`
            : `${winnerNames} emerged victorious in the match against their opponents with a final score of ${match.scoreA} to ${match.scoreB}.`;

          const newsItem = new News({
            title: newsTitle,
            content: newsContent,
            excerpt: newsContent.substring(0, 150) + "...",
            category: "Update",
            status: "published", // Automatic for now as requested
            authorId: req.session.user.id, // The organizer who finished the match
            isAutoGenerated: true,
            matchId: match._id,
            tournamentId: match.tournamentId
          });
          await newsItem.save();
          console.log("✅ Auto-news generated for match", match._id);
        } catch (newsErr) {
          console.error("Failed to auto-generate news:", newsErr);
        }
      }
    }

    return res.json({ ok: true, match });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------
// ✅ POST: Create matches from schedule
// ------------------------------
router.post("/tournament/me/:tid/schedule", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { tid } = req.params;
    const { date, slots, replaceExisting } = req.body;
    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(tid), organiserId });
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    if (replaceExisting) {
      await Match.deleteMany({ tournamentId: toObjId(tid) });
    }

    const matchesToCreate = [];
    for (const slot of slots) {
      const { time, tee, teams } = slot;
      const startTime = new Date(`${date}T${time}:00`);
      for (let i = 0; i < teams.length; i += 2) {
        const teamA = teams[i];
        const teamB = teams[i + 1] || null;
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
    if (matchesToCreate.length > 0) await Match.insertMany(matchesToCreate);
    return res.json({ ok: true, created: matchesToCreate.length });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------
// ✅ POST: Add player to a match slot
// ------------------------------
router.post("/:id/players", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    const { playerId, team } = req.body;
    if (!isObjectId(id) || !isObjectId(playerId)) return res.status(400).json({ ok: false, message: "Invalid ID" });

    const match = await Match.findById(toObjId(id));
    if (!match) return res.status(404).json({ ok: false, message: "Match not found" });

    const tournament = await Tournament.findById(match.tournamentId);
    const TournamentPlayer = require("../models/TournamentPlayer");
    const reg = await TournamentPlayer.findOne({ tournamentId: match.tournamentId, playerId: toObjId(playerId), status: "approved" });
    if (!reg) return res.status(400).json({ ok: false, message: "Player not approved" });

    const teamSize = tournament.registration?.teamSize || 1;
    if (match[team].length >= teamSize) return res.status(400).json({ ok: false, message: "Team is full" });

    match[team].push(toObjId(playerId));
    await match.save();

    const { notifyUser } = require("../utils/notifications");
    await notifyUser({
      userId: playerId,
      type: "match_live",
      title: "Added to Match",
      message: `Added to ${match.name} in ${tournament.title}`,
      tournamentId: tournament._id,
      matchId: match._id
    });

    return res.json({ ok: true, message: "Player added" });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------
// ✅ GET rankings
// ------------------------------
router.get("/rankings/all", async (req, res) => {
  try {
    const players = await User.find({ role: "player" })
      .select("playerName name wins losses draws")
      .lean();

    const ranked = players
      .map((p) => ({
        ...p,
        playerName: p.playerName || p.name || "Player",
        points: (p.wins || 0) * 3 + (p.draws || 0),
      }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins);

    return res.json({ ok: true, rankings: ranked });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------
// ✅ GET current user rank
// ------------------------------
router.get("/me/rank", requireSession, async (req, res) => {
  try {
    const players = await User.find({ role: "player" }).select("_id wins draws").lean();
    const ranked = players
      .map((p) => ({
        _id: String(p._id),
        points: (p.wins || 0) * 3 + (p.draws || 0),
      }))
      .sort((a, b) => b.points - a.points);

    const myId = String(req.session.user.id);
    const index = ranked.findIndex((p) => p._id === myId);

    return res.json({ ok: true, rank: index === -1 ? null : index + 1 });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ✅ GET all matches for the LIVE page
router.get("/all", async (req, res) => {
  try {
    const matches = await Match.find({})
      .populate("tournamentId", "title course bannerUrl")
      .populate("teamA", "playerName name")
      .populate("teamB", "playerName name")
      .sort({ startTime: -1 })
      .lean();

    return res.json({ ok: true, matches });
  } catch (err) {
    console.error("GET ALL MATCHES ERROR:", err);
    return res.status(500).json({ ok: false, message: "Failed to fetch matches" });
  }
});

// GET public profile data for any user
router.get("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await User.findById(id).select("playerName name avatar wins losses draws handicap role").lean();
    if (!targetUser) return res.status(404).json({ ok: false, message: "Player not found" });

    // Calculate rank
    const allPlayers = await User.find({ role: "player" }).select("_id wins draws").lean();
    const ranked = allPlayers
      .map((u) => ({
        id: u._id.toString(),
        points: (u.wins || 0) * 3 + (u.draws || 0),
        wins: u.wins || 0,
      }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins);

    const rankIdx = ranked.findIndex((r) => r.id === id);
    const globalRank = rankIdx === -1 ? null : rankIdx + 1;

    // Fetch tournament history
    const TournamentPlayer = require("../models/TournamentPlayer");
    const history = await TournamentPlayer.find({ playerId: id })
      .populate("tournamentId", "title startDate course")
      .lean();

    return res.json({
      ok: true,
      user: {
        ...targetUser,
        playerName: targetUser.playerName || targetUser.name || "Player",
      },
      rank: globalRank,
      items: history
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Failed to fetch profile" });
  }
});

module.exports = router;

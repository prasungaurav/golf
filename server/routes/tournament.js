// backend/server/routes/tournament.js
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const Tournament = require("../models/Tournament");
const TournamentPlayer = require("../models/TournamentPlayer");
const News = require("../models/News"); // Move to top
const { requireSession } = require("../middleware/sessionAuth");
const { handlePlayerRemoval } = require("../utils/tournament.utils");
const { notifyUser, notifyMany } = require("../utils/notifications");

const router = express.Router();

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}
function toObjId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

// ✅ only allow logged-in PLAYER
function requirePlayer(req, res, next) {
  const u = req.session?.user;
  if (!u?.id) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const role = String(u.role || "").toLowerCase();
  if (role !== "player") {
    return res.status(403).json({ ok: false, message: "Only players can do registration" });
  }
  next();
}

// ✅ ORGANISER ONLY helper
function requireOrganiser(req, res, next) {
  const u = req.session?.user;
  if (!u?.id) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const role = String(u.role || "").toLowerCase();
  if (role !== "organiser") {
    return res.status(403).json({ ok: false, message: "Only organiser can access registrations" });
  }
  next();
}

function makeCode(prefix = "TP") {
  // TP-8F3K2J9A
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function issueEntryForApproved(tid, rid) {
  // ✅ ensures entryCode+secret exist if status is approved
  const reg = await TournamentPlayer.findOne({ _id: toObjId(rid), tournamentId: toObjId(tid) });
  if (!reg) return null;

  if (String(reg.status) !== "approved") return reg;
  if (reg.entryCode && reg.entrySecret) return reg;

  // generate unique code within tournament
  let code = "";
  for (let i = 0; i < 10; i++) {
    code = makeCode("TP");
    const exists = await TournamentPlayer.exists({ tournamentId: toObjId(tid), entryCode: code });
    if (!exists) break;
    code = "";
  }
  if (!code) throw new Error("Could not generate unique code");

  reg.entryCode = code;
  reg.entrySecret = crypto.randomBytes(16).toString("hex");
  reg.entryIssuedAt = new Date();
  await reg.save();

  return reg;
}

// ✅ PUBLIC LIST (Main page) - only public tournaments
router.get("/", async (req, res) => {
  try {
    const tournaments = await Tournament.find({ visibility: "public" })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ ok: true, tournaments });
  } catch (err) {
    console.error("GET PUBLIC TOURNAMENTS ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ✅ ORGANISER LIST (Dashboard) - only own tournaments
router.get("/me", requireSession, async (req, res) => {
  try {
    const organiserId = new mongoose.Types.ObjectId(String(req.session.user.id));

    const tournaments = await Tournament.find({ organiserId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ ok: true, tournaments });
  } catch (err) {
    console.error("GET ORGANISER TOURNAMENTS ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ✅ ORGANISER DETAIL (own only) - keep BEFORE "/:id"
router.get("/me/:id", requireSession, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const organiserId = new mongoose.Types.ObjectId(String(req.session.user.id));

    const tournament = await Tournament.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organiserId,
    }).lean();

    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    return res.json({ ok: true, tournament });
  } catch (err) {
    console.error("GET ORGANISER TOURNAMENT ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ✅ PUBLIC DETAIL (only if public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const tournament = await Tournament.findOne({
      _id: new mongoose.Types.ObjectId(id),
      visibility: "public",
    }).lean();

    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    // ✅ 2. Fetch related data
    const TournamentUpdate = require("../models/TournamentUpdate");
    const TournamentPlayer = require("../models/TournamentPlayer");
    const Match = require("../models/Match");

    const updates = await TournamentUpdate.find({ tournamentId: id }).sort({ createdAt: -1 }).limit(20).lean();
    const field = await TournamentPlayer.find({ tournamentId: id, status: "approved" })
      .populate("playerId", "playerName club handicap")
      .lean();

    // Map field to match frontend expectation
    const fieldMapped = field.map(f => ({
      id: f._id,
      name: f.playerId?.playerName || "Unknown",
      club: f.club || "—",
      handicap: f.handicapAtJoin ?? f.playerId?.handicap ?? "—"
    }));

    return res.json({
      ok: true,
      tournament,
      updates,
      field: fieldMapped
    });
  } catch (err) {
    console.error("GET PUBLIC TOURNAMENT ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ✅ CREATE (Organiser only) - BASIC + REGISTRATION ONLY
router.post("/", requireSession, async (req, res) => {
  try {
    const user = req.session.user;
    const body = req.body || {};

    // ✅ 1. Validate Dates
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ ok: false, message: "Invalid startDate or endDate" });
    }
    if (start >= end) {
      return res.status(400).json({ ok: false, message: "Start date must be before end date" });
    }

    const oId = new mongoose.Types.ObjectId(String(user.id));
    const tournamentVenue = String(body.course || body.ground || "").trim();
    const regClosesAt = body?.registration?.regClosesAt;

    // ✅ 2. Basic Required Fields
    if (!body.title || !tournamentVenue || !body.startDate || !body.endDate || !regClosesAt) {
      return res.status(400).json({
        ok: false,
        message: "title, course, startDate, endDate, registration.regClosesAt are required",
      });
    }

    // ✅ 3. Duplicate Title Check
    const dup = await Tournament.findOne({ organiserId: oId, title: String(body.title || "").trim() }).lean();
    if (dup) {
      return res.status(400).json({ ok: false, message: "Duplicate title not allowed" });
    }

    // ✅ 4. Check Overlapping Tournaments for same organiser at SAME COURSE
    const overlap = await Tournament.find({
      organiserId: oId,
      course: tournamentVenue,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    }).lean();
    if (overlap && overlap.length > 0) {
      return res.status(400).json({
        ok: false,
        message: `Oops! Same dates already have tournament on this course: ${overlap[0].title}`
      });
    }

    const extras = Array.isArray(body?.registration?.extras)
      ? body.registration.extras
        .filter((x) => x && String(x.name || "").trim() && x.price !== undefined && x.price !== null)
        .map((x) => ({ name: String(x.name).trim(), price: Number(x.price) }))
      : [];

    const tournament = await Tournament.create({
      organiserId: new mongoose.Types.ObjectId(String(user.id)),
      title: body.title,
      description: body.description || "",
      status: "draft",
      visibility: body.visibility || "public",
      bannerUrl: body.bannerUrl || "",
      course: tournamentVenue,
      city: body.city || "",
      startDate: body.startDate,
      endDate: body.endDate,
      teeOffWindow: body.teeOffWindow || "",
      format: body.format || "Stroke Play",
      rounds: Number(body.rounds || 1),

      rules: [],
      sponsors: [],
      stats: { playersCount: 0, matchesCount: 0 },

      registration: {
        fee: Number(body?.registration?.fee || 0),
        currency: body?.registration?.currency || "₹",
        maxPlayers: Number(body?.registration?.maxPlayers || 0),
        waitlistEnabled: !!body?.registration?.waitlistEnabled,
        handicapMin: Number(body?.registration?.handicapMin || 0),
        handicapMax: Number(body?.registration?.handicapMax || 54),
        teamSize: Number(body?.registration?.teamSize) || 1,
        teamAllowed: Number(body?.registration?.teamSize) > 1,
        extras,
        regClosesAt,
        policyText: body?.registration?.policyText || "",
      },
    });

    return res.json({ ok: true, tournament });
  } catch (err) {
    console.error("CREATE TOURNAMENT ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ✅ PLAYER REGISTER
router.post("/players/me/:id/register", requireSession, requirePlayer, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });

    const playerId = toObjId(req.session.user.id);

    const tournament = await Tournament.findById(toObjId(id)).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    if (String(tournament.visibility || "").toLowerCase() !== "public") {
      return res.status(403).json({ ok: false, message: "Tournament is not public" });
    }

    const reg = tournament.registration || {};
    const closesAt = reg.regClosesAt || tournament.regClosesAt;

    if (closesAt) {
      const end = new Date(closesAt).getTime();
      if (!Number.isNaN(end) && Date.now() > end) {
        return res.status(400).json({ ok: false, message: "Registration closed" });
      }
    }

    const existing = await TournamentPlayer.findOne({
      tournamentId: toObjId(id),
      playerId,
    }).lean();

    if (existing) {
      const st = String(existing.status || "pending").toLowerCase();
      if (st === "blocked") return res.status(403).json({ ok: false, message: "You are blocked for this tournament" });
      if (st !== "rejected") return res.status(400).json({ ok: false, message: `Already registered (${st})` });
    }

    const allowedExtras = Array.isArray(reg.extras) ? reg.extras : [];
    const allowedMap = new Map(
      allowedExtras.map((x) => [String(x._id || x.id), { name: String(x.name || ""), price: Number(x.price || 0) }])
    );

    const body = req.body || {};
    const incoming = Array.isArray(body.extrasChosen) ? body.extrasChosen : [];

    const extrasChosen = incoming
      .map((x) => {
        const key = String(x?.extraId || "");
        if (!key) return null;
        const allowed = allowedMap.get(key);
        if (!allowed) return null;
        return { extraId: toObjId(key), name: allowed.name, price: allowed.price };
      })
      .filter(Boolean);

    const rawHcp = body.handicapAtJoin;
    const handicapAtJoin = (rawHcp === null || rawHcp === undefined || isNaN(Number(rawHcp))) ? null : Number(rawHcp);
    const club = String(body.club || "").trim();

    // ✅ TEAM & PARTNER LOGIC
    const partnerIds = Array.isArray(body.partnerIds) ? body.partnerIds.map(id => toObjId(id)) : [];
    const teamSize = Number(reg.teamSize) || 1;

    // ✅ Validation: partner count must not exceed teamSize - 1
    // Relaxed check: Allow more invites than seats to support "first-come-first-served"
    // However, we still want to keep it reasonable, e.g., max 10 invites per team
    if (partnerIds.length > 10) {
      return res.status(400).json({ ok: false, message: "You can invite a maximum of 10 friends at once." });
    }

    const teamName = String(body.teamName || "").trim();
    if (teamSize > 1 && !teamName) {
      return res.status(400).json({ ok: false, message: "Team name is required for team formats." });
    }

    // Validate partners (must be players and must be friends)
    if (partnerIds.length > 0) {
      const Friendship = require("../models/Friendship");
      const User = require("../models/User");
      for (const pId of partnerIds) {
        // Ensure they exist and are players
        const partner = await User.findById(pId);
        if (!partner || partner.role !== "player") {
          return res.status(400).json({ ok: false, message: `Partner ${pId} is not a valid player.` });
        }

        // Ensure they are friends
        const isFriend = await Friendship.findOne({
          status: "accepted",
          $or: [
            { requesterId: playerId, recipientId: pId },
            { requesterId: pId, recipientId: playerId }
          ]
        });
        if (!isFriend) {
          return res.status(400).json({ ok: false, message: `Partner ${partner.playerName || pId} is not your friend.` });
        }
      }
    }

    const maxPlayers = Number(reg.maxPlayers || 0);
    const waitlistEnabled = !!reg.waitlistEnabled;

    let status = "pending";
    const totalNewPlayers = 1 + partnerIds.length;

    if (maxPlayers > 0) {
      // Use teamSize if registration is for a team, otherwise 1
      const playersToCount = teamSize > 1 ? teamSize : 1;

      if (maxPlayers > 0) {
        // 1. Get all unique registration groups that have at least one 'active' member
        const activeGroups = await TournamentPlayer.distinct("registrationGroupId", {
          tournamentId: toObjId(id),
          status: { $in: ["approved", "pending", "awaiting_friends"] }
        });

        // 2. Count solo players (those without a registrationGroupId)
        const soloCount = await TournamentPlayer.countDocuments({
          tournamentId: toObjId(id),
          registrationGroupId: { $in: ["", null] },
          status: { $in: ["approved", "pending", "awaiting_friends"] }
        });

        // 3. Calculate total spots taken
        // Note: We filter out any empty string from distinct results
        const teamGroups = activeGroups.filter(g => g && g !== "");
        const totalOccupied = (teamGroups.length * teamSize) + soloCount;

        const playersToCount = teamSize > 1 ? teamSize : 1;

        if (totalOccupied + playersToCount > maxPlayers) {
          if (!waitlistEnabled) return res.status(400).json({ ok: false, message: "Tournament is full" });
          status = "waitlist";
        }
      }
    }

    // ✅ FRIEND APPROVAL LOGIC
    let initialLeaderStatus = status;
    let initialPartnerStatus = status;

    if (partnerIds.length > 0 && status !== "waitlist") {
      initialLeaderStatus = "awaiting_friends";
      initialPartnerStatus = "invitation_pending";
    }

    const registrationGroupId = crypto.randomBytes(8).toString("hex");

    const allPlayerIds = [playerId, ...partnerIds];
    const registrations = [];

    for (const pId of allPlayerIds) {
      const isLeader = String(pId) === String(playerId);
      const otherPartnerIds = allPlayerIds.filter(id => String(id) !== String(pId));

      const currentStatus = isLeader ? initialLeaderStatus : initialPartnerStatus;

      const update = {
        tournamentId: toObjId(id),
        playerId: pId,
        status: currentStatus,
        handicapAtJoin: isLeader ? (Number.isFinite(handicapAtJoin) ? handicapAtJoin : null) : null,
        club: isLeader ? club : "",
        paid: false,
        paymentRef: "",
        extrasChosen: isLeader ? extrasChosen : [],
        notes: isLeader ? (body.notes || "") : "",
        teamName,
        partnerIds: otherPartnerIds,
        registrationGroupId,
      };

      const r = await TournamentPlayer.findOneAndUpdate(
        { tournamentId: toObjId(id), playerId: pId },
        { $set: update, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true }
      );
      registrations.push(r);

      // ✅ SEND NOTIFICATION TO FRIENDS
      if (!isLeader && currentStatus === "invitation_pending") {
        const Notification = require("../models/Notification");
        await Notification.create({
          userId: pId,
          type: "tournament_invite",
          title: "Tournament Invitation",
          message: `${req.session.user.name} invited you to join their team "${teamName}" for ${reg.title}.`,
          metadata: {
            tournamentId: id,
            registrationId: r._id,
            registrationGroupId,
            leaderName: req.session.user.name
          }
        }).catch(e => console.error("Notification Error:", e));
      }
    }

    const registration = registrations.find(r => String(r.playerId) === String(playerId));

    return res.json({ ok: true, registration });
  } catch (err) {
    if (String(err?.code) === "11000") {
      return res.status(400).json({ ok: false, message: "Already registered" });
    }
    console.error("PLAYER REGISTER ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ RESPOND TO TOURNAMENT INVITATION
// POST /api/tournaments/players/me/:tid/invite-respond
// body: { action: "accept" | "reject" }
// ------------------------------------------------------------------
router.post("/players/me/:tid/invite-respond", requireSession, requirePlayer, async (req, res) => {
  try {
    const { tid } = req.params;
    const { action } = req.body;
    const playerId = toObjId(req.session.user.id);

    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });
    if (!["accept", "reject"].includes(action)) return res.status(400).json({ ok: false, message: "Invalid action" });

    const reg = await TournamentPlayer.findOne({ tournamentId: toObjId(tid), playerId });
    if (!reg) return res.status(404).json({ ok: false, message: "Invitation not found" });

    if (reg.status !== "invitation_pending") {
      return res.status(400).json({ ok: false, message: `Cannot ${action}: status is ${reg.status}` });
    }

    if (action === "reject") {
      reg.status = "rejected";
      await reg.save();
      return res.json({ ok: true, message: "Invitation rejected" });
    }

    // ACTION: ACCEPT
    const tournament = await Tournament.findById(toObjId(tid)).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    const teamSize = tournament.registration?.teamSize || 1;
    const gid = reg.registrationGroupId;

    if (!gid) {
      // Solo registration (shouldn't really happen with invitation_pending)
      reg.status = "pending";
      await reg.save();
      return res.json({ ok: true, message: "Joined successfully" });
    }

    // Check how many people are already "in" the team
    const currentTeamMatched = await TournamentPlayer.find({
      tournamentId: toObjId(tid),
      registrationGroupId: gid,
      status: { $in: ["approved", "pending", "awaiting_friends", "waitlist"] }
    });

    if (currentTeamMatched.length >= teamSize) {
      return res.status(400).json({ ok: false, message: "This team is already full." });
    }

    // Accept into the team
    reg.status = "awaiting_friends";
    await reg.save();

    const newCount = currentTeamMatched.length + 1;

    // If team is now full, handle automatic withdrawals
    if (newCount === teamSize) {
      // 1. Withdraw all other PENDING invites for this team
      await TournamentPlayer.updateMany(
        {
          tournamentId: toObjId(tid),
          registrationGroupId: gid,
          status: "invitation_pending"
        },
        { $set: { status: "withdrawn" } }
      );

      // 2. Promote all 'awaiting_friends' to 'pending' (ready for organiser approval)
      // Note: If some were already 'approved' (leader), keep them as is.
      await TournamentPlayer.updateMany(
        {
          tournamentId: toObjId(tid),
          registrationGroupId: gid,
          status: "awaiting_friends"
        },
        { $set: { status: "pending" } }
      );

      // 3. Notify Leader
      const leader = await TournamentPlayer.findOne({
        tournamentId: toObjId(tid),
        registrationGroupId: gid
      }).sort({ createdAt: 1 });

      if (leader) {
        await notifyUser({
          userId: leader.playerId,
          type: "tournament_update",
          title: "Team Fully Formed!",
          message: `Your team "${reg.teamName}" for tournament "${tournament.title}" is now complete and pending approval.`,
          tournamentId: tid
        });
      }
    }

    return res.json({ ok: true, message: "Invitation accepted!" });
  } catch (err) {
    console.error("INVITE RESPOND ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

router.get("/players/me", requireSession, requirePlayer, async (req, res) => {
  try {
    const playerId = toObjId(req.session.user.id);

    const regs = await TournamentPlayer.find({ playerId })
      .populate("tournamentId", "title city course startDate endDate bannerUrl status visibility registration")
      .sort({ createdAt: -1 })
      .lean();

    const items = await Promise.all(regs.map(async (r) => {
      if (!r.registrationGroupId) return { ...r, team: [r] };

      const team = await TournamentPlayer.find({
        tournamentId: r.tournamentId?._id || r.tournamentId,
        registrationGroupId: r.registrationGroupId
      })
        .populate("playerId", "playerName email handicap status")
        .sort({ createdAt: 1 })
        .lean();

      return { ...r, team };
    }));

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("GET MY TOURNAMENTS ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ REPLACE TEAMMATE (Player Leader Only)
// POST /api/tournaments/players/me/:tid/replace
// ------------------------------------------------------------------
router.post("/players/me/:tid/replace", requireSession, requirePlayer, async (req, res) => {
  try {
    const { tid } = req.params;
    const { newPlayerId } = req.body;
    const myId = toObjId(req.session.user.id);

    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });
    if (!isObjectId(newPlayerId)) return res.status(400).json({ ok: false, message: "Invalid player id" });

    // 1. Verify I am the leader of a team in this tournament
    const myReg = await TournamentPlayer.findOne({ tournamentId: toObjId(tid), playerId: myId });
    if (!myReg) return res.status(404).json({ ok: false, message: "You are not registered for this tournament" });

    const gid = myReg.registrationGroupId;
    if (!gid) return res.status(400).json({ ok: false, message: "You are not in a team" });

    const teamMembers = await TournamentPlayer.find({ tournamentId: toObjId(tid), registrationGroupId: gid }).sort({ createdAt: 1 });
    if (String(teamMembers[0].playerId) !== String(myId)) {
      return res.status(403).json({ ok: false, message: "Only the team leader can replace teammates" });
    }

    // 2. Identify if there is a vacant slot (blocked player)
    const blockedMember = teamMembers.find(m => m.status === "blocked");
    if (!blockedMember) {
      // Check if team is full based on tournament teamSize
      const tournament = await Tournament.findById(toObjId(tid));
      const teamSize = tournament?.registration?.teamSize || 1;
      const activeCount = teamMembers.filter(m => m.status !== "blocked").length;
      if (activeCount >= teamSize) {
        return res.status(400).json({ ok: false, message: "Team is already full" });
      }
    }

    // 3. Validate new player (must be friend and active)
    const User = require("../models/User");
    const newPlayer = await User.findOne({ _id: toObjId(newPlayerId), role: "player", status: "active" });
    if (!newPlayer) return res.status(404).json({ ok: false, message: "Player not found or not active" });

    // Ensure they are not already registered
    const alreadyRegistered = await TournamentPlayer.exists({ tournamentId: toObjId(tid), playerId: toObjId(newPlayerId) });
    if (alreadyRegistered) return res.status(400).json({ ok: false, message: "Player is already registered for this tournament" });

    // Ensure they are friends
    const Friendship = require("../models/Friendship");
    const isFriend = await Friendship.exists({
      status: "accepted",
      $or: [
        { requesterId: myId, recipientId: toObjId(newPlayerId) },
        { requesterId: toObjId(newPlayerId), recipientId: myId }
      ]
    });
    if (!isFriend) return res.status(400).json({ ok: false, message: "You can only add friends to your team" });

    // 4. Perform the replacement
    // If there was a blocked member, we "reuse" their spot (delete old, or update?)
    // Actually, user said "remove krke new teamate add krne ka option dedo".
    // I'll create a NEW record for the new teammate and ensure everyone's partnerIds are updated.

    const newReg = new TournamentPlayer({
      tournamentId: toObjId(tid),
      playerId: toObjId(newPlayerId),
      status: myReg.status, // approved/pending
      registrationGroupId: gid,
      teamName: myReg.teamName,
      partnerIds: teamMembers.map(m => m.playerId),
      handicapAtJoin: 0, // Fallback to 0 to avoid CastError, actual handicap management can be added later
      club: newPlayer.club || ""
    });
    await newReg.save();

    // Update partnerIds for everyone else
    const activeMemberIds = teamMembers.map(m => m.playerId);
    await TournamentPlayer.updateMany(
      { tournamentId: toObjId(tid), registrationGroupId: gid },
      { $addToSet: { partnerIds: toObjId(newPlayerId) } }
    );

    // 5. Notify
    await notifyUser({
      userId: toObjId(newPlayerId),
      type: "tournament_update",
      title: "Added to Team",
      message: `You have been added to team "${myReg.teamName}" for tournament "${(await Tournament.findById(tid)).title}" by ${req.session.user.playerName}.`,
      tournamentId: tid
    });

    const teammates = activeMemberIds.filter(id => String(id) !== String(myId));
    if (teammates.length > 0) {
      await notifyMany(teammates, {
        type: "info",
        title: "Teammate Replaced",
        message: `${newPlayer.playerName} has joined your team as a replacement.`,
        tournamentId: tid
      });
    }

    return res.json({ ok: true, message: "Teammate replaced successfully", newPlayer: newReg });
  } catch (err) {
    console.error("REPLACE TEAMMATE ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ GET REGISTRATIONS OF A TOURNAMENT (Organiser)
// GET /api/tournaments/me/:id/registrations
// ------------------------------------------------------------------
router.get("/me/:id/registrations", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });

    const organiserId = toObjId(req.session.user.id);

    const tournament = await Tournament.findOne({ _id: toObjId(id), organiserId }).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found / not yours" });

    const rawRegs = await TournamentPlayer.find({ tournamentId: toObjId(id) }).lean();
    console.log(`[DEBUG] RAW COLLECTION COUNT: ${rawRegs.length}`);
    for (const r of rawRegs) {
      console.log(`[DEBUG] RegId: ${r._id} | PlayerId: ${r.playerId} | Group: ${r.registrationGroupId}`);
    }

    // ✅ Filter out players who are BLOCKED in their User account
    const regs = await TournamentPlayer.find({ tournamentId: toObjId(id) })
      .populate("playerId", "playerName email phone city handicap status")
      .populate("partnerIds", "playerName email handicap status")
      .sort({ createdAt: 1 })
      .lean();

    // Identify groups that have at least one blocked member
    const blockedGIDs = new Set();
    for (const r of regs) {
      const isUserBlocked = r.playerId?.status === "blocked";
      const isRegBlocked = r.status === "blocked";
      if (isUserBlocked || isRegBlocked) {
        if (r.registrationGroupId) blockedGIDs.add(r.registrationGroupId);
      }
    }

    // Map all members of blocked groups to "blocked" status
    const grouped = {};
    const items = regs.map(r => {
      const item = {
        _id: r._id,
        tournamentId: r.tournamentId,
        status: r.status,
        paid: r.paid,
        paymentRef: r.paymentRef,
        handicapAtJoin: r.handicapAtJoin,
        club: r.club,
        extrasChosen: r.extrasChosen || [],
        notes: r.notes || "",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,

        // ✅ entry-pass + checkin
        entryCode: r.entryCode || "",
        entryIssuedAt: r.entryIssuedAt || null,
        checkInAt: r.checkInAt || null,

        player: {
          _id: r.playerId?._id,
          name: r.playerId?.playerName || "—",
          email: r.playerId?.email || "—",
          phone: r.playerId?.phone || "—",
          city: r.playerId?.city || "—",
          handicap: r.playerId?.handicap ?? "—",
        },
        registrationGroupId: r.registrationGroupId || "",
        teamName: r.teamName || "",
        partnerIds: r.partnerIds || [],
        partners: (r.partnerIds || []).map(p => ({
          _id: p?._id,
          name: p?.playerName || "—",
          email: p?.email || "—",
          handicap: p?.handicap ?? "—"
        })),
        isLeader: false // Default
      };

      const gid = item.registrationGroupId || `solo-${item._id}`;
      if (!grouped[gid]) {
        grouped[gid] = {
          groupId: gid,
          teamName: item.teamName || "Solo / Unnamed Team",
          status: item.status,
          members: []
        };
        // Leader is the first NON-BLOCKED member in the group
        if (item.status !== "blocked") {
          item.isLeader = true;
        }
      } else {
        // If the first one was blocked, the next non-blocked becomes leader
        const hasLeader = grouped[gid].members.some(m => m.isLeader);
        if (!hasLeader && item.status !== "blocked") {
          item.isLeader = true;
        }
      }
      grouped[gid].members.push(item);
      return item;
    });

    return res.json({
      ok: true,
      tournament,
      items,
      grouped: Object.values(grouped)
    });
  } catch (err) {
    console.error("GET ORGANISER REGISTRATIONS ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ UPDATE REGISTRATION STATUS (Organiser)
// PATCH /api/tournaments/me/:tid/registrations/:rid/status
// ------------------------------------------------------------------
router.patch("/me/:tid/registrations/:rid/status", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { tid, rid } = req.params;
    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });
    if (!isObjectId(rid)) return res.status(400).json({ ok: false, message: "Invalid registration id" });

    const organiserId = toObjId(req.session.user.id);

    const tournament = await Tournament.findOne({ _id: toObjId(tid), organiserId }).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found / not yours" });

    const next = String(req.body?.status || "").toLowerCase();
    const allowed = ["pending", "approved", "rejected", "waitlist", "blocked", "removed"];
    if (!allowed.includes(next)) return res.status(400).json({ ok: false, message: "Invalid status" });

    if (next === "removed") {
      const target = await TournamentPlayer.findOne({ _id: toObjId(rid), tournamentId: toObjId(tid) }).lean();
      if (!target) return res.status(404).json({ ok: false, message: "Registration not found" });

      const groupId = target.registrationGroupId;
      const query = groupId
        ? { tournamentId: toObjId(tid), registrationGroupId: groupId }
        : { _id: toObjId(rid), tournamentId: toObjId(tid) };

      await TournamentPlayer.deleteMany(query);
      return res.json({ ok: true, message: "Registration(s) removed" });
    }

    const queryOne = { _id: toObjId(rid), tournamentId: toObjId(tid) };
    const target = await TournamentPlayer.findOne(queryOne).populate("playerId", "playerName").lean();
    if (!target) return res.status(404).json({ ok: false, message: "Registration not found" });

    const groupId = target.registrationGroupId;
    const { notifyUser, notifyMany } = require("../utils/notifications");

    // ✅ BLOCKED behavior change
    if (next === "blocked") {
      await handlePlayerRemoval(target.playerId?._id, tid, req.body.reason || "Policy Violation");
      return res.json({ ok: true, message: "Player blocked and team updated", registrationId: rid });
    }

    const queryGroup = groupId
      ? { tournamentId: toObjId(tid), registrationGroupId: groupId }
      : { _id: toObjId(rid), tournamentId: toObjId(tid) };

    const result = await TournamentPlayer.updateMany(queryGroup, { $set: { status: next } });

    // ✅ AUTO ISSUE ENTRY CODE when approved
    if (next === "approved") {
      const regsToIssue = await TournamentPlayer.find(queryGroup);
      for (const r of regsToIssue) {
        await issueEntryForApproved(tid, r._id);
      }
      // Notify team
      const memberIds = regsToIssue.map(r => r.playerId);
      await notifyMany(memberIds, {
        userId: null,
        type: "tournament_update",
        title: "Registration Approved!",
        message: `Your registration for tournament "${tournament.title}" has been approved. Check your entry pass!`,
        tournamentId: tid
      });
    }

    const updated = await TournamentPlayer.findOne({ _id: toObjId(rid), tournamentId: toObjId(tid) })
      .populate("playerId", "playerName email phone city handicap")
      .lean();

    return res.json({ ok: true, registration: updated, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("UPDATE REG STATUS ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ Toggle Paid (Organiser)
// PATCH /api/tournaments/me/:tid/registrations/:rid/paid
// ------------------------------------------------------------------
router.patch("/me/:tid/registrations/:rid/paid", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { tid, rid } = req.params;
    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });
    if (!isObjectId(rid)) return res.status(400).json({ ok: false, message: "Invalid registration id" });

    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(tid), organiserId }).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found / not yours" });

    const paid = !!req.body?.paid;
    const paymentRef = String(req.body?.paymentRef || "");

    const target = await TournamentPlayer.findOne({ _id: toObjId(rid), tournamentId: toObjId(tid) }).lean();
    if (!target) return res.status(404).json({ ok: false, message: "Registration not found" });

    const groupId = target.registrationGroupId;
    const query = groupId
      ? { tournamentId: toObjId(tid), registrationGroupId: groupId }
      : { _id: toObjId(rid), tournamentId: toObjId(tid) };

    await TournamentPlayer.updateMany(query, { $set: { paid, paymentRef } });

    const updated = await TournamentPlayer.findOne({ _id: toObjId(rid), tournamentId: toObjId(tid) }).lean();
    return res.json({ ok: true, registration: updated });
  } catch (err) {
    console.error("UPDATE PAID ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ DELETE REGISTRATION (Organiser)
// DELETE /api/tournaments/me/:tid/registrations/:rid
// ------------------------------------------------------------------
router.delete("/me/:tid/registrations/:rid", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { tid, rid } = req.params;
    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });
    if (!isObjectId(rid)) return res.status(400).json({ ok: false, message: "Invalid registration id" });

    const organiserId = toObjId(req.session.user.id);

    const tournament = await Tournament.findOne({ _id: toObjId(tid), organiserId }).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found / not yours" });

    const target = await TournamentPlayer.findOne({ _id: toObjId(rid), tournamentId: toObjId(tid) }).lean();
    if (!target) return res.status(404).json({ ok: false, message: "Registration not found" });

    const groupId = target.registrationGroupId;
    const query = groupId
      ? { tournamentId: toObjId(tid), registrationGroupId: groupId }
      : { _id: toObjId(rid), tournamentId: toObjId(tid) };

    const deleted = await TournamentPlayer.deleteMany(query);
    if (deleted.deletedCount === 0) return res.status(404).json({ ok: false, message: "Registration not found" });

    return res.json({ ok: true, message: "Registration(s) removed", deletedCount: deleted.deletedCount });
  } catch (err) {
    console.error("DELETE REGISTRATION ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ✅ Remove duplicate PATCH /paid (lines 602-628 were redundant)

// ------------------------------------------------------------------
// ✅ MANUAL REGISTER (Organiser)
// POST /api/tournaments/me/:tid/registrations/manual
// ------------------------------------------------------------------
router.post("/me/:tid/registrations/manual", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { tid } = req.params;
    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(tid), organiserId });
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    const { name, phone, email, handicap, club, notes, paid, teamName, partners } = req.body;
    if (!name || !phone) return res.status(400).json({ ok: false, message: "Main player Name and Phone are required" });

    const User = require("../models/User");
    const bcrypt = require("bcrypt");

    // Helper to find or create a player
    const getPlayer = async (pName, pPhone, pEmail, pHandicap) => {
      let p = await User.findOne({ $or: [{ phone: pPhone }, { email: pEmail || "non-existent-email" }] });
      if (!p) {
        const hashed = await bcrypt.hash("123456", 10);
        p = await User.create({
          playerName: pName,
          phone: pPhone,
          email: pEmail || `${pPhone}@golf.internal`,
          passwordHash: hashed, // Fixed field name
          role: "player",
          status: "active"
        });
      }
      return p;
    };

    // 1. Process Main Player
    const mainPlayer = await getPlayer(name, phone, email, handicap);

    // 2. Process Partners
    const partnerIds = [];
    const incomingPartners = Array.isArray(partners) ? partners : [];
    for (const p of incomingPartners) {
      if (!p.name || !p.phone) continue;
      const partnerUser = await getPlayer(p.name, p.phone, p.email, p.handicap);
      partnerIds.push(partnerUser._id);
    }

    const allPlayerIds = [mainPlayer._id, ...partnerIds];
    const registrations = [];
    const registrationGroupId = crypto.randomBytes(8).toString("hex");

    // 3. Create Registrations for All
    for (const pId of allPlayerIds) {
      const otherPartnerIds = allPlayerIds.filter(id => String(id) !== String(pId));
      const reg = await TournamentPlayer.findOneAndUpdate(
        { tournamentId: toObjId(tid), playerId: pId },
        {
          $set: {
            status: "approved",
            paid: !!paid,
            handicapAtJoin: (handicap && !isNaN(Number(handicap))) ? Number(handicap) : null,
            club: club || "",
            notes: notes || "Added manually by organiser",
            teamName: teamName || "",
            partnerIds: otherPartnerIds,
            registrationGroupId,
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { new: true, upsert: true }
      );
      registrations.push(reg);
    }

    return res.json({ ok: true, registrations, registrationGroupId });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------------------------------------------
// ✅ ISSUE ENTRY CODES (Organiser) - only approved (bulk)
// POST /api/tournaments/me/:tid/registrations/issue-codes
// ------------------------------------------------------------------
router.post("/me/:tid/registrations/issue-codes", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { tid } = req.params;
    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });

    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(tid), organiserId }).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found / not yours" });

    const regs = await TournamentPlayer.find({ tournamentId: toObjId(tid), status: "approved" });

    let updatedCount = 0;

    for (const r of regs) {
      if (r.entryCode && r.entrySecret) continue;

      let code = "";
      for (let i = 0; i < 10; i++) {
        code = makeCode("TP");
        const exists = await TournamentPlayer.exists({ tournamentId: toObjId(tid), entryCode: code });
        if (!exists) break;
        code = "";
      }
      if (!code) return res.status(500).json({ ok: false, message: "Could not generate unique code" });

      r.entryCode = code;
      r.entrySecret = crypto.randomBytes(16).toString("hex");
      r.entryIssuedAt = new Date();
      await r.save();
      updatedCount++;
    }

    return res.json({ ok: true, updatedCount });
  } catch (err) {
    console.error("ISSUE CODES ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ PLAYER: GET ENTRY PASS
// GET /api/tournaments/players/me/:tid/entry-pass
// ------------------------------------------------------------------
router.get("/players/me/:tid/entry-pass", requireSession, requirePlayer, async (req, res) => {
  try {
    const { tid } = req.params;
    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });

    const playerId = toObjId(req.session.user.id);

    const reg = await TournamentPlayer.findOne({ tournamentId: toObjId(tid), playerId }).lean();
    if (!reg) return res.status(404).json({ ok: false, message: "Not registered" });
    if (reg.status !== "approved") return res.status(403).json({ ok: false, message: "Not approved yet" });
    if (!reg.entryCode || !reg.entrySecret) {
      return res.status(400).json({ ok: false, message: "Entry code not issued yet" });
    }

    const tournament = await Tournament.findById(toObjId(tid))
      .select("title course city startDate endDate bannerUrl registration")
      .lean();

    const qrPayload = JSON.stringify({
      tid: String(tid),
      rid: String(reg._id),
      code: reg.entryCode,
      secret: reg.entrySecret,
    });

    return res.json({
      ok: true,
      tournament,
      entry: {
        rid: String(reg._id),
        code: reg.entryCode,
        issuedAt: reg.entryIssuedAt,
        checkInAt: reg.checkInAt || null,
        qrPayload,
      },
    });
  } catch (err) {
    console.error("GET ENTRY PASS ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ ORGANISER: CHECK-IN (VERIFY QR)
// POST /api/tournaments/me/:tid/checkin
// body: { qrPayload }
// ------------------------------------------------------------------
router.post("/me/:tid/checkin", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { tid } = req.params;
    if (!isObjectId(tid)) return res.status(400).json({ ok: false, message: "Invalid tournament id" });

    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(tid), organiserId }).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found / not yours" });

    const raw = req.body?.qrPayload;
    if (!raw) return res.status(400).json({ ok: false, message: "qrPayload required" });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(400).json({ ok: false, message: "Invalid QR payload" });
    }

    const { rid, secret, code } = parsed || {};
    if (!isObjectId(rid)) return res.status(400).json({ ok: false, message: "Invalid QR rid" });

    const reg = await TournamentPlayer.findOne({ _id: toObjId(rid), tournamentId: toObjId(tid) })
      .populate("playerId", "playerName email phone city handicap")
      .lean();

    if (!reg) return res.status(404).json({ ok: false, message: "Registration not found" });
    if (reg.status !== "approved") return res.status(403).json({ ok: false, message: "Not approved" });
    if (reg.entrySecret !== secret || reg.entryCode !== code) {
      return res.status(403).json({ ok: false, message: "Invalid entry pass" });
    }

    if (reg.checkInAt) {
      return res.json({ ok: true, alreadyCheckedIn: true, checkInAt: reg.checkInAt, player: reg.playerId });
    }

    await TournamentPlayer.updateOne(
      { _id: toObjId(rid) },
      { $set: { checkInAt: new Date(), checkInBy: toObjId(req.session.user.id) } }
    );

    return res.json({ ok: true, checkedIn: true, player: reg.playerId });
  } catch (err) {
    console.error("CHECKIN ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ UPDATE TOURNAMENT (Organiser)
// PATCH /api/tournaments/me/:id
// ------------------------------------------------------------------
router.patch("/me/:id", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });
    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(id), organiserId });
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    const body = req.body || {};
    const oId = organiserId;

    // ✅ Validate Dates in Update
    const start = body.startDate ? new Date(body.startDate) : new Date(tournament.startDate);
    const end = body.endDate ? new Date(body.endDate) : new Date(tournament.endDate);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ ok: false, message: "Invalid startDate or endDate" });
    }
    if (start >= end) {
      return res.status(400).json({ ok: false, message: "Start date must be before end date" });
    }

    // ✅ Duplicate Title Check (excluding this tournament)
    if (body.title && String(body.title).trim().toLowerCase() !== String(tournament.title).toLowerCase()) {
      const dup = await Tournament.findOne({
        _id: { $ne: toObjId(id) },
        organiserId: oId,
        title: { $regex: new RegExp(`^${body.title.trim()}$`, "i") }
      }).lean();
      if (dup) return res.status(400).json({ ok: false, message: "A tournament with this name already exists." });
    }

    const checkCourse = body.course ? String(body.course).trim() : tournament.course;

    // ✅ Check Overlapping Tournaments (excluding this tournament)
    const overlap = await Tournament.findOne({
      _id: { $ne: toObjId(id) },
      organiserId: oId,
      course: checkCourse,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    }).lean();
    if (overlap) {
      return res.status(400).json({ ok: false, message: `Overlap detected with: ${overlap.title}` });
    }

    const updatableFields = ["title", "description", "status", "visibility", "bannerUrl", "course", "city", "startDate", "endDate", "teeOffWindow", "format", "rounds"];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        tournament[field] = body[field];
      }
    }

    if (body.registration) {
      if (!tournament.registration) tournament.registration = {};
      const regFields = ["fee", "currency", "maxPlayers", "waitlistEnabled", "handicapMin", "handicapMax", "teamAllowed", "teamSize", "regClosesAt", "policyText"];
      for (const field of regFields) {
        if (body.registration[field] !== undefined) {
          tournament.registration[field] = body.registration[field];
        }
      }
      // Ensure teamAllowed is synced with teamSize
      if (body.registration.teamSize !== undefined) {
        tournament.registration.teamAllowed = Number(body.registration.teamSize) > 1;
      }
    }

    await tournament.save();
    return res.json({ ok: true, tournament });
  } catch (err) {
    console.error("UPDATE TOURNAMENT ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------------
// ✅ DELETE TOURNAMENT (Organiser)
// DELETE /api/tournaments/me/:id
// ------------------------------------------------------------------
router.delete("/me/:id", requireSession, requireOrganiser, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });
    const organiserId = toObjId(req.session.user.id);

    const Match = require("../models/Match");

    // ✅ CHECK FOR PLAYERS
    const playersCount = await TournamentPlayer.countDocuments({ tournamentId: toObjId(id) });
    if (playersCount > 0) {
      return res.status(400).json({ ok: false, message: `Cannot delete: ${playersCount} players have already registered for this tournament.` });
    }

    // ✅ CHECK FOR MATCHES
    const matchesCount = await Match.countDocuments({ tournamentId: toObjId(id) });
    if (matchesCount > 0) {
      return res.status(400).json({ ok: false, message: `Cannot delete: ${matchesCount} matches are already scheduled for this tournament.` });
    }

    const deleted = await Tournament.findOneAndDelete({ _id: toObjId(id), organiserId });
    if (!deleted) return res.status(404).json({ ok: false, message: "Tournament not found or unauth" });

    // Optional: Also delete TournamentPlayers, Updates, Logs here if cascading is needed
    // await TournamentPlayer.deleteMany({ tournamentId: toObjId(id) });
    // await TournamentUpdate.deleteMany({ tournamentId: toObjId(id) });
    // await TournamentLog.deleteMany({ tournamentId: toObjId(id) });

    return res.json({ ok: true, message: "Tournament deleted" });
  } catch (err) {
    console.error("DELETE TOURNAMENT ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

const TournamentUpdate = require("../models/TournamentUpdate");
const TournamentLog = require("../models/TournamentLog");

// ------------------------------------------------------------------
// ✅ GET UPDATES & LOGS
// GET /api/tournaments/me/:id/updates-logs
// ------------------------------------------------------------------
router.get("/me/:id/updates-logs", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });
    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(id), organiserId }).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    const updates = await TournamentUpdate.find({ tournamentId: toObjId(id) }).sort({ createdAt: -1 }).lean();
    const logs = await TournamentLog.find({ tournamentId: toObjId(id) }).sort({ at: -1 }).lean();

    return res.json({ ok: true, updates, logs });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------------------------------------------
// ✅ POST UPDATE
// POST /api/tournaments/me/:id/updates
// ------------------------------------------------------------------
router.post("/me/:id/updates", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });
    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(id), organiserId }).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    const { type, title, message, pinned } = req.body;

    // Using TournamentUpdate model, mapping 'type' to a generic field or appending to title.
    // Wait, TournamentUpdate schema only has title, message, pinned, visibility, authorId.
    const update = await TournamentUpdate.create({
      tournamentId: toObjId(id),
      title: `${type || 'Announcement'} ${title ? '- ' + title : ''}`.trim(),
      message,
      pinned: !!pinned,
      authorId: organiserId
    });

    // 🏆 AUTO-GENERATE GLOBAL NEWS ITEM
    try {
      const newsItem = new News({
        title: update.title,
        content: message,
        excerpt: (message || "").substring(0, 150) + "...",
        category: "Tournament Update",
        status: "published",
        image: tournament.bannerUrl || "",
        authorId: organiserId,
        isAutoGenerated: true,
        tournamentId: tournament._id
      });
      await newsItem.save();
      console.log("✅ News auto-generated from Tournament Update");
    } catch (newsErr) {
      console.error("Auto-news from tournament update failed:", newsErr);
    }

    return res.json({ ok: true, update });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ------------------------------------------------------------------
// ✅ POST LOG
// POST /api/tournaments/me/:id/logs
// ------------------------------------------------------------------
router.post("/me/:id/logs", requireSession, requireOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });
    const organiserId = toObjId(req.session.user.id);
    const tournament = await Tournament.findOne({ _id: toObjId(id), organiserId }).lean();
    if (!tournament) return res.status(404).json({ ok: false, message: "Tournament not found" });

    const { action, meta } = req.body;

    const log = await TournamentLog.create({
      tournamentId: toObjId(id),
      action,
      meta
    });

    return res.json({ ok: true, log });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
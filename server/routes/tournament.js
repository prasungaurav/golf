// backend/server/routes/tournament.js
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const Tournament = require("../models/Tournament");
const TournamentPlayer = require("../models/TournamentPlayer");
const { requireSession } = require("../middleware/sessionAuth");

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

    return res.json({ ok: true, tournament });
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

    const course = String(body.course || body.ground || "").trim();
    const regClosesAt = body?.registration?.regClosesAt;

    if (!body.title || !course || !body.startDate || !body.endDate || !regClosesAt) {
      return res.status(400).json({
        ok: false,
        message: "title, course, startDate, endDate, registration.regClosesAt are required",
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
      course,
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
        teamAllowed: !!body?.registration?.teamAllowed,
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

    const handicapAtJoin =
      body.handicapAtJoin === null || body.handicapAtJoin === undefined ? null : Number(body.handicapAtJoin);
    const club = String(body.club || "").trim();

    const maxPlayers = Number(reg.maxPlayers || 0);
    const waitlistEnabled = !!reg.waitlistEnabled;

    let status = "pending";
    if (maxPlayers > 0) {
      const count = await TournamentPlayer.countDocuments({
        tournamentId: toObjId(id),
        status: { $in: ["approved", "pending"] },
      });

      if (count >= maxPlayers) {
        if (!waitlistEnabled) return res.status(400).json({ ok: false, message: "Tournament is full" });
        status = "waitlist";
      }
    }

    const update = {
      tournamentId: toObjId(id),
      playerId,
      status,
      handicapAtJoin: Number.isFinite(handicapAtJoin) ? handicapAtJoin : null,
      club,
      paid: false,
      paymentRef: "",
      extrasChosen,
      notes: "",
    };

    const registration = await TournamentPlayer.findOneAndUpdate(
      { tournamentId: toObjId(id), playerId },
      { $set: update, $setOnInsert: { createdAt: new Date() } },
      { new: true, upsert: true }
    ).lean();

    return res.json({ ok: true, registration });
  } catch (err) {
    if (String(err?.code) === "11000") {
      return res.status(400).json({ ok: false, message: "Already registered" });
    }
    console.error("PLAYER REGISTER ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

router.get("/players/me", requireSession, requirePlayer, async (req, res) => {
  try {
    const playerId = toObjId(req.session.user.id);

    const items = await TournamentPlayer.find({ playerId })
      .populate("tournamentId", "title city course startDate endDate bannerUrl status visibility registration")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("GET MY TOURNAMENTS ERROR:", err);
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

    const regs = await TournamentPlayer.find({ tournamentId: toObjId(id) })
      .populate("playerId", "playerName email phone city handicap")
      .sort({ createdAt: -1 })
      .lean();

    const items = regs.map((r) => ({
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
    }));

    return res.json({ ok: true, tournament, items });
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
      const deleted = await TournamentPlayer.findOneAndDelete({ _id: toObjId(rid), tournamentId: toObjId(tid) });
      if (!deleted) return res.status(404).json({ ok: false, message: "Registration not found" });
      return res.json({ ok: true, message: "Registration removed" });
    }

    // ✅ update status
    const updated = await TournamentPlayer.findOneAndUpdate(
      { _id: toObjId(rid), tournamentId: toObjId(tid) },
      { $set: { status: next } },
      { new: true }
    )
      .populate("playerId", "playerName email phone city handicap")
      .lean();

    if (!updated) return res.status(404).json({ ok: false, message: "Registration not found" });

    // ✅ AUTO ISSUE ENTRY CODE when approved
    if (next === "approved") {
      await issueEntryForApproved(tid, rid);
    }

    // return latest record (so UI can show entryCode instantly if you want)
    const latest = await TournamentPlayer.findOne({ _id: toObjId(rid), tournamentId: toObjId(tid) })
      .populate("playerId", "plyerName email phone city handicap")
      .lean();

    return res.json({ ok: true, registration: latest || updated });
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

    const updated = await TournamentPlayer.findOneAndUpdate(
      { _id: toObjId(rid), tournamentId: toObjId(tid) },
      { $set: { paid, paymentRef } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ ok: false, message: "Registration not found" });

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

    const deleted = await TournamentPlayer.findOneAndDelete({ _id: toObjId(rid), tournamentId: toObjId(tid) });
    if (!deleted) return res.status(404).json({ ok: false, message: "Registration not found" });

    return res.json({ ok: true, message: "Registration removed" });
  } catch (err) {
    console.error("DELETE REGISTRATION ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});
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

    const updated = await TournamentPlayer.findOneAndUpdate(
      { _id: toObjId(rid), tournamentId: toObjId(tid) },
      { $set: { paid, paymentRef } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ ok: false, message: "Registration not found" });

    return res.json({ ok: true, registration: updated });
  } catch (err) {
    console.error("UPDATE PAID ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
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
    const updatableFields = ["title", "description", "status", "visibility", "bannerUrl", "course", "city", "startDate", "endDate", "teeOffWindow", "format", "rounds", "regClosesAt"];
    
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        tournament[field] = body[field];
      }
    }

    if (body.registration) {
      if (!tournament.registration) tournament.registration = {};
      const regFields = ["fee", "currency", "maxPlayers", "waitlistEnabled", "handicapMin", "handicapMax", "teamAllowed", "regClosesAt", "policyText"];
      for (const field of regFields) {
        if (body.registration[field] !== undefined) {
          tournament.registration[field] = body.registration[field];
        }
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
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });
    const organiserId = toObjId(req.session.user.id);
    
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
      title: `${type || 'Announcement'} ${title ? '- '+title : ''}`.trim(),
      message,
      pinned: !!pinned,
      authorId: organiserId
    });

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
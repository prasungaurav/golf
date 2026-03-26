const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const Otp = require("../models/Otp");
const { requireSession } = require("../middleware/sessionAuth");

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { ok: false, message: "Too many OTP requests. Try again later." },
});

function cleanPhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}
function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}
function validPhone(phone) {
  const p = cleanPhone(phone);
  return p.length >= 10 && p.length <= 13;
}
function makeOtp() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4 digit
}

/**
 * ✅ REGISTER (role based)
 */
router.post("/register", async (req, res) => {
  try {
    const body = req.body || {};
    const role = body.role;

    if (!["player", "sponsor", "organiser"].includes(role)) {
      return res.status(400).json({ ok: false, message: "Invalid role" });
    }

    const payload = { role };

    // PLAYER
    if (role === "player") {
      payload.playerName = String(body.playerName || "").trim();
      payload.handicap = body.handicap === "yes" ? "yes" : "no";
      payload.email = String(body.playerEmail || "").trim().toLowerCase();
      payload.phone = cleanPhone(body.playerPhone || "");
      const pass = String(body.playerPassword || "");
      const cpass = String(body.playerConfirmPassword || "");

      if (!payload.playerName) return res.status(400).json({ ok: false, message: "Name required" });
      if (!validEmail(payload.email)) return res.status(400).json({ ok: false, message: "Valid email required" });
      if (!validPhone(payload.phone)) return res.status(400).json({ ok: false, message: "Valid phone required" });
      if (pass.length < 6) return res.status(400).json({ ok: false, message: "Password min 6 chars" });
      if (pass !== cpass) return res.status(400).json({ ok: false, message: "Passwords do not match" });

      payload.passwordHash = await bcrypt.hash(pass, 10);
    }

    // SPONSOR
    if (role === "sponsor") {
      payload.companyName = String(body.companyName || "").trim();
      payload.industryCategory = String(body.industryCategory || "").trim();
      payload.companyWebsite = String(body.companyWebsite || "").trim();
      payload.companyAddress = String(body.companyAddress || "").trim();
      payload.email = String(body.sponsorEmail || "").trim().toLowerCase();
      payload.phone = cleanPhone(body.sponsorPhone || "");
      const pass = String(body.sponsorPassword || "");

      if (!payload.companyName) return res.status(400).json({ ok: false, message: "Company name required" });
      if (!validEmail(payload.email)) return res.status(400).json({ ok: false, message: "Valid email required" });
      if (!validPhone(payload.phone)) return res.status(400).json({ ok: false, message: "Valid phone required" });
      if (pass.length < 6) return res.status(400).json({ ok: false, message: "Password min 6 chars" });
      if (!payload.industryCategory) return res.status(400).json({ ok: false, message: "Industry required" });
      if (!payload.companyWebsite) return res.status(400).json({ ok: false, message: "Website required" });
      if (!payload.companyAddress) return res.status(400).json({ ok: false, message: "Address required" });

      payload.passwordHash = await bcrypt.hash(pass, 10);
    }

    // ORGANISER
    if (role === "organiser") {
      payload.organiserName = String(body.organiserName || "").trim();
      payload.organiserType = String(body.organiserType || "").trim();
      payload.organiserAddress = String(body.organiserAddress || "").trim();
      payload.email = String(body.organiserEmail || "").trim().toLowerCase();
      payload.phone = cleanPhone(body.organiserPhone || "");
      const pass = String(body.organiserPassword || "");
      const cpass = String(body.organiserConfirmPassword || "");

      if (!payload.organiserName) return res.status(400).json({ ok: false, message: "Organiser name required" });
      if (!["golf club", "charity", "corporate"].includes(payload.organiserType))
        return res.status(400).json({ ok: false, message: "Invalid organiser type" });
      if (!validEmail(payload.email)) return res.status(400).json({ ok: false, message: "Valid email required" });
      if (!validPhone(payload.phone)) return res.status(400).json({ ok: false, message: "Valid phone required" });
      if (!payload.organiserAddress) return res.status(400).json({ ok: false, message: "Address required" });
      if (pass.length < 6) return res.status(400).json({ ok: false, message: "Password min 6 chars" });
      if (pass !== cpass) return res.status(400).json({ ok: false, message: "Passwords do not match" });

      payload.passwordHash = await bcrypt.hash(pass, 10);
    }

    const user = await User.create(payload);

    // ✅ create session
    req.session.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.playerName || user.organiserName || user.companyName || "User",
      email: user.email,
      phone: user.phone,
    };

    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ ok: false, message: "Email/Phone already exists" });
    }
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * ✅ LOGIN: Email + Password
 */
router.post("/login-email", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!validEmail(email)) return res.status(400).json({ ok: false, message: "Valid email required" });
    if (!password || String(password).length < 6)
      return res.status(400).json({ ok: false, message: "Password min 6 chars" });

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash || "");
    if (!ok) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    if (user.status === "blocked") {
      return res.status(403).json({ ok: false, message: "Your account is blocked. Please contact admin." });
    }

    req.session.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.playerName || user.organiserName || user.companyName || "User",
      email: user.email,
      phone: user.phone,
    };

    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * ✅ OTP: Send
 */
router.post("/otp-send", otpLimiter, async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!validPhone(phone)) return res.status(400).json({ ok: false, message: "Valid phone required" });

    const p = cleanPhone(phone);

    // ✅ CHECK: Does user exist? (Login flow only)
    const user = await User.findOne({ phone: p });
    if (!user) {
      return res.status(404).json({ ok: false, message: "User does not exist with this phone number. Please register." });
    }

    const otp = makeOtp();
    const codeHash = await bcrypt.hash(otp, 10);

    // clear old OTP
    await Otp.deleteMany({ phone: p });

    const ttlMin = Number(process.env.OTP_TTL_MIN || 5);
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    await Otp.create({ phone: p, codeHash, expiresAt });

    // ✅ DEMO: print otp in server console
    console.log("✅ OTP for", p, "=", otp);

    return res.json({ ok: true, message: "OTP sent (demo in console)" });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * ✅ OTP: Verify
 */
router.post("/otp-verify", async (req, res) => {
  try {
    const { phone, otp } = req.body || {};
    if (!validPhone(phone)) return res.status(400).json({ ok: false, message: "Valid phone required" });
    if (!otp || String(otp).trim().length < 4) return res.status(400).json({ ok: false, message: "OTP required" });

    const p = cleanPhone(phone);

    const rec = await Otp.findOne({ phone: p });
    if (!rec) return res.status(400).json({ ok: false, message: "OTP expired / not found" });
    if (rec.expiresAt.getTime() < Date.now()) {
      await Otp.deleteMany({ phone: p });
      return res.status(400).json({ ok: false, message: "OTP expired" });
    }

    const ok = await bcrypt.compare(String(otp).trim(), rec.codeHash);
    if (!ok) return res.status(401).json({ ok: false, message: "Invalid OTP" });

    // find user by phone
    const user = await User.findOne({ phone: p });
    if (!user) return res.status(404).json({ ok: false, message: "No user found for this phone. Please register." });

    if (user.status === "blocked") {
      return res.status(403).json({ ok: false, message: "Your account is blocked. Please contact admin." });
    }

    // set session
    req.session.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.playerName || user.organiserName || user.companyName || "User",
      email: user.email,
      phone: user.phone,
    };

    // remove otp
    await Otp.deleteMany({ phone: p });

    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * ✅ GET current user
 */
router.get("/me", requireSession, (req, res) => {
  res.json({ ok: true, user: req.session.user });
});

/**
 * ✅ LOGOUT
 */
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("golfnow.sid");
    res.json({ ok: true, message: "Logged out" });
  });
});

module.exports = router;

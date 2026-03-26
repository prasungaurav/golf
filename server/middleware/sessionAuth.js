const User = require("../models/User");

async function requireSession(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }

  // ✅ CHECK IF USER IS BLOCKED IN DB (In case of mid-session block)
  try {
    const u = await User.findById(req.session.user.id).select("status").lean();
    if (u && u.status === "blocked") {
      // Auto logout
      req.session.destroy();
      res.clearCookie("golfnow.sid");
      return res.status(403).json({ ok: false, message: "Your account is blocked by admin." });
    }
  } catch (e) {}

  next();
}

function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ ok: false, message: "Not logged in" });
    
    // ✅ Re-check status for roles too
    try {
      const u = await User.findById(req.session.user.id).select("status").lean();
      if (u && u.status === "blocked") {
        req.session.destroy();
        res.clearCookie("golfnow.sid");
        return res.status(403).json({ ok: false, message: "Your account is blocked by admin." });
      }
    } catch (e) {}

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    next();
  };
}

module.exports = { requireSession, requireRole };

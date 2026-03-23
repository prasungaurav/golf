const express = require("express");
const router = express.Router();

// ✅ Navbar map (server controls links)
const NAV_LINKS = {
  common: [
    { label: "Home", to: "/" },
    { label: "Live", to: "/live" },
    { label: "Tournaments", to: "/tournaments" },
    { label: "News", to: "/news" },
    { label: "Rules", to: "/rules" },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Users", to: "/admin/users" },
    { label: "Manage Tournaments", to: "/admin/tournaments" },
    { label: "Reports", to: "/admin/reports" },
  ],
  player: [
    { label: "My Profile", to: "/player/profile" },
    { label: "My Matches", to: "/player/matches" },
    { label: "Stats", to: "/player/stats" },
  ],
  organiser: [
    { label: "Create Match", to: "/organiser/create" },
    { label: "Manage Events", to: "/organiser/manage" },
  ],
  sponsor: [
    { label: "Campaigns", to: "/sponsor/campaigns" },
    { label: "Analytics", to: "/sponsor/analytics" },
  ],
};

// ✅ must be logged in to set mode
function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ ok: false, msg: "Not logged in" });
  }
  next();
}

// ✅ mode sanitize (security)
function getSafeMode(req) {
  const user = req.session?.user;
  const storedMode = req.session?.mode || "common";

  if (!user) return "common";

  // allow only common OR user's role
  if (storedMode === "common") return "common";
  if (storedMode === user.role) return user.role;

  return "common";
}

// ✅ GET Navbar data (links + mode + role)
router.get("/", async (req, res) => {
  let sessionUser = req.session?.user || null;
  const User = require("../models/User");

  // Fetch true user from DB if logged in
  let user = null;
  if (sessionUser?.id) {
    user = await User.findById(sessionUser.id).select("-passwordHash").lean();
    if (user) {
      // Add a unified name property if it doesn't exist
      user.name = user.playerName || user.organiserName || user.companyName || user.name || "User";
    }
  }

  const mode = getSafeMode(req);

  const links = NAV_LINKS[mode] || NAV_LINKS.common;

  res.json({
    ok: true,
    session: !!user,
    userRole: user?.role || null,
    user,
    mode,
    links,
  });
});

// ✅ SET mode (common <-> role)
router.post("/mode", requireAuth, (req, res) => {
  const { mode } = req.body; // "common" OR role
  const role = req.session.user.role;

  if (mode !== "common" && mode !== role) {
    return res.status(400).json({ ok: false, msg: "Invalid mode" });
  }

  req.session.mode = mode;

  return res.json({
    ok: true,
    mode: getSafeMode(req),
  });
});

module.exports = router;

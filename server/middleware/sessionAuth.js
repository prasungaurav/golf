function requireSession(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ ok: false, message: "Not logged in" });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ ok: false, message: "Not logged in" });
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    next();
  };
}

module.exports = { requireSession, requireRole };

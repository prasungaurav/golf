const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { requireSession } = require("../middleware/sessionAuth");

router.get("/", requireSession, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const items = await Notification.find({ userId })
      .populate("tournamentId", "title bannerUrl")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ ok: true, notifications: items });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

router.patch("/:id/read", requireSession, async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id, userId: req.session.user.id }, { $set: { read: true } });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

router.delete("/:id", requireSession, async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, userId: req.session.user.id });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;

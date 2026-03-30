const Notification = require("../models/Notification");

async function notifyUser({ userId, type, title, message, tournamentId, matchId, metadata = {} }) {
  try {
    const notif = await Notification.create({
      userId,
      type,
      title,
      message,
      tournamentId,
      matchId,
      metadata,
    });
    return notif;
  } catch (err) {
    console.error("[NOTIF_ERROR]", err);
    return null;
  }
}

async function notifyMany(userIds, params) {
  const promises = userIds.map((uId) => notifyUser({ ...params, userId: uId }));
  return Promise.all(promises);
}

module.exports = { notifyUser, notifyMany };

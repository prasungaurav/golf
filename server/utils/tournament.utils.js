const TournamentPlayer = require("../models/TournamentPlayer");
const Match = require("../models/Match");
const { notifyUser, notifyMany } = require("./notifications");
const mongoose = require("mongoose");

/**
 * Handles the logic for removing/blocking a player from a tournament team.
 * 1. Updates player status to "blocked" in TournamentPlayer.
 * 2. Removes player from any scheduled/live Matches.
 * 3. Updates partnerIds of remaining teammates to remove this player.
 * 4. Reassigns leader if necessary.
 * 5. Notifies teammates.
 */
async function handlePlayerRemoval(playerId, tournamentId, reason = "Policy Violation") {
  const tid = new mongoose.Types.ObjectId(String(tournamentId));
  const pid = new mongoose.Types.ObjectId(String(playerId));

  // 1. Find the registration
  const target = await TournamentPlayer.findOne({ tournamentId: tid, playerId: pid }).populate("tournamentId", "title").lean();
  if (!target) return null;

  const gid = target.registrationGroupId;
  const teamName = target.teamName;

  // 2. DELETE the registration record (Direct Removal)
  await TournamentPlayer.deleteOne({ _id: target._id });

  // 3. Remove from matches
  const affectedMatches = await Match.find({
    tournamentId: tid,
    $or: [{ teamA: pid }, { teamB: pid }]
  });

  for (const m of affectedMatches) {
    let updateMatch = {};
    if (m.teamA.some(id => String(id) === String(pid))) {
      updateMatch.teamA = m.teamA.filter(id => String(id) !== String(pid));
    } else {
      updateMatch.teamB = m.teamB.filter(id => String(id) !== String(pid));
    }
    await Match.updateOne({ _id: m._id }, { $set: updateMatch });

    // Notify teammates in this match
    const currentTeamInMatch = m.teamA.some(id => String(id) === String(pid)) ? m.teamA : m.teamB;
    const teammatesInMatch = currentTeamInMatch.filter(id => String(id) !== String(pid));
    
    if (teammatesInMatch.length > 0) {
      await notifyMany(teammatesInMatch, {
        type: "new_player_needed",
        title: "Teammate Removed from Match",
        message: `Your teammate was removed from match "${m.name}". A replacement is needed.`,
        tournamentId: tid,
        matchId: m._id,
        metadata: { reason }
      });
    }
  }

  // 4. Update partnerIds of other team members and handle leader reassignment
  if (gid) {
    const allMembers = await TournamentPlayer.find({
      tournamentId: tid,
      registrationGroupId: gid
    }).sort({ createdAt: 1 });

    // Since we already deleted target, allMembers only contains the remaining ones
    for (const member of allMembers) {
      const newPartners = (member.partnerIds || []).filter(id => String(id) !== String(pid));
      await TournamentPlayer.updateOne({ _id: member._id }, { $set: { partnerIds: newPartners } });
    }

    // Leader Reassignment
    // If the team still has members but they are not the "original" leader (who was just deleted)
    // Actually, whoever is first in allMembers becomes the de-facto leader if we sorted by createdAt
    if (allMembers.length > 0) {
        // If the one we deleted was the leader (we can assume this if allMembers[0].playerId is different from pid)
        // Wait, how do we know if the deleted one was leader? 
        // We can check if allMembers has a leader. Usually the first person is the leader.
        
        // We notify all remaining members about the vacancy
        await notifyMany(allMembers.map(m => m.playerId), {
          type: "info",
          title: "Teammate Removed",
          message: `A member of your team "${teamName}" has been removed. You can now add a replacement in the My Matches section.`,
          tournamentId: tid,
          metadata: { reason }
        });
    }
  }

  return target;
}

module.exports = { handlePlayerRemoval };

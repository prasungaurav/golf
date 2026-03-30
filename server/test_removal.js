const mongoose = require("mongoose");
const TournamentPlayer = require("./models/TournamentPlayer");
const User = require("./models/User");
const Match = require("./models/Match");
const Tournament = require("./models/Tournament");
const { handlePlayerRemoval } = require("./utils/tournament.utils");

async function test() {
  try {
    await mongoose.connect("mongodb://localhost:27017/golf"); 
    console.log("Connected to DB");

    const suffix = Date.now();
    const tId = new mongoose.Types.ObjectId();
    const p1Id = new mongoose.Types.ObjectId();
    const p2Id = new mongoose.Types.ObjectId();

    console.log("Setting up test data...");
    
    await Tournament.create({
      _id: tId,
      title: "Test Tourney " + suffix,
      organiserId: new mongoose.Types.ObjectId(),
      course: "Test Course",
      startDate: new Date(),
      endDate: new Date(),
      status: "live",
      registration: {
        regClosesAt: new Date(Date.now() + 86400000)
      }
    });

    await User.create([
      { _id: p1Id, playerName: "L" + suffix, email: "l" + suffix + "@t.com", role: "player", status: "active" },
      { _id: p2Id, playerName: "T" + suffix, email: "t" + suffix + "@t.com", role: "player", status: "active" }
    ]);

    const gId = "g" + suffix;
    
    await TournamentPlayer.create([
      { tournamentId: tId, playerId: p1Id, registrationGroupId: gId, status: "approved", partnerIds: [p2Id], teamName: "Team" + suffix, entryCode: "E1" + suffix },
      { tournamentId: tId, playerId: p2Id, registrationGroupId: gId, status: "approved", partnerIds: [p1Id], teamName: "Team" + suffix, entryCode: "E2" + suffix }
    ]);

    await Match.create({
      tournamentId: tId,
      name: "M" + suffix,
      teamA: [p1Id, p2Id],
      teamB: [],
      startTime: new Date()
    });

    console.log("Setup complete.");

    console.log("\n--- Executing handlePlayerRemoval (DELETION) for P2 ---");
    await handlePlayerRemoval(p2Id, tId, "Test");

    const reg2 = await TournamentPlayer.findOne({ tournamentId: tId, playerId: p2Id });
    const reg1 = await TournamentPlayer.findOne({ tournamentId: tId, playerId: p1Id });
    const match = await Match.findOne({ tournamentId: tId });

    console.log("P2 Record (Expected: null):", reg2);
    console.log("P1 PartnerIds (Expected: []) :", JSON.stringify(reg1.partnerIds));
    console.log("Match TeamA (Expected: [P1]):", JSON.stringify(match.teamA));

    if (!reg2 && reg1.partnerIds.length === 0 && match.teamA.length === 1) {
       console.log("\nVerification Successful! ✅");
    } else {
       console.log("\nVerification Failed! ❌");
    }

  } catch (err) {
    console.error("Test Failed ❌:", err);
  } finally {
    console.log("\nCleaning up...");
    await mongoose.connection.close();
  }
}

test();

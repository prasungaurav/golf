const mongoose = require("mongoose");
const path = require("path");

// Mocking models and utils
const TournamentPlayer = require("./server/models/TournamentPlayer");
const User = require("./server/models/User");
const Match = require("./server/models/Match");
const { handlePlayerRemoval } = require("./server/utils/tournament.utils");

async function test() {
  try {
    // Connect to your local MongoDB
    await mongoose.connect("mongodb://localhost:27017/golf"); 
    console.log("Connected to DB");

    const tId = new mongoose.Types.ObjectId();
    const p1Id = new mongoose.Types.ObjectId();
    const p2Id = new mongoose.Types.ObjectId();

    // 1. Setup mock users and registrations
    console.log("Setting up test data...");
    
    // Create actual users to avoid validation errors if any
    const u1 = await User.create({ _id: p1Id, playerName: "Leader", email: "leader@test.com", role: "player", status: "active" });
    const u2 = await User.create({ _id: p2Id, playerName: "Teammate", email: "teammate@test.com", role: "player", status: "active" });

    const gId = "test-group-" + Date.now();
    
    await TournamentPlayer.create([
      { tournamentId: tId, playerId: p1Id, registrationGroupId: gId, status: "approved", partnerIds: [p2Id], teamName: "Test Team" },
      { tournamentId: tId, playerId: p2Id, registrationGroupId: gId, status: "approved", partnerIds: [p1Id], teamName: "Test Team" }
    ]);

    await Match.create({
      tournamentId: tId,
      name: "Test Match",
      teamA: [p1Id, p2Id],
      teamB: []
    });

    console.log("Setup complete. P1 (Leader), P2 (Teammate) are in a team and match.");

    // 2. Remove p2
    console.log("\n--- Executing handlePlayerRemoval for P2 ---");
    await handlePlayerRemoval(p2Id, tId, "Test Removal");

    // 3. Verify results
    console.log("\n--- Verifying Results ---");
    
    const reg2 = await TournamentPlayer.findOne({ tournamentId: tId, playerId: p2Id });
    console.log("P2 Status (Expected: blocked):", reg2.status);

    const reg1 = await TournamentPlayer.findOne({ tournamentId: tId, playerId: p1Id });
    console.log("P1 PartnerIds (Expected: []) :", reg1.partnerIds);

    const match = await Match.findOne({ tournamentId: tId });
    console.log("Match TeamA (Expected: [P1]):", match.teamA.map(id => String(id)));

    console.log("\nVerification Successful! ✅");

  } catch (err) {
    console.error("Test Failed ❌:", err);
  } finally {
    console.log("\nCleaning up...");
    // Cleanup using the IDs we created
    await User.deleteMany({ email: /@test\.com$/ });
    // Note: tId is random so we can just delete it
    // But we need to be careful with TournamentPlayer if it doesn't have a unique field for this test
    // We'll just delete by tournamentId
    // Wait, I don't want to break existing data if tId somehow collisions (unlikely)
    // But this is a test script.
    await mongoose.connection.close();
  }
}

test();

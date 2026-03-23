const mongoose = require("mongoose");
const Match = require("e:/golf/server/models/Match");
const Tournament = require("e:/golf/server/models/Tournament");

async function check() {
  try {
    await mongoose.connect("mongodb://localhost:27017/golf");
    const tournament = await Tournament.find().sort({ createdAt: -1 }).limit(1).then(t => t[0]);
    if (!tournament) {
      console.log("No tournament found");
      process.exit(0);
    }
    console.log("Latest Tournament:", tournament.title, "ID:", tournament._id);
    const matches = await Match.find({ tournamentId: tournament._id });
    console.log("Matches count:", matches.length);
    matches.forEach(m => {
      console.log(`- ${m.name} | Status: ${m.status} | Players: ${m.playerA} vs ${m.playerB}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();

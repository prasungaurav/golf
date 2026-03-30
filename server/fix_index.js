require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/golfnow";

async function run() {
  console.log("Connecting to:", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  const collection = mongoose.connection.collection("tournamentplayers");
  const indexes = await collection.indexes();
  console.log("ALL INDEXES:", JSON.stringify(indexes, null, 2));
  
  // Drop ALL unique indexes that might conflict with null
  for (const idx of indexes) {
    if (idx.unique && idx.key.entryCode) {
      console.log("Dropping UNIQUE: ", idx.name);
      await collection.dropIndex(idx.name);
    }
  }

  const total = await collection.countDocuments();
  const nullCount = await collection.countDocuments({ entryCode: null });
  const unsetCount = await collection.countDocuments({ entryCode: { $exists: false } });
  const emptyStrCount = await collection.countDocuments({ entryCode: "" });
  
  console.log(`STATS: Total=${total}, null=${nullCount}, unset=${unsetCount}, emptyStr=${emptyStrCount}`);

  // Find all unique values of entryCode for string type
  const uniqueCodes = await collection.distinct("entryCode", { entryCode: { $type: "string" } });
  console.log(`Unique String Codes Count: ${uniqueCodes.length}`);

  console.log("Creating NEW partial index...");
  try {
    await collection.createIndex(
      { tournamentId: 1, entryCode: 1 },
      { 
        unique: true, 
        sparse: true, 
        partialFilterExpression: { entryCode: { $type: "string" } },
        name: "tournamentId_1_entryCode_1"
      }
    );
    console.log("NEW index created successfully.");
  } catch (e) {
    console.error("FAILED to create index:", e);
  }

  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(console.error);

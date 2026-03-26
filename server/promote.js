const mongoose = require("mongoose");
const User = require("./models/User");
const dotenv = require("dotenv");
dotenv.config();

async function promote() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const u = await User.findOneAndUpdate(
      { email: "prasungaurav@gmail.com" },
      { $set: { role: "admin" } },
      { new: true }
    );
    console.log("Updated User:", u.email, "New Role:", u.role);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
promote();

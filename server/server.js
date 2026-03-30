const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/db");
const authRoutes = require("./common/auth.routes");
const navbarRoutes = require("./common/navbar");
const tournamentRoutes = require("./routes/tournament");
const sponsorBidRoutes = require("./routes/SponsorBid");
const organiserSponsorRoutes = require("./routes/OrganiserSponsor");

const MongoStore = require("connect-mongo").default;
const session = require("express-session");

const app = express();
app.use(express.json());

// ✅ CORS must allow cookies
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

// ✅ SESSION middleware
app.use(
  session({
    name: "golfnow.sid", // cookie name
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax", // use "none" + secure true for https
      secure: false, // true in production https
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// routes
app.use("/api/auth", authRoutes);
app.use("/api/navbar", navbarRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Server running" });
});
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/sponsor", sponsorBidRoutes);
app.use("/api/organiser", organiserSponsorRoutes);

const adminRoutes = require("./routes/admin");

app.use("/api/admin", adminRoutes);
app.use("/api/matches", require("./routes/match"));
app.use("/api/friends", require("./routes/friends"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/news", require("./routes/news"));


connectDB(process.env.MONGO_URI).then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log("✅ Server started on port", process.env.PORT || 5000);
  });
});

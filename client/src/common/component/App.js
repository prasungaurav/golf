import React from "react";
import "../style/App.css";
import { Routes, Route, useLocation } from "react-router-dom";

import Dashboard from "./Dashboard";
import Navbar from "./Navbar";
import Live from "./Live";
import Tournament from "./Tournament";

import DashboardManage from "../../admin/component/DashboardManage";
import LiveManage from "../../admin/component/LiveManage";
import TournamentManage from "../../admin/component/TournamentManage";
import AdminUserList from "../../admin/component/AdminUserList"; // New import

import OrganiserManageTournaments from "../../organizer/component/ManageTournament";
import SponsorPage from "../../sponser/component/Sponser";

import PlayerMyTournaments from "../../player/component/MyTournaments";
import PlayerEntryPass from "../../player/component/PlayerEntryPass";
import PlayerProfile from "../../player/component/PlayerProfile";

import OrganiserCheckIn from "../../organizer/component/OrganiserCheckIn";
import OrganiserProfile from "../../organizer/component/OrganiserProfile";

import SponsorProfile from "../../sponser/component/SponsorProfile";
import AdminProfile from "../../admin/component/AdminProfile";

import Blocked from "./Blocked";

function App() {
  const location = useLocation();

  // ✅ hide navbar + top ad on these pages
  const hideChrome =
    location.pathname.startsWith("/player/entry-pass") ||
    location.pathname.startsWith("/organiser/checkin") ||
    location.pathname === "/blocked";

  return (
    <div className="App">
      {/* Top thin ad */}
      {!hideChrome && (
        <div className="thinAd topAd">
          <span>Sponsored •</span>
          <span className="sponsorText">Premium Golf Gear Deals</span>
          <button className="adBtn" type="button">
            Shop Now
          </button>
        </div>
      )}

      {!hideChrome && <Navbar />}

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/live" element={<Live />} />
        <Route path="/tournaments" element={<Tournament />} />
        <Route path="/blocked" element={<Blocked />} />

        <Route path="/admin/dashboard" element={<DashboardManage />} />
        <Route path="/admin/live" element={<LiveManage />} />
        <Route path="/admin/tournaments" element={<TournamentManage />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
        <Route path="/admin/users" element={<AdminUserList />} />

        <Route path="/organiser/tournaments" element={<OrganiserManageTournaments />} />

        <Route path="/sponsor/campaigns" element={<SponsorPage />} />

        <Route path="/player/register" element={<PlayerMyTournaments />} />
        <Route path="/player/entry-pass/:tid" element={<PlayerEntryPass />} />
        <Route path="/player/profile" element={<PlayerProfile />} />

        <Route path="/organiser/checkin/:tid" element={<OrganiserCheckIn />} />
        <Route path="/organiser/profile" element={<OrganiserProfile />} />

        <Route path="/sponsor/profile" element={<SponsorProfile />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Routes>
    </div>
  );
}

export default App;
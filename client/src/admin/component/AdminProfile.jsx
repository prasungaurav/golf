import React, { useEffect, useState } from "react";
import { useAuth } from "../../common/component/AuthContext";
import "../../common/style/Profile.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AdminProfile() {
  const { user: me } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const sRes = await fetch(`${API_BASE}/api/admin/analytics`, { credentials: "include" });
      const sJson = await sRes.json();
      if (sJson.ok) setStats(sJson.data);

    } catch (e) {
      console.error(e);
      setError("Failed to load administration data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="profile-container"><div className="stat-card">Loading Master Admin View...</div></div>;

  return (
    <div className="profile-container">
      {error && <div className="orgError" style={{marginBottom: '1rem'}}>⚠ {error}</div>}

      <header className="profile-header">
        <div className="profile-avatar-large" style={{background: 'var(--primary)', color: 'white'}}>
          {me?.name?.[0] || "A"}
        </div>
        <div className="profile-info">
          <h1>{me?.name || "System Admin"}</h1>
          <p>{me?.email || "admin@golfnow.com"}</p>
          <div className="profile-badges">
            <span className="badge-item">MASTER ADMIN</span>
            <span className="badge-item">FULL SYSTEM AUTH</span>
          </div>
        </div>
      </header>

      {/* Global Stats */}
      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats?.totalPlayers || 0}</span>
          <span className="stat-label">Total Players</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.totalTournaments || 0}</span>
          <span className="stat-label">Total Tournaments</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.totalSponsorships || 0}</span>
          <span className="stat-label">Approved Sponsors</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.liveMatches || 0}</span>
          <span className="stat-label">Active Matches</span>
        </div>
      </section>

      {/* ADMIN ACTIONS QUICK LINKS */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Admin Controls</h2>
        </div>
        <div className="section-body" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
          <button className="primaryBtn" onClick={() => window.location.href='/admin/users'}>Manage Users</button>
          <button className="tOutlineBtn" onClick={() => window.location.href='/admin/dashboard'}>Dashboard Config</button>
          <button className="tOutlineBtn" onClick={() => window.location.href='/admin/tournaments'}>Manage Tournaments</button>
          <button className="tOutlineBtn" onClick={() => window.location.href='/admin/live'}>Live Match Control</button>
        </div>
      </section>
    </div>
  );
}

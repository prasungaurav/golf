import React, { useEffect, useState } from "react";
import { useAuth } from "../../common/component/AuthContext";
import "../../common/style/Profile.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";


export default function OrganiserProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [error, setError] = useState("");

  const fetchOrgData = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/api/tournaments/me`, { credentials: "include" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Failed to fetch tournaments");

      setTournaments(data.tournaments || []);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, []);

  const stats = {
    totalTournaments: tournaments.length,
    activeTournaments: tournaments.filter(t => {
      const now = new Date();
      return new Date(t.startDate) <= now && new Date(t.endDate) >= now;
    }).length,
    totalPlayers: tournaments.reduce((acc, t) => acc + (t.stats?.playersCount || 0), 0),
    totalMatches: tournaments.reduce((acc, t) => acc + (t.stats?.matchesCount || 0), 0)
  };

  if (loading) return <div className="profile-container"><div className="stat-card">Loading Profile...</div></div>;

  function fmtMoney(n) {
    return "₹" + Number(n || 0).toLocaleString("en-IN");
  }

  return (
    <div className="profile-container">
      {/* Error Message */}
      {error && <div className="orgError" style={{ marginBottom: '1rem' }}>⚠ {error}</div>}

      {/* Basic Info Header */}
      <header className="profile-header">
        <div className="profile-avatar-large">
          {user?.name?.[0] || user?.organiserName?.[0] || "O"}
        </div>
        <div className="profile-info">
          <h1>{user?.name || user?.organiserName || "Organiser Name"}</h1>
          <p>{user?.email || user?.organiserEmail || "organiser@example.com"}</p>
          <div className="profile-badges">
            <span className="badge-item">Role: Organiser</span>
            <span className="badge-item">Verified Partner</span>
          </div>
        </div>
      </header>

      {/* Dashboard Stats */}
      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.totalTournaments}</span>
          <span className="stat-label">Total Tournaments</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.activeTournaments}</span>
          <span className="stat-label">Active Now</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalPlayers}</span>
          <span className="stat-label">Total Players</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalMatches}</span>
          <span className="stat-label">Total Matches</span>
        </div>
      </section>

      {/* Tournament Management */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Tournament Management</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="ghostBtn" style={{ width: 'auto', marginTop: 0 }} onClick={() => window.location.href = '/organiser/tournaments'}>View All</button>
            <button className="primaryBtn" onClick={() => window.location.href = '/organiser/tournaments?action=new'}>Create New</button>
          </div>
        </div>
        <div className="section-body">
          <table className="profile-table">
            <thead>
              <tr>
                <th>Tournament</th>
                <th>Status</th>
                <th>Players</th>
                <th>Revenue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.slice(0, 5).map(t => (
                <tr key={t._id}>
                  <td><strong>{t.title}</strong></td>
                  <td><span className={`status-pill ${t.status?.toLowerCase()}`}>{t.status || 'Draft'}</span></td>
                  <td>{t.stats?.playersCount || 0} / {t.registration?.maxPlayers || '—'}</td>
                  <td>{fmtMoney(t.totalRevenue || 0)}</td>
                  <td><button className="smallBtn" onClick={() => window.location.href = `/organiser/tournaments?tid=${t._id}`}>Manage</button></td>
                </tr>
              ))}
              {tournaments.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--on_surface_variant)' }}>No tournaments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="profile-sections-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Player Management Queue */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Player Approvals</h2>
          </div>
          <div className="section-body">
            <div className="list">
              <div className="muted" style={{ padding: '1rem', textAlign: 'center' }}>
                To approve players, please select a tournament from the Management table above.
              </div>
            </div>
          </div>
        </section>

        {/* Sponsor Requests */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Sponsor Requests</h2>
          </div>
          <div className="section-body">
            <div className="list">
              <div className="muted" style={{ padding: '1rem', textAlign: 'center' }}>
                To review sponsorship bids, please select a tournament from the Management table.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

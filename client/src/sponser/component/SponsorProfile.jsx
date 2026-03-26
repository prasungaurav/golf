import React, { useEffect, useState } from "react";
import { useAuth } from "../../common/component/AuthContext";
import "../../common/style/Profile.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";


export default function SponsorProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState([]);
  const [error, setError] = useState("");

  const fetchSponsorData = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/api/sponsor/bids`, { credentials: "include" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data?.message || "Failed to fetch bids");
      
      setBids(data.bids || []);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsorData();
  }, []);

  const stats = {
    totalInvested: bids.filter(b => b.status === 'approved' || b.status === 'accepted' || b.status === 'won')
      .reduce((acc, b) => acc + Number(b.amount || 0), 0),
    activeSponsorships: bids.filter(b => b.status === 'approved' || b.status === 'accepted' || b.status === 'won').length,
    totalEngagement: "—", // Backend might not have this yet
    avgRoi: "—"
  };

  if (loading) return <div className="profile-container"><div className="stat-card">Loading Profile...</div></div>;

  function fmtMoney(n) {
    return "₹" + Number(n || 0).toLocaleString("en-IN");
  }

  return (
    <div className="profile-container">
      {/* Error Message */}
      {error && <div className="orgError" style={{marginBottom: '1rem'}}>⚠ {error}</div>}

      {/* Basic Info Header */}
      <header className="profile-header">
        <div className="profile-avatar-large">
          {user?.name?.[0] || user?.companyName?.[0] || "S"}
        </div>
        <div className="profile-info">
          <h1>{user?.name || user?.companyName || "Sponsor Name"}</h1>
          <p>{user?.email || user?.sponsorEmail || "sponsor@example.com"}</p>
          <div className="profile-badges">
            <span className="badge-item">Role: Sponsor</span>
            <span className="badge-item">Gold Tier Partner</span>
          </div>
        </div>
      </header>

      {/* Dashboard Stats */}
      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{fmtMoney(stats.totalInvested)}</span>
          <span className="stat-label">Total Investment</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.activeSponsorships}</span>
          <span className="stat-label">Active Sponsorships</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalEngagement}</span>
          <span className="stat-label">Total Engagement</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.avgRoi}</span>
          <span className="stat-label">Avg ROI</span>
        </div>
      </section>

      {/* Sponsored Events */}
      <section className="profile-section">
        <div className="section-header">
          <h2>My Sponsorships & Bids</h2>
          <button className="primaryBtn" onClick={() => window.location.href='/sponsor/campaigns'}>Browse Tournaments</button>
        </div>
        <div className="section-body">
          <table className="profile-table">
            <thead>
              <tr>
                <th>Tournament</th>
                <th>Slot Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bids.map(b => (
                <tr key={b._id}>
                  <td><strong>{b.tournamentId?.title || "Tournament"}</strong></td>
                  <td>{(b.slotType || "—").toUpperCase()}</td>
                  <td>{fmtMoney(b.amount)}</td>
                  <td><span className={`status-pill ${(b.status || 'pending').toLowerCase()}`}>{b.status}</span></td>
                </tr>
              ))}
              {bids.length === 0 && (
                <tr><td colSpan="4" style={{textAlign: 'center', color: 'var(--on_surface_variant)'}}>No sponsorships or bids found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Analytics Insight */}
      <section className="profile-section">
        <div className="section-header">
          <h2>Analytics & ROI Insights</h2>
        </div>
        <div className="section-body" style={{textAlign: 'center', padding: '3rem'}}>
          <div style={{color: 'var(--on_surface_variant)', fontSize: '1.2rem', marginBottom: '1rem'}}>
            Visual Analytics Dashboard Coming Soon
          </div>
          <div className="muted">
            Track real-time brand exposure and engagement metrics across all sponsored events.
          </div>
        </div>
      </section>
    </div>
  );
}

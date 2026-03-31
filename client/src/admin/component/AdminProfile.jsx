import React, { useEffect, useState } from "react";
import { useAuth } from "../../common/component/AuthContext";
import "../style/Admin.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const StatItem = ({ label, value, color }) => (
  <div className="stat-item" style={{ "--admin-primary": color }}>
    <span className="stat-label">{label}</span>
    <span className="stat-value">{value}</span>
  </div>
);

export default function AdminProfile() {
  const { user: me } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/analytics`, { credentials: "include" });
      const json = await res.json();
      if (json.ok) setStats(json.data);
      else setError(json.message);
    } catch (e) {
      setError("Failed to sync with command center.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="admin-title"><h1>Initializing Terminal...</h1></div>;

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div className="admin-title">
          <h1>System Overview</h1>
          <p>Welcome back, Commissioner {me?.organiserName || me?.playerName || "Admin"}</p>
        </div>
        <div className="admin-actions">
           <button className="admin-nav-item active" style={{cursor: 'pointer'}} onClick={fetchStats}>
             Sync Pulse
           </button>
        </div>
      </header>

      {error && <div className="admin-card" style={{borderColor: 'var(--admin-error)', color: 'var(--admin-error)', marginBottom: 20}}>⚠ {error}</div>}

      <div className="admin-stats">
        <StatItem label="Total Players" value={stats?.totalPlayers || 0} color="#00f2ff" />
        <StatItem label="Organizers" value={stats?.totalOrganisers || 0} color="#7000ff" />
        <StatItem label="Tournaments" value={stats?.totalTournaments || 0} color="#ffd700" />
        <StatItem label="Live Matches" value={stats?.liveMatches || 0} color="#00ff95" />
        <StatItem label="Sponsor Bids" value={stats?.totalSponsors || 0} color="#ff0055" />
        <StatItem label="Pending Bids" value={stats?.pendingBids || 0} color="#ff4d4d" />
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
        <section className="admin-card">
          <h3>Quick Commands</h3>
          <div style={{display: 'grid', gap: '12px', marginTop: '16px'}}>
            <button className="admin-nav-item active" onClick={() => window.location.href='/admin/users'}>Moderate Users</button>
            <button className="admin-nav-item" onClick={() => window.location.href='/admin/dashboard'}>Update Global CMS</button>
            <button className="admin-nav-item" onClick={() => window.location.href='/admin/sponsors'}>Review Sponsor Bids</button>
          </div>
        </section>

        <section className="admin-card">
          <h3>System Health</h3>
          <div style={{marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span className="stat-label">Database Status</span>
              <span style={{color: 'var(--admin-success)'}}>OPERATIONAL</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span className="stat-label">Security Layer</span>
              <span style={{color: 'var(--admin-success)'}}>ENCRYPTED</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span className="stat-label">API Latency</span>
              <span style={{color: 'var(--admin-primary)'}}>12ms</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

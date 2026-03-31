import React, { useEffect, useState } from "react";
import "../style/Admin.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AdminSponsorControl() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBids();
  }, []);

  const fetchBids = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/sponsors/bids`, { credentials: "include" });
      const json = await res.json();
      if (json.ok) setBids(json.bids);
      else setError(json.message);
    } catch (e) {
      setError("Failed to fetch global sponsor pulse.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (bidId, action) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/bids/${bidId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
        credentials: "include"
      });
      const json = await res.json();
      if (json.ok) {
        setBids(prev => prev.map(b => b._id === bidId ? { ...b, status: action } : b));
      } else {
        alert(json.message);
      }
    } catch (e) {
      alert("Error executing command.");
    }
  };

  if (loading) return <div className="admin-title"><h1>Scanning Sponsor Markets...</h1></div>;

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div className="admin-title">
          <h1>Sponsor Bids</h1>
          <p>Global oversight of all sponsorship activities and financial bids</p>
        </div>
      </header>

      {error && <div className="admin-card" style={{color: 'var(--admin-error)'}}>{error}</div>}

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Tournament</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{textAlign: 'right'}}>Verification</th>
              </tr>
            </thead>
            <tbody>
              {bids.map(b => (
                <tr key={b._id}>
                  <td>
                    <div style={{fontWeight: 700}}>{b.sponsorId?.companyName || "Unknown Brand"}</div>
                    <div className="stat-label" style={{fontSize: '0.65rem'}}>{b.sponsorId?.email}</div>
                  </td>
                  <td>{b.tournamentId?.title || "Deleted Tournament"}</td>
                  <td style={{color: 'var(--admin-gold)', fontWeight: 700}}>${b.amount || 0}</td>
                  <td>
                    <span className={`status-badge ${b.status}`}>
                      {b.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{textAlign: 'right'}}>
                    {b.status === 'pending' ? (
                      <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
                        <button className="status-badge active" style={{border: 'none', cursor: 'pointer'}} onClick={() => handleAction(b._id, 'accepted')}>APPROVE</button>
                        <button className="status-badge blocked" style={{border: 'none', cursor: 'pointer'}} onClick={() => handleAction(b._id, 'rejected')}>REJECT</button>
                      </div>
                    ) : (
                      <span className="stat-label">FINALIZED</span>
                    )}
                  </td>
                </tr>
              ))}
              {bids.length === 0 && (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '40px'}}>No bids detected in the current cycle.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

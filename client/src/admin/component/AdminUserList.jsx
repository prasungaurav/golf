import React, { useEffect, useState } from "react";
import "../../common/style/Profile.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AdminUserList() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/admin/users`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) setUsers(data.users || []);
      else setError(data.message || "Failed to fetch users");
    } catch (e) {
      console.error(e);
      setError("Failed to load user directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleBlock = async (user) => {
    try {
      setProcessingId(user._id);
      const nextStatus = user.status === "blocked" ? "active" : "blocked";
      
      const res = await fetch(`${API_BASE}/api/admin/users/${user._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Operation failed");

      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, status: nextStatus } : u));
    } catch (e) {
      alert(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    const name = (u.playerName || u.organiserName || u.companyName || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const role = (u.role || "").toLowerCase();
    return name.includes(term) || email.includes(term) || role.includes(term);
  });

  if (loading) return <div className="profile-container"><div className="stat-card">Loading User Directory...</div></div>;

  return (
    <div className="profile-container">
      {error && <div className="orgError" style={{marginBottom: '1rem'}}>⚠ {error}</div>}

      <header className="profile-header" style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 'auto', padding: '1rem 2rem'}}>
        <div>
          <h1 style={{margin: 0}}>User Management</h1>
          <p className="muted" style={{margin: 0}}>Manage all platform accounts & access</p>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
           <div className="search-wrap" style={{position: 'relative'}}>
              <input 
                type="text" 
                placeholder="Search by name, email, or role..." 
                className="dmInput"
                style={{width: '300px', padding: '10px 15px', borderRadius: '10px', background: 'var(--surface_container_high)', border: '1px solid var(--outline_variant)'}}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        </div>
      </header>

      <section className="profile-section">
        <div className="section-header">
          <h2>Master User Directory</h2>
          <span className="muted">{filteredUsers.length} results of {users.length} total</span>
        </div>
        <div className="section-body">
          <table className="profile-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{textAlign: 'right'}}>Control</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id} style={{opacity: u.status === 'blocked' ? 0.6 : 1}}>
                  <td>
                    <div style={{fontWeight: 700}}>{u.playerName || u.organiserName || u.companyName || "No Name"}</div>
                    <div className="tiny muted">{u.email} • {u.phone}</div>
                  </td>
                  <td><span className="badge-item" style={{fontSize: '0.65rem'}}>{u.role?.toUpperCase()}</span></td>
                  <td>
                    <span className={`status-pill ${u.status === 'blocked' ? 'error' : 'ok'}`} style={{
                      background: u.status === 'blocked' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                      color: u.status === 'blocked' ? '#ef4444' : '#34d399',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      {u.status?.toUpperCase() || "ACTIVE"}
                    </span>
                  </td>
                  <td style={{textAlign: 'right'}}>
                    <button 
                      className={u.status === 'blocked' ? "primaryBtn" : "tOutlineBtn"}
                      disabled={processingId === u._id || u.role === 'admin'}
                      style={{
                        padding: '6px 12px', 
                        fontSize: '0.7rem',
                        background: u.status === 'blocked' ? 'var(--secondary_container)' : 'transparent',
                        color: u.status === 'blocked' ? 'var(--on_secondary_container)' : 'var(--error)'
                      }}
                      onClick={() => handleToggleBlock(u)}
                    >
                      {processingId === u._id ? "..." : u.status === "blocked" ? "ACTIVATE USER" : "BLOCK USER"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan="4" style={{textAlign: 'center', padding: '2rem'}}>No users matching "{search}"</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

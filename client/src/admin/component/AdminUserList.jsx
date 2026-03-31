import React, { useEffect, useState } from "react";
import "../style/Admin.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ROLES = [
  { id: "all", label: "All Users" },
  { id: "player", label: "Players" },
  { id: "organiser", label: "Organisers" },
  { id: "sponsor", label: "Sponsors" },
];

export default function AdminUserList() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [processingId, setProcessingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      // Using the new role filter on backend if tab is not "all"
      const url = activeTab === "all" ? `${API_BASE}/api/admin/users` : `${API_BASE}/api/admin/users?role=${activeTab}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.ok) setUsers(data.users || []);
      else setError(data.message);
    } catch (e) {
      setError("Communication failure with user directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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
    const name = (u.playerName || u.organiserName || u.companyName || u.email || "").toLowerCase();
    return name.includes(term);
  });

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div className="admin-title">
          <h1>User Management</h1>
          <p>Monitor and moderate platform access across all roles</p>
        </div>
        <div className="admin-actions">
           <input 
            type="text" 
            placeholder="Filter by name or email..." 
            className="dmInput" 
            style={{width: 280, background: 'var(--admin-surface-high)', border: '1px solid var(--admin-border)'}}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </header>

      <div className="admin-tabs">
        {ROLES.map(r => (
          <div 
            key={r.id} 
            className={`tab-item ${activeTab === r.id ? 'active' : ''}`}
            onClick={() => setActiveTab(r.id)}
          >
            {r.label}
          </div>
        ))}
      </div>

      <div className="admin-card">
        {loading ? (
          <div style={{padding: '40px', textAlign: 'center'}}>Syncing Directory...</div>
        ) : error ? (
          <div style={{color: 'var(--admin-error)'}}>{error}</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Classification</th>
                  <th>Status</th>
                  <th style={{textAlign: 'right'}}>Control Pulse</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u._id} style={{opacity: u.status === 'blocked' ? 0.6 : 1}}>
                    <td>
                      <div style={{fontWeight: 700, fontSize: '0.95rem'}}>{u.playerName || u.organiserName || u.companyName || "Unknown Unit"}</div>
                      <div className="stat-label" style={{fontSize: '0.7rem'}}>{u.email}</div>
                    </td>
                    <td>
                      <span style={{color: 'var(--admin-primary)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase'}}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.status || 'active'}`}>
                        {u.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{textAlign: 'right'}}>
                      <button 
                        className="admin-nav-item"
                        disabled={processingId === u._id || u.role === 'admin'}
                        style={{
                          fontSize: '0.7rem', 
                          padding: '6px 12px',
                          display: 'inline-flex',
                          borderColor: u.status === 'blocked' ? 'var(--admin-success)' : 'var(--admin-error)',
                          color: u.status === 'blocked' ? 'var(--admin-success)' : 'var(--admin-error)'
                        }}
                        onClick={() => handleToggleBlock(u)}
                      >
                        {processingId === u._id ? "..." : u.status === "blocked" ? "ACTIVATE" : "TERMINATE ACCESS"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '40px'}}>No records found in this sector.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useAuth } from "../../common/component/AuthContext";
import { useParams, Link } from "react-router-dom";
import "../../common/style/Profile.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function PlayerProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const isOwnProfile = !id || (currentUser && id === currentUser._id);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState("tournaments"); // tournaments, match_history, friends
  const [globalRank, setGlobalRank] = useState(null);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      setError("");

      if (isOwnProfile) {
        setProfileUser(currentUser);
        const [regRes, friendRes, reqRes, rankRes] = await Promise.all([
          fetch(`${API_BASE}/api/tournaments/players/me`, { credentials: "include" }),
          fetch(`${API_BASE}/api/friends/list`, { credentials: "include" }),
          fetch(`${API_BASE}/api/friends/requests`, { credentials: "include" }),
          fetch(`${API_BASE}/api/matches/me/rank`, { credentials: "include" })
        ]);

        const regData = await regRes.json();
        const friendData = await friendRes.json();
        const reqData = await reqRes.json();
        const rankData = await rankRes.json();

        if (!regRes.ok) throw new Error(regData?.message || "Failed to fetch tournaments");
        
        setItems(regData.items || []);
        setFriends(friendData.friends || []);
        setRequests({ incoming: reqData.incoming || [], outgoing: reqData.outgoing || [] });
        if (rankData.ok) setGlobalRank(rankData.rank);
      } else {
        // Public profile
        const res = await fetch(`${API_BASE}/api/matches/profile/${id}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch profile");
        
        setProfileUser(data.user);
        setGlobalRank(data.rank);
        setItems(data.items || []);
        setFriends([]); // Hide for public
        setRequests({ incoming: [], outgoing: [] });
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/friends/search?q=${q}`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) setSearchResults(data.players || []);
    } catch (e) {
      console.error("Search error:", e);
    }
  };

  const handleFriendAction = async (endpoint, body) => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Action failed");
      await fetchPlayerData(); // Refresh all
      if (endpoint === "invite") handleSearch(searchQuery); // Refresh search results to show pending
    } catch (e) {
      alert(e.message);
    }
  };

  useEffect(() => {
    fetchPlayerData();
  }, []);

  const stats = {
    totalMatches: items.length,
    wins: profileUser?.wins || 0,
    losses: profileUser?.losses || 0,
    avgScore: items.filter(x => x.score).reduce((acc, x, i, arr) => acc + Number(x.score) / arr.length, 0).toFixed(1) || "—",
    bestScore: Math.min(...items.filter(x => x.score).map(x => Number(x.score))) || "—",
    ranking: globalRank ? `#${globalRank}` : "#—",
    handicap: profileUser?.handicap || "—",
    friendsCount: friends.length
  };

  // Safe formatting for display
  if (stats.bestScore === Infinity) stats.bestScore = "—";
  if (stats.avgScore === "0.0") stats.avgScore = "—";

  if (loading) return <div className="profile-container"><div className="stat-card">Loading Profile...</div></div>;

  function fmtDMY(v) {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  }

  return (
    <div className="profile-container">
      {/* Error Message */}
      {error && <div className="orgError" style={{marginBottom: '1rem'}}>⚠ {error}</div>}

      {/* Basic Info Header */}
      <header className="profile-header">
        <div className="profile-avatar-large">
          {(profileUser?.playerName || profileUser?.name || "P")[0].toUpperCase()}
        </div>
        <div className="profile-info">
          <h1>{profileUser?.playerName || profileUser?.name || "Player Name"}</h1>
          <p>{isOwnProfile ? (profileUser?.email || "player@example.com") : "Verified Player"}</p>
          <div className="profile-badges">
            <span className="badge-item">Handicap: {stats.handicap}</span>
            <span className="badge-item">Rank: {stats.ranking}</span>
            {isOwnProfile && <span className="badge-item">Friends: {stats.friendsCount}</span>}
          </div>
        </div>
      </header>

      {/* Stats Dashboard */}
      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.totalMatches}</span>
          <span className="stat-label">Total Matches</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.wins}/{stats.losses}</span>
          <span className="stat-label">Wins / Losses</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.avgScore}</span>
          <span className="stat-label">Avg Score</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.friendsCount}</span>
          <span className="stat-label">Friends</span>
        </div>
      </section>

      {/* TABS Navigation */}
      <div className="profile-tabs" style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--outline_variant)', marginBottom: 20 }}>
        <button 
          className={`tab-item ${activeTab === 'tournaments' ? 'active' : ''}`} 
          onClick={() => setActiveTab('tournaments')}
          style={{ padding: '10px 0', borderBottom: activeTab === 'tournaments' ? '2px solid var(--primary)' : 'none', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', color: activeTab === 'tournaments' ? 'var(--primary)' : 'var(--on_surface_variant)', cursor: 'pointer', fontWeight: 600 }}
        >
          Tournaments
        </button>
        {isOwnProfile && (
          <button 
            className={`tab-item ${activeTab === 'friends' ? 'active' : ''}`} 
            onClick={() => setActiveTab('friends')}
            style={{ padding: '10px 0', borderBottom: activeTab === 'friends' ? '2px solid var(--primary)' : 'none', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', color: activeTab === 'friends' ? 'var(--primary)' : 'var(--on_surface_variant)', cursor: 'pointer', fontWeight: 600 }}
          >
            Friends ({stats.friendsCount})
            {requests.incoming.length > 0 && <span style={{ marginLeft: 6, background: 'var(--primary)', color: 'white', padding: '0 6px', borderRadius: 10, fontSize: 10 }}>{requests.incoming.length}</span>}
          </button>
        )}
        <button 
          className={`tab-item ${activeTab === 'match_history' ? 'active' : ''}`} 
          onClick={() => setActiveTab('match_history')}
          style={{ padding: '10px 0', borderBottom: activeTab === 'match_history' ? '2px solid var(--primary)' : 'none', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', color: activeTab === 'match_history' ? 'var(--primary)' : 'var(--on_surface_variant)', cursor: 'pointer', fontWeight: 600 }}
        >
          Match History
        </button>
      </div>

      {/* Tournaments View */}
      {activeTab === 'tournaments' && (
        <section className="profile-section">
          <div className="section-header">
            <h2>Active & Upcoming Tournaments</h2>
            <button className="primaryBtn" onClick={() => window.location.href='/tournaments'}>Join New Tournament</button>
          </div>
          <div className="section-body">
            <table className="profile-table">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Date</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.filter(x => x.status !== 'completed' && x.status !== 'finished').map(x => {
                  const t = x.tournamentId || {};
                  return (
                    <tr key={x._id}>
                      <td><strong>{t.title || "Tournament"}</strong></td>
                      <td>{fmtDMY(t.startDate)}</td>
                      <td>{t.course || "—"}</td>
                      <td><span className={`status-pill ${(x.status || 'pending').toLowerCase()}`}>{x.status}</span></td>
                      <td>
                        {isOwnProfile ? (
                          <button className="smallBtn" style={{color: 'var(--on_surface_variant)'}}>Withdraw</button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.filter(x => x.status !== 'completed' && x.status !== 'finished').length === 0 && (
                  <tr><td colSpan="5" style={{textAlign: 'center', color: 'var(--on_surface_variant)'}}>No active tournaments.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Friends View */}
      {activeTab === 'friends' && (
        <section className="profile-section">
          <div className="section-header" style={{ marginBottom: 20 }}>
            <h2>Friends Management</h2>
            <div className="search-box" style={{ width: 300 }}>
              <input 
                placeholder="Search players to invite..." 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--outline_variant)' }}
              />
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results" style={{ marginBottom: 30, background: 'rgba(var(--primary-rgb), 0.05)', padding: 15, borderRadius: 12 }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 10 }}>Found Players</h3>
              <div className="friend-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {searchResults.map(p => (
                  <div key={p._id} className="friend-card" style={{ background: 'var(--surface)', padding: 12, borderRadius: 8, border: '1px solid var(--outline_variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.playerName}</div>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>{p.email}</div>
                    </div>
                    {p.friendshipStatus === "none" ? (
                      <button className="btn small primary" onClick={() => handleFriendAction("invite", { recipientId: p._id })}>Add</button>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.7rem' }}>{p.friendshipStatus}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
            {/* Friend Requests (Incoming) */}
            <div>
              <h3 style={{ marginBottom: 15 }}>Incoming Requests</h3>
              {requests.incoming.length === 0 ? <p className="muted">No pending requests.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {requests.incoming.map(r => (
                    <div key={r._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid var(--outline_variant)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                         <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{r.requesterId.playerName?.[0]}</div>
                         <div>
                           <div style={{ fontWeight: 600 }}>{r.requesterId.playerName}</div>
                           <div className="muted" style={{ fontSize: '0.7rem' }}>{r.requesterId.email}</div>
                         </div>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn small primary" onClick={() => handleFriendAction("respond", { friendshipId: r._id, action: "accept" })}>Accept</button>
                        <button className="btn small ghost" onClick={() => handleFriendAction("respond", { friendshipId: r._id, action: "reject" })}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Friends List */}
            <div>
              <h3 style={{ marginBottom: 15 }}>My Friends</h3>
              {friends.length === 0 ? <p className="muted">You haven't added any friends yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {friends.map(f => (
                    <div key={f._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid var(--outline_variant)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                         <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(var(--primary-rgb), 0.2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{f.playerName?.[0]}</div>
                         <div>
                           <div style={{ fontWeight: 600 }}>{f.playerName}</div>
                           <div className="muted" style={{ fontSize: '0.7rem' }}>{f.email}</div>
                         </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>FRIEND</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Match History View */}
      {activeTab === 'match_history' && (
        <section className="profile-section">
          <div className="section-header">
            <h2>Match History</h2>
            <button className="ghostBtn" style={{width: 'auto', marginTop: 0}}>View All</button>
          </div>
          <div className="section-body">
            <table className="profile-table">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {items.filter(x => x.status === 'completed' || x.status === 'finished').map(x => {
                  const t = x.tournamentId || {};
                  return (
                    <tr key={x._id}>
                      <td><strong>{t.title || "Tournament"}</strong></td>
                      <td>{fmtDMY(t.startDate)}</td>
                      <td>{x.score || "—"}</td>
                      <td><span style={{color: x.result === 'Won' ? 'var(--primary)' : 'inherit'}}>{x.result || "—"}</span></td>
                    </tr>
                  );
                })}
                {items.filter(x => x.status === 'completed' || x.status === 'finished').length === 0 && (
                  <tr><td colSpan="4" style={{textAlign: 'center', color: 'var(--on_surface_variant)'}}>No match history available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

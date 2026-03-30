import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/style/MyTournaments.css";
import { useAuth } from "../../common/component/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

function fmtDMY(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const statusClass = (s) => `match-status-badge status-${String(s || "pending").toLowerCase()}`;

export default function PlayerMyTournaments() {
  const nav = useNavigate();
  const { user: me } = useAuth();

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Replacement state
  const [showModal, setShowModal] = useState(false);
  const [selectedTid, setSelectedTid] = useState(null);
  const [friends, setFriends] = useState([]);
  const [replacing, setReplacing] = useState(false);

  const fetchItems = async () => {
    try {
      setErr("");
      setLoading(true);
      const data = await api("/api/tournaments/players/me", { method: "GET" });
      setItems(data.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const data = await api("/api/friends/list");
      setFriends(data.friends || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReplace = async (tid, newPlayerId) => {
    if (!window.confirm("Are you sure you want to add this player to your team?")) return;
    try {
      setReplacing(true);
      await api(`/api/tournaments/players/me/${tid}/replace`, {
        method: "POST",
        body: JSON.stringify({ newPlayerId })
      });
      alert("Teammate added successfully! ✅");
      setShowModal(false);
      fetchItems();
    } catch (e) {
      alert(e.message);
    } finally {
      setReplacing(false);
    }
  };

  const handleInviteRespond = async (tid, action) => {
    const msg = action === "accept" ? "Accept this invitation?" : "Reject this invitation?";
    if (!window.confirm(msg)) return;
    try {
      setLoading(true);
      await api(`/api/tournaments/players/me/${tid}/invite-respond`, {
        method: "POST",
        body: JSON.stringify({ action })
      });
      alert(`Invitation ${action}ed successfully! ✅`);
      fetchItems();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-matches-container">
      <div className="my-matches-header">
        <h2 style={{ margin: 0 }}>My Joined Tournaments</h2>
        <button className="btn" onClick={fetchItems}>Refresh</button>
      </div>

      {err && <div className="orgError" style={{ marginBottom: 20 }}>⚠ {err}</div>}

      {loading && items.length === 0 && <div className="card">Loading your matches...</div>}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No matches yet.</h3>
          <p className="muted">You haven't joined any tournaments. Go to the tournaments page to find some!</p>
          <button className="btn primary" onClick={() => nav("/tournaments")}>Explore Tournaments</button>
        </div>
      )}

      <div className="matches-list">
        {items.map((x) => {
          const t = x.tournamentId || {};
          const tid = t._id || t.id;
          const team = x.team || [];
          const isLeader = team.length > 0 && String(team[0].playerId?._id || team[0].playerId) === String(me?.id);
          const teamSize = t.registration?.teamSize || 1;
          const vacancies = teamSize - team.length;

          return (
            <div className="match-card" key={x._id}>
              <div className="match-card-content">
                <div className="match-main-info">
                  <div className="match-details-basic">
                    <h3 className="match-title">{t.title || "Unknown Tournament"}</h3>
                    <div className="match-meta-info">
                      <span className="meta-item">
                        <i className="material-icons">location_on</i>
                        {t.city} • {t.course}
                      </span>
                      <span className="meta-item">
                        <i className="material-icons">event</i>
                        {fmtDMY(t.startDate)} - {fmtDMY(t.endDate)}
                      </span>
                      <span className="meta-item">
                        <i className="material-icons">emoji_events</i>
                        {t.format || "Stroke Play"}
                      </span>
                    </div>
                  </div>
                  <div className="match-badge-wrap">
                    <span className={statusClass(x.status)}>
                      {x.status || "pending"}
                    </span>
                  </div>
                </div>

                <div className="teammates-section">
                  <div className="teammates-title">Team Structure ({team.length}/{Number(t.registration?.teamSize || 1)})</div>
                  <div className="teammates-grid">
                    {Array.from({ length: Number(t.registration?.teamSize || 1) }).map((_, idx) => {
                      const m = team[idx];
                      if (m) {
                        const p = m.playerId || {};
                        const isMe = me && String(p._id) === String(me.id);
                        return (
                          <div key={m._id || `slot-${idx}`} className={`teammate-item ${idx === 0 ? "leader" : ""}`}>
                            <div className="teammate-avatar">
                              {p.playerName?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className="teammate-info">
                              <div className="teammate-name">{p.playerName || "Player"} {isMe ? "(Me)" : ""}</div>
                              <div className="teammate-sub">{idx === 0 ? "Leader" : "Member"}</div>
                            </div>
                          </div>
                        );
                      } else {
                        // Vacant slot - simple add button
                        return (
                          <div
                            key={`vacant-${tid}-${idx}`}
                            className="teammate-item replacement-slot"
                            onClick={() => {
                              if (isLeader) {
                                setSelectedTid(tid);
                                setShowModal(true);
                              } else {
                                alert("Only the team leader can add teammates.");
                              }
                            }}
                            title={isLeader ? "Click to add teammate" : "Waiting for leader to add teammate"}
                          >
                            <div className="teammate-avatar vacant">
                              <i className="material-icons">add</i>
                            </div>
                            <div className="teammate-info">
                              <div className="teammate-name">Add Teammate</div>
                              <div className="teammate-sub">Empty Slot</div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>

                <div className="action-row">
                  <button className="ghostBtn" onClick={() => nav(`/tournaments?tid=${tid}`)}>Tournament Details</button>
                  {x.status === "invitation_pending" && (
                    <>
                      <button className="btn outline" style={{ borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => handleInviteRespond(tid, "reject")}>Reject</button>
                      <button className="btn primary" onClick={() => handleInviteRespond(tid, "accept")}>Accept Invite</button>
                    </>
                  )}
                  {x.status === "approved" && (
                    <button className="btn primary" onClick={() => window.open(`/player/entry-pass/${tid}`, "_blank")}>
                      Entry Pass
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Friend Selection Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="friend-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Select a Friend</h3>
              <button className="btn ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {friends.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                  No friends found. You can only add users who have accepted your friend request.
                </div>
              ) : (
                <div className="friend-list">
                  {friends.map(f => (
                    <div
                      key={f._id}
                      className="friend-list-item"
                      onClick={() => handleReplace(selectedTid, f._id)}
                    >
                      <div className="teammate-avatar">{f.playerName?.charAt(0).toUpperCase()}</div>
                      <div className="teammate-info">
                        <div className="teammate-name">{f.playerName}</div>
                        <div className="teammate-sub">HCP: {f.handicap ?? "—"} • {f.email}</div>
                      </div>
                      <i className="material-icons" style={{ color: 'var(--primary)' }}>add_circle</i>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 20px', background: '#f8f9fa', fontSize: '0.75rem', color: '#666' }}>
              Note: Only friends not already registered for this tournament are shown.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

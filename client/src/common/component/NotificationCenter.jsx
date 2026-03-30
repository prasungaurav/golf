import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// backend base
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

const getIcon = (type) => {
  switch (type) {
    case "tournament_update": return "event";
    case "match_live": return "play_circle";
    case "player_blocked": return "block";
    case "leader_changed": return "group_add";
    case "new_player_needed": return "person_add";
    default: return "notifications";
  }
};

export default function NotificationCenter() {
  const nav = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    try {
      const data = await api("/api/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.notifications.filter(n => !n.read).length);
    } catch (e) {
      console.error("Notif fetch failed", e);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id) => {
    try {
      const target = notifications.find(n => n._id === id);
      if (!target || target.read) return; // Already read or not found

      await api(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotif = async (id) => {
    try {
      const target = notifications.find(n => n._id === id);
      const isUnread = target && !target.read;

      await api(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (isUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="notif-wrapper" style={{ position: "relative" }}>
      <style>{`
        .notif-bell {
          position: relative;
          cursor: pointer;
          background: var(--surface_container_high);
          width: 40px; height: 40px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .notif-bell:hover { background: var(--surface_container_highest); }
        .notif-bell.ringing .material-icons {
          animation: ring 2s ease-in-out infinite;
          transform-origin: top center;
        }
        @keyframes ring {
          0% { transform: rotate(0); }
          5% { transform: rotate(15deg); }
          10% { transform: rotate(-15deg); }
          15% { transform: rotate(10deg); }
          20% { transform: rotate(-10deg); }
          25% { transform: rotate(5deg); }
          30% { transform: rotate(-5deg); }
          35% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
        .notif-badge {
          position: absolute; top: -2px; right: -2px;
          background: var(--error); color: white;
          font-size: 0.6rem; font-weight: 800;
          min-width: 16px; height: 16px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px;
        }
        .notif-dropdown {
          position: absolute; top: 50px; right: 0;
          width: 320px; max-height: 400px;
          background: white; border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          overflow-y: auto; z-index: 1000;
          border: 1px solid #eee;
        }
        .notif-item {
          padding: 12px; border-bottom: 1px solid #f5f5f5;
          position: relative; transition: background 0.2s;
          cursor: pointer;
        }
        .notif-item:hover { background: #fafafa; }
        .notif-item.unread { background: #e8f0fe; }
        .notif-title { font-weight: 700; font-size: 0.85rem; margin-bottom: 2px; }
        .notif-msg { font-size: 0.75rem; color: #666; line-height: 1.3; }
        .notif-time { font-size: 0.6rem; color: #999; margin-top: 5px; }
        .notif-delete {
          position: absolute; top: 10px; right: 10px;
          font-size: 0.8rem; opacity: 0; transition: opacity 0.2s;
        }
        .notif-item:hover .notif-delete { opacity: 0.5; }
        .notif-delete:hover { opacity: 1; color: var(--error); }
        .tiny-type-icon { box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 2px solid white; }
      `}</style>

      <div className={`notif-bell ${unreadCount > 0 ? "ringing" : ""}`} onClick={() => setOpen(!open)}>
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={unreadCount > 0 ? "var(--primary)" : "var(--on_surface_variant)"} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          {unreadCount > 0 && <circle cx="18" cy="6" r="3" fill="var(--error)" stroke="none"></circle>}
        </svg>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </div>

      {open && (
        <div className="notif-dropdown">
          <div style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: 800, fontSize: "0.9rem", display: "flex", justifyContent: "space-between" }}>
            <span>Notifications</span>
            <button className="btn tiny ghost" onClick={() => setOpen(false)}>Close</button>
          </div>
          {notifications.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#999" }}>
              No notifications yet.
            </div>
          )}
          {notifications.map(n => (
            <div
              key={n._id}
              className={`notif-item ${n.read ? "" : "unread"}`}
              onClick={() => {
                markRead(n._id);
                if (n.type === "tournament_invite" || n.type === "tournament_update") {
                  nav("/player/my-tournaments");
                  setOpen(false);
                }
              }}
            >
              <div className="notif-icon-wrap" style={{ position: 'relative' }}>
                {n.tournamentId?.bannerUrl ? (
                  <img src={n.tournamentId.bannerUrl} alt="Logo" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                ) : (
                  <i className="material-icons">{getIcon(n.type)}</i>
                )}
                <i className="material-icons tiny-type-icon" style={{
                  position: 'absolute', bottom: -4, right: -4, fontSize: '12px',
                  background: 'var(--primary)', color: 'white', borderRadius: '50%', padding: 2
                }}>{getIcon(n.type)}</i>
              </div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <span className="notif-delete material-icons" onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}>delete</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

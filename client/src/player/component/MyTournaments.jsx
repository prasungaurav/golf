import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

function money(amount, currency = "₹") {
  const n = Number(amount || 0);
  return `${currency}${n.toLocaleString("en-IN")}`;
}

function pillClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "confirmed") return "ok";
  if (s === "waitlist") return "warn";
  if (s === "rejected" || s === "blocked") return "danger";
  return "warn"; // pending
}

export default function PlayerMyTournaments() {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);

        // ✅ use correct endpoint that returns registrations
        // If your backend is: /api/tournaments/players/me/tournaments
        const data = await api("/api/tournaments/players/me", { method: "GET" });

        setItems(data.items || []);
      } catch (e) {
        setErr(e.message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>My Tournaments</h2>

      {err && <div className="orgError">⚠ {err}</div>}
      {loading && <div className="card" style={{ marginTop: 12 }}>Loading...</div>}

      {!loading && items.length === 0 && (
        <div className="card" style={{ marginTop: 12 }}>No registrations yet.</div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {items.map((x) => {
          // ✅ populated tournament doc could be in tournamentId
          const t = x.tournamentId || x.tournament || null;
          const tid = t?._id || t?.id || x.tournamentId || x.tournamentId?._id;

          return (
            <div className="card" key={x._id || x.id || `${x.playerId}-${tid}`}>
              <div className="cardHead" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <h3 style={{ margin: 0 }}>{t?.title || t?.name || "Tournament"}</h3>

                <span className={`miniPill ${pillClass(x.status)}`}>
                  {x.status || "pending"}
                </span>
              </div>

              {/* ✅ more basic details */}
              <div className="muted">
                {(t?.city || "—")} • {(t?.course || t?.ground || "—")} • {(t?.format || "—")}
              </div>

              <div className="muted" style={{ marginTop: 6 }}>
                {fmtDMY(t?.startDate)} – {fmtDMY(t?.endDate)}
              </div>

              <div className="muted tiny" style={{ marginTop: 6 }}>
                Entry: {money(t?.registration?.fee ?? 0, t?.registration?.currency || "₹")} •
                Reg closes: {fmtDMY(t?.registration?.regClosesAt || t?.regClosesAt)}
              </div>

              <div className="muted tiny" style={{ marginTop: 6 }}>
                Applied on: {fmtDMY(x.createdAt)}
              </div>

              {/* ✅ DETAILS BUTTON */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  className="ghostBtn"
                  type="button"
                  onClick={() => {
                    if (!tid) return alert("Tournament id missing");
                    nav(`/tournaments?tid=${encodeURIComponent(String(tid))}`);
                  }}
                >
                  Details
                </button>

                {x.status === "approved" && (
  <button
    className="btn primary"
    type="button"
    onClick={() => {
      if (!tid) return alert("Tournament id missing");
      window.open(
  `/player/entry-pass/${encodeURIComponent(String(tid))}`,
  "_blank"
);
    }}
  >
    Entry Pass
  </button>
)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
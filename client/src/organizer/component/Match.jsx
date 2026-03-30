import React, { useEffect, useMemo, useRef, useState } from "react";
import { openMatchPiP } from "../../MatchPip";

// ✅ Dummy matches (Removed as requested)
const DUMMY_MATCHES = [];

// ✅ backend base
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

function fmtDateTime(iso, fallback = null) {
  const d = new Date(iso || fallback || Date.now());
  if (isNaN(d.getTime())) return "Check Time";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  const yr = d.getFullYear();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${day} ${mon} ${yr}, ${h}:${m} ${ampm}`;
}

// status normalize (UI <-> DB)
function uiToDbStatus(ui) {
  const s = String(ui || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "live") return "live";
  if (s === "paused") return "paused";
  if (s === "finished") return "finished";
  if (s === "scheduled") return "scheduled";
  return s; // fallback
}

function dbToUiStatus(db) {
  const s = String(db || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "live") return "Live";
  if (s === "paused") return "Paused";
  if (s === "finished") return "Finished";
  if (s === "scheduled") return "Scheduled";
  // if backend already sends "Live" etc
  return db;
}

export default function Match({
  tournament,
  // ✅ optional props for PiP rendering
  pipWindow,
  mode = "page", // "page" | "pip"
  showPiPButton = true,
  onPipClosed,
  initialMatches,
}) {
  const [pipHandle, setPipHandle] = useState(null);

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ Collapsible sections (hide upcoming/finished by default)
  const [collapsed, setCollapsed] = useState({ live: false, upcoming: true, finished: true });

  const [edit, setEdit] = useState({ home: "", away: "", hole: "", status: "", holeScores: [] });
  const [approvedPlayers, setApprovedPlayers] = useState([]);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState({ show: false, team: "" });
  const abortRef = useRef({ alive: true });

  // ✅ Auto Live Check (every 10s)
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      let changed = false;
      const nextMatches = matches.map(m => {
        const isScheduled = String(m.status).toLowerCase() === 'scheduled';
        const isTimeUp = m.startTime && new Date(m.startTime).getTime() <= now;

        if (isScheduled && isTimeUp) {
          changed = true;
          return { ...m, status: 'Live', isAutoLive: true };
        }
        return m;
      });

      if (changed) setMatches(nextMatches);
    };

    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, [matches]);

  const loadList = async () => {
    if (!tournament?._id || mode === "pip") return;
    try {
      const data = await api(`/api/matches/tournament/${tournament._id}`);
      const list = Array.isArray(data?.matches) ? data.matches : [];
      const now = Date.now();

      const normalized = list.map((m) => {
        const isScheduled = String(m.status).toLowerCase() === 'scheduled';
        const isTimeUp = m.startTime && new Date(m.startTime).getTime() <= now;
        return {
          ...m,
          status: dbToUiStatus(m.status),
          isAutoLive: isScheduled && isTimeUp
        };
      });

      setMatches(normalized);
      setSelectedMatchId((prev) => prev || normalized?.[0]?._id || null);
    } catch (e) {
      console.error("Poll failed", e);
    }
  };

  // ✅ Auto Polling (Matches list) - 5 seconds
  useEffect(() => {
    const p = setInterval(loadList, 5000);
    return () => clearInterval(p);
  }, [tournament?._id]);

  const fetchApproved = async () => {
    if (!tournament?._id) return;
    try {
      const data = await api(`/api/tournaments/me/${tournament._id}/registrations?status=approved`);
      setApprovedPlayers(data?.registrations || []);
    } catch (e) {
      console.error("Failed to fetch approved players", e);
    }
  };

  useEffect(() => {
    if (mode !== "pip") fetchApproved();
  }, [tournament?._id]);

  const onAddPlayer = async (pId) => {
    if (!selectedMatchId || !showAddPlayerModal.team) return;
    try {
      setSaving(true);
      await api(`/api/matches/${selectedMatchId}/players`, {
        method: "POST",
        body: JSON.stringify({ playerId: pId, team: showAddPlayerModal.team }),
      });
      setShowAddPlayerModal({ show: false, team: "" });
      loadList(); // refresh list
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ✅ Debounced Auto-Save
  useEffect(() => {
    if (!selectedMatchId || saving) return;

    // Check if anything actually changed vs the current version in 'matches'
    const sm = matches.find(m => String(m._id) === String(selectedMatchId));
    if (!sm) return;

    const hasChanged =
      edit.status !== (sm.status || "") ||
      Number(edit.hole) !== Number(sm.hole || 0) ||
      JSON.stringify(edit.holeScores) !== JSON.stringify(sm.holeScores || []);

    if (!hasChanged) return;

    console.log("Auto-saving match...");
    const timeout = setTimeout(onSave, 1500);
    return () => clearTimeout(timeout);
  }, [edit, selectedMatchId]); // Only trigger on edit changes

  // ------------------------------------------------------------
  // ✅ Load matches
  // Page mode: fetch from backend if tournament._id exists
  // PiP mode: use initialMatches (fast), fallback dummy
  // ------------------------------------------------------------
  useEffect(() => {
    abortRef.current.alive = true;

    const load = async () => {
      setLoading(true);

      try {
        // ✅ PiP: use data passed from page
        if (mode === "pip") {
          const list = initialMatches?.length ? initialMatches : DUMMY_MATCHES;
          if (!abortRef.current.alive) return;

          setMatches(list);
          setSelectedMatchId((prev) => prev || list?.[0]?._id || null);
          setLoading(false);
          return;
        }

        // ✅ page: fetch from backend if tournament exists
        if (tournament?._id) {
          const data = await api(`/api/matches/tournament/${tournament._id}`);
          const list = Array.isArray(data?.matches) ? data.matches : [];

          if (!abortRef.current.alive) return;

          // normalize status to UI
          const normalized = list.map((m) => ({
            ...m,
            status: dbToUiStatus(m.status),
          }));

          setMatches(normalized);
          setSelectedMatchId((prev) => prev || normalized?.[0]?._id || null);
          setLoading(false);
          return;
        }

        // ✅ fallback if no tournament id
        const fallback = initialMatches?.length ? initialMatches : DUMMY_MATCHES;
        if (!abortRef.current.alive) return;

        setMatches(fallback);
        setSelectedMatchId((prev) => prev || fallback?.[0]?._id || null);
        setLoading(false);
      } catch (e) {
        console.error(e);
        // fallback
        const fallback = initialMatches?.length ? initialMatches : DUMMY_MATCHES;
        if (!abortRef.current.alive) return;

        setMatches(fallback);
        setSelectedMatchId((prev) => prev || fallback?.[0]?._id || null);
        setLoading(false);
      }
    };

    load();

    return () => {
      abortRef.current.alive = false;
    };
  }, [mode, tournament?._id, initialMatches]);

  const selectedMatch = useMemo(
    () => matches.find((m) => String(m._id) === String(selectedMatchId)) || null,
    [matches, selectedMatchId]
  );

  // ✅ Sync edit fields when match changes
  useEffect(() => {
    if (!selectedMatch) return;

    // init 18 holes
    const hs = Array.from({ length: 18 }, (_, i) => {
      const existing = (selectedMatch.holeScores || []).find(h => h.hole === i + 1);
      return {
        hole: i + 1,
        scoreA: existing?.scoreA ?? "",
        scoreB: existing?.scoreB ?? ""
      };
    });

    setEdit({
      home: selectedMatch.scoreA ?? "",
      away: selectedMatch.scoreB ?? "",
      hole: selectedMatch.hole ?? "",
      status: selectedMatch.status ?? "",
      holeScores: hs
    });
  }, [selectedMatchId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;

    return matches.filter((m) => {
      const s = `${m.name || ""} ${m.playerA?.name || ""} ${m.playerB?.name || ""} ${m.status || ""}`.toLowerCase();
      return s.includes(q);
    });
  }, [matches, query]);

  const updateHole = (idx, side, val) => {
    const next = [...edit.holeScores];
    next[idx] = { ...next[idx], [side]: val };

    // auto calc totals
    let totalA = 0;
    let totalB = 0;
    next.forEach(h => {
      if (h.scoreA !== "" && h.scoreA !== null) totalA += Number(h.scoreA);
      if (h.scoreB !== "" && h.scoreB !== null) totalB += Number(h.scoreB);
    });

    setEdit(p => ({
      ...p,
      holeScores: next,
      home: totalA || "",
      away: totalB || ""
    }));
  };

  // ------------------------------------------------------------
  // ✅ Save (backend PATCH)
  // ------------------------------------------------------------
  const onSave = async () => {
    if (!selectedMatch?._id) return;

    setSaving(true);
    try {
      const payload = {
        scoreA: edit.home === "" ? null : Number(edit.home),
        scoreB: edit.away === "" ? null : Number(edit.away),
        hole: edit.hole === "" ? 0 : Number(edit.hole),
        status: edit.status ? uiToDbStatus(edit.status) : undefined,
        holeScores: edit.holeScores.filter(h => h.scoreA !== "" || h.scoreB !== "").map(h => ({
          hole: h.hole,
          scoreA: h.scoreA === "" ? null : Number(h.scoreA),
          scoreB: h.scoreB === "" ? null : Number(h.scoreB)
        }))
      };

      const data = await api(`/api/matches/${selectedMatch._id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // Optimistic update already handled by UI bindings, but we sync with server data here
      const updated = data?.match || null;
      if (updated) {
        const fixed = { ...updated, status: dbToUiStatus(updated.status) };
        setMatches((prev) => prev.map((m) => (String(m._id) === String(fixed._id) ? fixed : m)));
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // ✅ Refresh (backend re-fetch)
  // ------------------------------------------------------------
  const onRefresh = async () => {
    setLoading(true);

    try {
      if (tournament?._id && mode !== "pip") {
        const data = await api(`/api/matches/tournament/${tournament._id}`);
        const list = Array.isArray(data?.matches) ? data.matches : [];
        const normalized = list.map((m) => ({ ...m, status: dbToUiStatus(m.status) }));

        setMatches(normalized);
        setSelectedMatchId((prev) => prev || normalized?.[0]?._id || null);
        setLoading(false);
        return;
      }

      // PiP / fallback (no backend)
      const list = initialMatches?.length ? initialMatches : matches.length ? matches : DUMMY_MATCHES;
      setMatches(list);
      setSelectedMatchId((prev) => prev || list?.[0]?._id || null);
    } catch (e) {
      console.error(e);
      alert(e.message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // ✅ PiP open (only in page mode)
  // ------------------------------------------------------------
  const openPip = async () => {
    try {
      const h = await openMatchPiP(
        Match,
        {
          tournament,
          mode: "pip",
          showPiPButton: false,
          initialMatches: matches.length ? matches : DUMMY_MATCHES,
          onPipClosed: () => setPipHandle(null),
        },
        { width: 900, height: 600 }
      );

      h?.pipWin?.addEventListener?.("pagehide", () => setPipHandle(null));
      h?.pipWin?.addEventListener?.("unload", () => setPipHandle(null));

      setPipHandle(h);
    } catch (e) {
      alert(e.message || "PiP failed (Use Chrome/Edge)");
    }
  };

  const closePip = () => {
    pipHandle?.close?.();
    setPipHandle(null);
  };

  // ✅ If PiP window exists, handle the X in PiP header
  const closeSelfIfPip = () => {
    if (mode !== "pip") return;
    pipWindow?.close?.();
    onPipClosed?.();
  };

  const isMatchLive = (m) => {
    if (!m) return false;
    const s = String(m.status).toLowerCase();
    const es = String(edit.status || "").toLowerCase();

    // Archived tournaments are READ-ONLY
    if (!tournament) return false;

    // Check either the match object status OR current edit status
    return s === 'live' || s === 'paused' || m.isAutoLive || es === 'live' || es === 'paused';
  };

  const renderMatchItem = (m) => {
    const active = String(m._id) === String(selectedMatchId);
    const live = isMatchLive(m);

    const sideA = m.teamAName || (m.teamA?.map(p => p.name).join(", ")) || "Side A";
    const sideB = m.teamBName || (m.teamB?.map(p => p.name).join(", ")) || "Side B";

    return (
      <button
        key={m._id}
        type="button"
        className={`matchRow ${active ? "active" : ""}`}
        onClick={() => setSelectedMatchId(m._id)}
        style={{ width: '100%', textAlign: 'left', marginBottom: 8 }}
      >
        <div className="matchRowTop">
          <div className="matchName" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            📅 {fmtDateTime(m.startTime, m.createdAt || m.updatedAt)}
          </div>
          <span className="tiny-date" style={{ opacity: 0.6, fontSize: '0.65rem' }}>{tournament?.title}</span>
        </div>

        <div className="matchRowMid">
          <div className="matchPlayers" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {sideA} <span className="vs" style={{ margin: '0 8px', color: 'var(--on_surface_variant)', fontWeight: 400 }}>VS</span> {sideB}
          </div>
        </div>

        <div className="matchRowBot">
          <div className="muted" style={{ fontSize: '0.75rem' }}>
            Hole: {m.hole ?? "—"} • Score: {m.scoreA ?? "0"} - {m.scoreB ?? "0"}
          </div>
          <span className={`pill-status-new ${String(m.status || "").toLowerCase() === 'scheduled' && m.isAutoLive ? 'live' : String(m.status || "").toLowerCase()}`}>
            {String(m.status || "").toLowerCase() === 'scheduled' && m.isAutoLive ? 'LIVE' : m.status || "—"}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="orgCard">
      <style>{`
        .matchSectionHead {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--on_surface_variant);
          padding: 8px 10px;
          background: var(--surface_container);
          border-radius: 6px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tiny-date {
          font-size: 0.65rem;
          opacity: 0.7;
          font-weight: 500;
        }
        .pill-status {
          font-size: 0.65rem;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 700;
        }
        .pill-status.live { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .pill-status.scheduled { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .pill-status.paused { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .pill-status.finished { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
        .vs { font-size: 0.7rem; font-style: italic; opacity: 0.5; margin: 0 4px; }
        .matchSectionHead { cursor: pointer; user-select: none; transition: opacity 0.2s; }
        .matchSectionHead:hover { opacity: 0.8; }
        .add-player-btn {
          font-size: 0.65rem;
          padding: 4px 8px;
          background: var(--primary_container);
          color: var(--on_primary_container);
          border-radius: 4px; border: none; cursor: pointer; margin-top: 4px;
        }
        .add-player-btn:hover { background: var(--primary); color: white; }
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 9999;
        }
        .modal-content {
          background: white; padding: 20px; border-radius: 12px;
          width: 90%; max-width: 400px; max-height: 80vh; overflow-y: auto; color: black;
        }
        .player-item {
          padding: 10px; border-bottom: 1px solid #eee; display: flex;
          justify-content: space-between; align-items: center;
        }
        .player-item:last-child { border: none; }
      `}</style>

      {showAddPlayerModal.show && (
        <div className="modal-overlay" onClick={() => setShowAddPlayerModal({ show: false, team: "" })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 10px 0' }}>Add Player to {showAddPlayerModal.team === "teamA" ? "Side A" : "Side B"}</h4>
            <p className="tiny muted">Only approved players from this tournament are shown.</p>
            <div style={{ marginTop: 15 }}>
              {approvedPlayers.filter(ap => {
                const inMatch = selectedMatch?.teamA?.some(p => p._id === ap.playerId?._id) ||
                  selectedMatch?.teamB?.some(p => p._id === ap.playerId?._id);
                return !inMatch;
              }).map(ap => (
                <div key={ap._id} className="player-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{ap.playerId?.playerName}</div>
                    <div className="tiny muted">Handicap: {ap.playerId?.handicap ?? "N/A"}</div>
                  </div>
                  <button className="btn primary sm" onClick={() => onAddPlayer(ap.playerId?._id)}>Add</button>
                </div>
              ))}
              {approvedPlayers.length === 0 && <div className="muted">No approved players found.</div>}
            </div>
            <button className="btn ghost block" style={{ marginTop: 20, width: '100%' }} onClick={() => setShowAddPlayerModal({ show: false, team: "" })}>Cancel</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="cardHeadRow" style={{ padding: 0, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{mode === "pip" ? "Matches (PiP)" : "Matches (Live)"}</h3>
          <div className="muted" style={{ marginTop: 4 }}>
            {tournament?.title || "Demo Tournament"} • {tournament?.course || "Demo Course"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {mode !== "pip" ? (
            <>
              {showPiPButton &&
                (!pipHandle ? (
                  <button className="btn ghost" type="button" onClick={openPip}>
                    Open PiP
                  </button>
                ) : (
                  <button className="btn ghost" type="button" onClick={closePip}>
                    Close PiP
                  </button>
                ))}
            </>
          ) : (
            <button className="btn ghost" type="button" onClick={closeSelfIfPip}>
              Close
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`matchGrid ${mode === "pip" ? "pipMatchGrid" : ""}`}>
        {/* List */}
        <div className="matchListCard">
          <div className="matchListHead">
            <input
              className="matchSearch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player / match…"
            />
          </div>

          {loading ? (
            <div className="muted" style={{ padding: 12 }}>
              Loading matches…
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">No matches found.</div>
          ) : (
            <div className="matchList" style={{ padding: '0 10px 20px' }}>

              {/* ✅ 1. LIVE */}
              <div className="matchSection">
                <div className="matchSectionHead" onClick={() => setCollapsed(prev => ({ ...prev, live: !prev.live }))}>
                  🔴 Live & Paused ({filtered.filter(m => ['live', 'paused'].includes(String(m.status).toLowerCase()) || m.isAutoLive).length})
                  <span style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>{collapsed.live ? '▼' : '▲'}</span>
                </div>
                {!collapsed.live && (
                  <>
                    {filtered.filter(m => ['live', 'paused'].includes(String(m.status).toLowerCase()) || m.isAutoLive).map(m => renderMatchItem(m))}
                    {filtered.filter(m => ['live', 'paused'].includes(String(m.status).toLowerCase()) || m.isAutoLive).length === 0 && <div className="tiny muted" style={{ padding: '5px 10px' }}>None</div>}
                  </>
                )}
              </div>

              {/* ✅ 2. UPCOMING */}
              <div className="matchSection" style={{ marginTop: 15 }}>
                <div className="matchSectionHead" onClick={() => setCollapsed(prev => ({ ...prev, upcoming: !prev.upcoming }))}>
                  📅 Upcoming ({filtered.filter(m => String(m.status).toLowerCase() === 'scheduled' && !m.isAutoLive).length})
                  <span style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>{collapsed.upcoming ? '▼' : '▲'}</span>
                </div>
                {!collapsed.upcoming && (
                  <>
                    {filtered.filter(m => String(m.status).toLowerCase() === 'scheduled' && !m.isAutoLive).map(m => renderMatchItem(m))}
                    {filtered.filter(m => String(m.status).toLowerCase() === 'scheduled' && !m.isAutoLive).length === 0 && <div className="tiny muted" style={{ padding: '5px 10px' }}>None</div>}
                  </>
                )}
              </div>

              {/* ✅ 3. FINISHED */}
              <div className="matchSection" style={{ marginTop: 15 }}>
                <div className="matchSectionHead" onClick={() => setCollapsed(prev => ({ ...prev, finished: !prev.finished }))}>
                  🏁 Finished ({filtered.filter(m => String(m.status).toLowerCase() === 'finished').length})
                  <span style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>{collapsed.finished ? '▼' : '▲'}</span>
                </div>
                {!collapsed.finished && (
                  <>
                    {filtered.filter(m => String(m.status).toLowerCase() === 'finished').map(m => renderMatchItem(m))}
                    {filtered.filter(m => String(m.status).toLowerCase() === 'finished').length === 0 && <div className="tiny muted" style={{ padding: '5px 10px' }}>None</div>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="matchDetailCard" style={{ overflowY: "auto", maxHeight: "80vh" }}>
          {!selectedMatch ? (
            <div className="empty">Select a match</div>
          ) : (
            <>
              <div className="matchDetailHead">
                <div>
                  <div className="matchDetailTitle" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem' }}>
                    📅 {fmtDateTime(selectedMatch.startTime, selectedMatch.createdAt || selectedMatch.updatedAt)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 15, margin: '10px 0' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedMatch.teamAName || "Side A"}</div>
                      <div className="tiny muted">{selectedMatch.teamA?.map(p => p.name).join(", ")}</div>
                      {selectedMatch.teamA?.length < (tournament?.registration?.teamSize || 1) && (
                        <button className="add-player-btn" onClick={() => setShowAddPlayerModal({ show: true, team: "teamA" })}>+ Add Player</button>
                      )}
                    </div>
                    <div className="vs" style={{ fontSize: '1.5rem', fontWeight: 300 }}>VS</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedMatch.teamBName || "Side B"}</div>
                      <div className="tiny muted">{selectedMatch.teamB?.map(p => p.name).join(", ")}</div>
                      {selectedMatch.teamB?.length < (tournament?.registration?.teamSize || 1) && (
                        <button className="add-player-btn" onClick={() => setShowAddPlayerModal({ show: true, team: "teamB" })}>+ Add Player</button>
                      )}
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                    Tournament: {tournament?.title}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`pill-status ${String(selectedMatch.status || "").toLowerCase() === 'scheduled' && selectedMatch.isAutoLive ? 'live' : String(selectedMatch.status || "").toLowerCase()}`}>
                    {String(selectedMatch.status || "").toLowerCase() === 'scheduled' && selectedMatch.isAutoLive ? 'LIVE' : selectedMatch.status || "—"}
                  </span>
                  {!isMatchLive(selectedMatch) && (
                    <div style={{ fontSize: '0.6rem', color: 'var(--error)', marginTop: 4, fontWeight: 700 }}>READ ONLY</div>
                  )}
                </div>
              </div>

              <div className="matchEditCard">
                <div className="matchEditTitle">Live Scoring Controls</div>

                <div className="matchEditGrid" style={{ opacity: isMatchLive(selectedMatch) ? 1 : 0.6 }}>
                  <label>
                    Status
                    <select
                      disabled={!isMatchLive(selectedMatch)}
                      value={edit.status}
                      onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value }))}>
                      <option value="Live">Live</option>
                      <option value="Paused">Paused</option>
                      <option value="Finished">Finished</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>

                  <label>
                    Current Hole
                    <input
                      disabled={!isMatchLive(selectedMatch)}
                      type="number"
                      value={edit.hole}
                      onChange={(e) => setEdit((p) => ({ ...p, hole: e.target.value }))}
                    />
                  </label>

                  <label>
                    {tournament?.format === "Stableford" ? "Total Points A (Auto)" : "Total Strokes A (Auto)"}
                    <input type="number" readOnly value={edit.home} style={{ background: '#eee' }} />
                  </label>
                  <label>
                    {tournament?.format === "Stableford" ? "Total Points B (Auto)" : "Total Strokes B (Auto)"}
                    <input type="number" readOnly value={edit.away} style={{ background: '#eee' }} />
                  </label>
                </div>

                <div style={{ marginTop: 24, opacity: isMatchLive(selectedMatch) ? 1 : 0.6 }}>
                  <div className="matchEditTitle">Hole-by-Hole Scores</div>
                  <div className="holeGrid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(9, 1fr)',
                    gap: 8,
                    marginTop: 10
                  }}>
                    {edit.holeScores?.map((h, i) => (
                      <div key={i} style={{
                        border: '1px solid #ddd',
                        padding: 6,
                        borderRadius: 6,
                        textAlign: 'center',
                        fontSize: 10,
                        background: Number(edit.hole) === h.hole ? 'var(--primary_container)' : 'transparent'
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>H{h.hole}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--on_surface_variant)', marginBottom: 2 }}>
                          {tournament?.format === "Match Play" ? "Result" : (tournament?.format === "Stableford" ? "Points" : "Strokes")}
                        </div>
                        <input
                          disabled={!isMatchLive(selectedMatch)}
                          type="number"
                          value={h.scoreA}
                          placeholder="A"
                          onChange={e => updateHole(i, 'scoreA', e.target.value)}
                          style={{ width: '100%', padding: 4, marginBottom: 4, border: '1px solid #ccc' }}
                        />
                        <input
                          disabled={!isMatchLive(selectedMatch)}
                          type="number"
                          value={h.scoreB}
                          placeholder="B"
                          onChange={e => updateHole(i, 'scoreB', e.target.value)}
                          style={{ width: '100%', padding: 4, border: '1px solid #ccc' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="matchEditActions" style={{ marginTop: 20 }}>
                  <div style={{ fontSize: '0.7rem', color: saving ? 'var(--primary)' : 'var(--on_surface_variant)', fontWeight: 600 }}>
                    {saving ? "🔄 Saving changes..." : "✅ All changes saved automatically"}
                  </div>
                  {/* Save button removed for Auto-Update feel */}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useMemo, useState, useEffect } from "react";
import "../style/Admin.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const emptyMatch = () => ({
  _id: null,
  status: "live",
  name: "New Match",
  teamAName: "",
  teamBName: "",
  scoreA: 0,
  scoreB: 0,
  hole: 1,
  tournamentId: "",
  startTime: new Date().toISOString(),
});

export default function LiveManage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("live");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/live`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) setMatches(data.matches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = matches.filter(m => m.status === tab);
    if (q) {
      list = list.filter(m => {
        const hay = `${m.name} ${m.teamAName} ${m.teamBName}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [matches, tab, query]);

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matches }),
        credentials: "include"
      });
      const json = await res.json();
      if (json.ok) alert("Live scores broadcasted to platform.");
      else alert(json.message);
    } catch (e) {
      alert("Score broadcast failed.");
    }
  };

  const updateMatch = (id, patch) => {
    setMatches(prev => prev.map(m => m._id === id ? { ...m, ...patch } : m));
  };

  const addMatch = () => {
    const m = emptyMatch();
    m.status = tab;
    // We add a temp ID if it's new
    m._id = "temp-" + Date.now();
    setMatches([m, ...matches]);
  };

  if (loading) return <div className="admin-title"><h1>Tuning Live Telemetry...</h1></div>;

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div className="admin-title">
          <h1>Score Terminal</h1>
          <p>Real-time moderation of live match scoring and leaderboard status</p>
        </div>
        <div className="admin-actions">
           <button className="admin-btn" onClick={handleSave}>Broadcast Live</button>
        </div>
      </header>

      <div className="admin-tabs">
        {["scheduled", "live", "finished"].map(t => (
          <div key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </div>
        ))}
      </div>

      <div style={{marginBottom: 20, display: 'flex', gap: 12}}>
         <input 
          className="admin-input" 
          placeholder="Filter active terminal..." 
          style={{maxWidth: 300}}
          value={query}
          onChange={e => setQuery(e.target.value)}
         />
         <button className="admin-btn-outline" onClick={addMatch}>+ INITIALIZE MATCH</button>
      </div>

      <div className="admin-grid-2">
         {filtered.map((m, idx) => (
           <div key={m._id || idx} className="admin-card fade-in">
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
                 <span className="status-badge active">{m.name}</span>
                 <button className="status-badge blocked" style={{border: 'none', cursor: 'pointer'}} onClick={() => setMatches(matches.filter(x => x._id !== m._id))}>TERMINATED</button>
              </div>

              <div style={{display: 'grid', gap: 12}}>
                 <div className="admin-grid-2">
                    <div>
                       <label className="stat-label">Status</label>
                       <select className="admin-input" value={m.status} onChange={e => updateMatch(m._id, {status: e.target.value})}>
                          <option value="scheduled">Scheduled</option>
                          <option value="live">Live</option>
                          <option value="paused">Paused</option>
                          <option value="finished">Finished</option>
                       </select>
                    </div>
                    <div>
                        <label className="stat-label">Hole</label>
                        <input className="admin-input" type="number" value={m.hole} onChange={e => updateMatch(m._id, {hole: Number(e.target.value)})} />
                    </div>
                 </div>

                 <div style={{marginTop: 10, borderTop: '1px solid var(--admin-border)', paddingTop: 16}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center'}}>
                       <div>
                          <input className="admin-input" placeholder="Team A" value={m.teamAName} onChange={e => updateMatch(m._id, {teamAName: e.target.value})} />
                          <input className="admin-input" style={{marginTop: 8, textAlign: 'center', fontSize: '1.5rem'}} type="number" value={m.scoreA} onChange={e => updateMatch(m._id, {scoreA: Number(e.target.value)})} />
                       </div>
                       <div style={{fontWeight: 700, fontSize: '1.2rem'}}>VS</div>
                       <div>
                          <input className="admin-input" placeholder="Team B" value={m.teamBName} onChange={e => updateMatch(m._id, {teamBName: e.target.value})} />
                          <input className="admin-input" style={{marginTop: 8, textAlign: 'center', fontSize: '1.5rem'}} type="number" value={m.scoreB} onChange={e => updateMatch(m._id, {scoreB: Number(e.target.value)})} />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
         ))}
         {filtered.length === 0 && <div className="admin-card" style={{gridColumn: 'span 2', textAlign: 'center'}}>No signals detected in this sector.</div>}
      </div>
    </div>
  );
}

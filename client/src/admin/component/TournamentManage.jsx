import React, { useMemo, useState, useEffect } from "react";
import "../style/Admin.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const emptyExtra = () => ({ id: "e" + Date.now(), name: "", price: 0 });
const emptySponsor = () => ({ id: "s" + Date.now(), name: "", tier: "Partner", url: "#" });
const emptyTournament = () => ({
  id: "t" + Date.now(),
  name: "New Event",
  status: "draft",
  banner: "",
  course: "",
  city: "",
  dates: "",
  teeOffWindow: "",
  format: "Stroke Play",
  rounds: 1,
  description: "",
  regClosesAt: "",
  rules: [""],
  registration: { fee: 0, currency: "₹", maxPlayers: 0, waitlistEnabled: true, handicapLimit: "0 – 24", teamAllowed: false, extras: [] },
  sponsors: [],
});

export default function TournamentManage() {
  const [tournaments, setTournaments] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/tournaments`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setTournaments(data.tournaments);
        if (data.tournaments.length > 0) setActiveId(data.tournaments[0]._id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const active = useMemo(() => tournaments.find(t => t._id === activeId), [tournaments, activeId]);

  const updateActive = (patch) => {
    setTournaments(prev => prev.map(t => t._id === activeId ? { ...t, ...patch } : t));
  };

  const updateReg = (patch) => {
    updateActive({ registration: { ...active.registration, ...patch } });
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/tournaments/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(active),
        credentials: "include"
      });
      const json = await res.json();
      if (json.ok) alert("Tournament structure crystallized in DB.");
      else alert(json.message);
    } catch (e) {
      alert("Network transmission failure.");
    }
  };

  if (loading) return <div className="admin-title"><h1>Accessing Tournament Grid...</h1></div>;

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div className="admin-title">
          <h1>Tournament Logistics</h1>
          <p>Configure event parameters, rules, and registration logic</p>
        </div>
        <div className="admin-actions">
           <button className="admin-btn" onClick={handleSave}>Sync Changes</button>
        </div>
      </header>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px'}}>
         {/* SELECTOR */}
         <section className="admin-card" style={{padding: 0}}>
            <div style={{padding: 16, borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between'}}>
               <span style={{fontWeight: 700}}>Active Events</span>
               <button 
                className="status-badge active" 
                style={{border: 'none', cursor: 'pointer'}} 
                onClick={() => {
                  const t = emptyTournament();
                  // For a new tournament, we might need a POST route. 
                  // For now, let's just allow editing existing ones or a placeholder.
                  alert("Use the main tournament creation flow or wait for admin sync.");
                }}
               >
                 + NEW
               </button>
            </div>
            <div style={{maxHeight: '80vh', overflowY: 'auto'}}>
               {tournaments.map(t => (
                 <div 
                  key={t._id} 
                  className={`admin-nav-item ${activeId === t._id ? 'active' : ''}`}
                  style={{borderRadius: 0, margin: '4px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}}
                  onClick={() => setActiveId(t._id)}
                 >
                   <div>
                      <div style={{fontWeight: 700}}>{t.title}</div>
                      <div className="stat-label" style={{fontSize: '0.65rem'}}>{t.course}</div>
                   </div>
                   <span className={`status-badge ${t.status}`} style={{fontSize: '0.6rem'}}>
                      {t.status}
                   </span>
                 </div>
               ))}
            </div>
         </section>

         {/* EDITOR */}
         {active ? (
           <div className="admin-card fade-in">
              <h3>Modifying: {active.title}</h3>
              <div style={{display: 'grid', gap: '20px', marginTop: 24}}>
                 <div className="admin-grid-2">
                    <div>
                       <label className="stat-label">Event Status</label>
                       <select className="admin-input" value={active.status} onChange={e => updateActive({status: e.target.value})}>
                          <option value="open">Open for Registration</option>
                          <option value="closed">Registration Closed</option>
                          <option value="live">Event Live</option>
                          <option value="finished">Completed</option>
                       </select>
                    </div>
                    <div>
                       <label className="stat-label">Format Type</label>
                       <select className="admin-input" value={active.format} onChange={e => updateActive({format: e.target.value})}>
                          <option>Stroke Play</option>
                          <option>Match Play</option>
                          <option>Stableford</option>
                       </select>
                    </div>
                 </div>

                 <div className="admin-grid-2">
                    <input className="admin-input" placeholder="Tournament Title" value={active.title} onChange={e => updateActive({title: e.target.value})} />
                    <input className="admin-input" placeholder="Course / Facility" value={active.course} onChange={e => updateActive({course: e.target.value})} />
                 </div>

                 <textarea 
                  className="admin-input" 
                  style={{minHeight: 120}} 
                  placeholder="Master Description" 
                  value={active.description} 
                  onChange={e => updateActive({description: e.target.value})} 
                 />

                 <div className="admin-grid-2">
                    <div>
                       <label className="stat-label">Registration Fee (INR)</label>
                       <input className="admin-input" type="number" value={active.registration?.fee} onChange={e => updateReg({fee: Number(e.target.value)})} />
                    </div>
                    <div>
                       <label className="stat-label">Capacity Limit</label>
                       <input className="admin-input" type="number" value={active.registration?.maxPlayers} onChange={e => updateReg({maxPlayers: Number(e.target.value)})} />
                    </div>
                 </div>

                 {/* RULES */}
                 <div style={{marginTop: 10}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                       <label className="stat-label">Tournament Regulations</label>
                       <button className="status-badge active" style={{border: 'none'}} onClick={() => updateActive({rules: [...active.rules, ""]})}>+ ADD RULE</button>
                    </div>
                    {active.rules.map((r, i) => (
                      <div key={i} style={{display: 'flex', gap: 10, marginBottom: 8}}>
                         <input className="admin-input" value={r} onChange={e => {
                            const copy = [...active.rules]; copy[i] = e.target.value; updateActive({rules: copy});
                         }} />
                         <button className="status-badge blocked" style={{border: 'none'}} onClick={() => {
                            updateActive({rules: active.rules.filter((_, idx) => idx !== i)});
                         }}>×</button>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
         ) : (
           <div className="admin-card" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <p className="admin-text-muted">Initialize tournament selection from the inventory.</p>
           </div>
         )}
      </div>
    </div>
  );
}

// frontend/src/pages/organiser/Scheduling.jsx
import React, { useEffect, useMemo, useState } from "react";

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

function pad(n) { return String(n).padStart(2, "0"); }
function toMin(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map((x) => Number(x || 0));
  return h * 60 + m;
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad(h)}:${pad(m)}`;
}


function Pill({ children, kind = "muted" }) {
  return <span className={`pill pill-${kind}`}>{children}</span>;
}
function MiniBtn({ children, kind = "", ...props }) {
  return (
    <button className={`miniBtn ${kind}`} type="button" {...props}>
      {children}
    </button>
  );
}

export default function Scheduling({ tournament, onUpdate }) {
  const tid = tournament?._id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ Auto-set group size based on format & teamSize
  useEffect(() => {
    if (!tournament?.format) return;
    const f = tournament.format.toLowerCase();
    const tSize = tournament.registration?.teamSize || 1;

    let size = 4;
    let interval = 10;

    if (f.includes("match")) { 
      size = 2; 
      interval = 8; 
    } else if (f.includes("scramble")) {
      size = tSize; // Typically 1 team per slot in scramble
      interval = 12;
    } else if (tSize === 2) {
      size = 4; // 2 teams of 2
      interval = 10;
    } else {
      size = 4; // Default group of 4
      interval = 10;
    }
    
    setConfig(p => ({ ...p, groupSize: size, intervalMin: interval }));
  }, [tournament?.format, tournament.registration?.teamSize]);

  const tStart = tournament?.startDate ? tournament.startDate.slice(0, 10) : "";
  const tEnd = tournament?.endDate ? tournament.endDate.slice(0, 10) : "";

  const [config, setConfig] = useState({
    date: tStart || new Date().toISOString().split('T')[0],
    start: "07:00",
    end: "10:00",
    intervalMin: 10,
    groupSize: 2,
    tees: "1",
    mode: "tee_times",
    bufferMin: 0,
    replaceExisting: false,
  });

  const [players, setPlayers] = useState([]);
  const [pool, setPool] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [search, setSearch] = useState("");

  // 1. Load Players
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (!tid) return;
        const data = await api(`/api/tournaments/me/${tid}/registrations`);
        const items = Array.isArray(data?.grouped) ? data.grouped : [];
        const approved = items
          .filter((g) => String(g.status || "").toLowerCase() === "approved")
          .map((g) => ({
            _id: g.groupId,
            name: g.teamName || "Unnamed Team",
            members: g.members.map(m => ({ _id: m.player?._id, name: m.player?.name, handicap: m.player?.handicap })),
            size: g.members.length,
            handicap: Math.round(g.members.reduce((acc, m) => acc + (m.player?.handicap || 0), 0) / g.members.length)
          }))
          .filter((p) => p._id);

        if (!alive) return;
        setPlayers(approved); // 'Players' is now 'Teams'
        setPool(approved.map((p) => p._id));
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tid]);

  const poolPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pool
      .map((id) => players.find((p) => p._id === id))
      .filter(Boolean)
      .filter((p) => (!q ? true : p.name.toLowerCase().includes(q)));
  }, [pool, players, search]);
  const generateSlots = () => {
    const start = toMin(config.start);
    const end = toMin(config.end);
    const interval = Number(config.intervalMin) || 10;
    const buffer = Number(config.bufferMin) || 0;

    if (end <= start) return alert("End time must be after start time");

    const list = [];
    let t = start;
    let idx = 1;
    while (t <= end) {
      list.push({
        id: "slot-" + idx,
        time: toHHMM(t),
        tee: config.tees === "2" ? (idx % 2 === 0 ? "Tee 10" : "Tee 1") : "Tee 1",
        group: [],
      });
      idx++;
      t += interval + buffer;
    }
    setSlots(list);
    setSelectedSlotId(list[0]?.id || null);
    setPool(players.map(p => p._id)); // Reset pool
  };

  // ✅ AUTO FILL: Pool se players utha kar slots mein bharna
  const autoFill = () => {
    if (slots.length === 0) return alert("Pehle Generate Slots dabayein");
    const size = Number(config.groupSize);
    let tempPool = [...pool];

    const newSlots = slots.map(s => {
      if (tempPool.length === 0) return s;
      const spaceLeft = size - s.group.length;
      if (spaceLeft <= 0) return s;

      const toAdd = tempPool.splice(0, spaceLeft);
      return { ...s, group: [...s.group, ...toAdd] };
    });

    setSlots(newSlots);
    setPool(tempPool);
  };

  const clearAll = () => {
    setPool(players.map((p) => p._id));
    setSlots(prev => prev.map(s => ({ ...s, group: [] })));
  };

  const addToSelected = (pid) => {
    if (!selectedSlotId) return alert("Pehle ek slot select karein");
    const size = Number(config.groupSize);

    setSlots(prev => prev.map(s => {
      if (s.id !== selectedSlotId) return s;
      if (s.group.length >= size) { alert("Slot full hai!"); return s; }
      return { ...s, group: [...s.group, pid] };
    }));
    setPool(prev => prev.filter(id => id !== pid));
  };

  const removeFromSlot = (sid, pid) => {
    setSlots(prev => prev.map(s => s.id === sid ? { ...s, group: s.group.filter(id => id !== pid) } : s));
    setPool(prev => [...prev, pid]);
  };

  const slotStatus = (s) => {
    const size = Number(config.groupSize);
    if (s.group.length === 0) return "empty";
    return s.group.length >= size ? "full" : "partial";
  };

  // ✅ PUBLISH: Database mein save karna
  const publish = async () => {
    if (!config.date) return alert("Date select karein");
    setSaving(true);
    try {
      const payload = {
        date: config.date,
        replaceExisting: config.replaceExisting,
        slots: slots.filter(s => s.group.length > 0).map(s => ({
          time: s.time,
          tee: s.tee,
          teams: s.group.map(tid => {
            const team = players.find(t => t._id === tid);
            return {
              id: tid,
              name: team.name,
              playerIds: team.members.map(m => m._id)
            };
          })
        }))
      };
      await api(`/api/matches/tournament/me/${tid}/schedule`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (onUpdate) onUpdate(); // Refresh parent lists
    } catch (e) {
      alert(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="orgCard">
      <div className="cardHeadRow" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3>Scheduling</h3>
          <div className="muted">{tournament?.title}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ marginRight: 20, textAlign: 'right' }}>
             <div className="tiny muted">Tournament Format:</div>
             <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>
               {tournament?.format || "Stroke Play"}
             </div>
          </div>
          <MiniBtn onClick={generateSlots}>1. Generate Slots</MiniBtn>
          <MiniBtn onClick={autoFill} kind="primary">2. Auto Fill</MiniBtn>
          <MiniBtn onClick={clearAll} kind="dangerOutline">Clear All</MiniBtn>
          <button 
            className="btn primary" 
            onClick={publish} 
            disabled={saving || slots.length === 0}
          >
            {saving ? "Publishing..." : "Publish Start List"}
          </button>
        </div>
      </div>


      <div className="schedTop" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="schedCard">
          <div className="schedTitle">Tee Time Setup</div>
          <div className="schedGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
            <label>Date <input type="date" value={config.date} min={tStart} max={tEnd} onChange={e => setConfig({ ...config, date: e.target.value })} /></label>
            <label>Start <input type="time" value={config.start} onChange={e => setConfig({ ...config, start: e.target.value })} /></label>
            <label>End <input type="time" value={config.end} onChange={e => setConfig({ ...config, end: e.target.value })} /></label>
            <label>Interval <input type="number" value={config.intervalMin} onChange={e => setConfig({ ...config, intervalMin: e.target.value })} /></label>
            <label>Group Size
              <select value={config.groupSize} onChange={e => setConfig({ ...config, groupSize: e.target.value })}>
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
              </select>
            </label>
            <label>Tees
              <select value={config.tees} onChange={e => setConfig({ ...config, tees: e.target.value })}>
                <option value="1">Tee 1 only</option><option value="2">Tee 1 + 10</option>
              </select>
            </label>
            <label className="span2" style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.replaceExisting}
                onChange={e => setConfig({ ...config, replaceExisting: e.target.checked })}
              />
              <span style={{ fontSize: '0.85rem' }}>Overwrite all previous matches before publishing?</span>
            </label>
          </div>
        </div>
        <div className="schedCard">
          <div className="schedTitle">Summary</div>
          <div className="sumRow"><span>Players:</span> <strong>{players.length}</strong></div>
          <div className="sumRow"><span>Scheduled:</span> <strong>{players.length - pool.length}</strong></div>
          <div className="sumRow"><span>In Pool:</span> <strong>{pool.length}</strong></div>
        </div>
      </div>

      <div className="schedMain" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <div className="schedPanel">
          <div className="schedPanelTitle">Team Pool ({pool.length})</div>
          <input className="schedSearch" placeholder="Search team..." onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 10 }} />
          <div className="schedPool" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {poolPlayers.map(p => (
              <div key={p._id} className="schedPlayer" onClick={() => addToSelected(p._id)} style={{ cursor: 'pointer', padding: 10, border: '1px solid #ddd', marginBottom: 5 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div className="tiny muted">{p.members.map(m => m.name).join(", ")}</div>
                <Pill>Avg HCP {p.handicap}</Pill>
              </div>
            ))}
          </div>
        </div>

        <div className="schedPanel">
          <div className="schedPanelTitle">Time Slots</div>
          <div className="schedSlots" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: '500px', overflowY: 'auto' }}>
            {slots.map(s => (
              <div key={s.id} className={`schedSlot ${selectedSlotId === s.id ? 'active' : ''}`}
                onClick={() => setSelectedSlotId(s.id)}
                style={{ border: selectedSlotId === s.id ? '2px solid blue' : '1px solid #ddd', padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{s.time}</strong> <span>{s.tee}</span>
                  <Pill kind={slotStatus(s)}>{slotStatus(s)}</Pill>
                </div>
                <div className="schedGroup" style={{ marginTop: 10 }}>
                  {s.group.map(pid => {
                    const p = players.find(x => x._id === pid);
                    return (
                      <div key={pid} className="schedChip" style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 4, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                        {p?.name} <span onClick={(e) => { e.stopPropagation(); removeFromSlot(s.id, pid); }} style={{ color: 'red', cursor: 'pointer' }}>✕</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
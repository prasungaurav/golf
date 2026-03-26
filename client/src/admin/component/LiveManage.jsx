import React, { useMemo, useState } from "react";
import "../style/LiveManage.css";

const emptyPlayer = () => ({ name: "", score: "", leader: false });

const emptyMatch = () => ({
  id: "m" + Date.now(),
  status: "live", // live | upcoming | recent
  tournament: "",
  round: "R1",
  course: "",
  city: "",
  format: "Stroke Play", // Stroke Play | Match Play | Team Play
  startedAt: "",
  thru: 0,
  players: [emptyPlayer(), emptyPlayer()],
});

// same structure as your Live.jsx
const INITIAL_MATCHES = [
  {
    id: "m1",
    status: "live",
    tournament: "City Open Championship",
    round: "R2",
    course: "Royal Greens",
    city: "Delhi",
    format: "Stroke Play",
    startedAt: "10:10 AM",
    thru: 12,
    players: [
      { name: "A. Sharma", score: "-4", leader: true },
      { name: "R. Singh", score: "-2", leader: false },
    ],
  },
  {
    id: "m2",
    status: "live",
    tournament: "Club Match Play",
    round: "R1",
    course: "Green Valley Club",
    city: "Pune",
    format: "Match Play",
    startedAt: "09:30 AM",
    thru: 9,
    players: [
      { name: "P. Verma", score: "2 UP", leader: true },
      { name: "K. Mehta", score: "AS", leader: false },
    ],
  },
  {
    id: "m3",
    status: "upcoming",
    tournament: "Weekend Pro-Am",
    round: "R1",
    course: "Lakeview Course",
    city: "Mumbai",
    format: "Stroke Play",
    startedAt: "Tomorrow 07:20 AM",
    thru: 0,
    players: [
      { name: "S. Khan", score: "-", leader: false },
      { name: "K. Mehta", score: "-", leader: false },
    ],
  },
  {
    id: "m4",
    status: "recent",
    tournament: "City Open Championship",
    round: "R1",
    course: "Royal Greens",
    city: "Delhi",
    format: "Stroke Play",
    startedAt: "Yesterday 05:10 PM",
    thru: 18,
    players: [
      { name: "A. Sharma", score: "-3", leader: true },
      { name: "R. Singh", score: "-1", leader: false },
    ],
  },
];

export default function LiveManage() {
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [tab, setTab] = useState("live"); // live | upcoming | recent
  const [query, setQuery] = useState("");

  const [matches, setMatches] = useState(INITIAL_MATCHES);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = matches.filter((m) => m.status === tab);

    if (q) {
      list = list.filter((m) => {
        const hay =
          `${m.tournament} ${m.course} ${m.city} ${m.format} ${m.round} ` +
          m.players.map((p) => p.name).join(" ");
        return hay.toLowerCase().includes(q);
      });
    }
    return list;
  }, [matches, tab, query]);

  const exportJson = useMemo(() => JSON.stringify(matches, null, 2), [matches]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      alert("Copied JSON ✅");
    } catch {
      alert("Copy failed ❌");
    }
  };

  const saveToDb = async () => {
    try {
      const res = await fetch(`${apiBase}/api/admin/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: exportJson
      });
      const data = await res.json();
      if (data?.ok) alert("Live matches saved to DB ✅");
      else alert("Save failed: " + data?.message);
    } catch (err) {
      alert("Network error");
    }
  };

  const moveItem = (arr, from, to) => {
    const copy = [...arr];
    const [sp] = copy.splice(from, 1);
    copy.splice(to, 0, sp);
    return copy;
  };

  const updateMatch = (id, patch) => {
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMatch = (id) => {
    setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  const addMatch = () => {
    const m = emptyMatch();
    m.status = tab;
    setMatches((prev) => [m, ...prev]);
  };

  const setLeader = (matchId, playerIndex) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const players = m.players.map((p, i) => ({ ...p, leader: i === playerIndex }));
        return { ...m, players };
      })
    );
  };

  const updatePlayer = (matchId, playerIndex, patch) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const players = m.players.map((p, i) => (i === playerIndex ? { ...p, ...patch } : p));
        return { ...m, players };
      })
    );
  };

  const addPlayer = (matchId) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, players: [...m.players, emptyPlayer()] } : m))
    );
  };

  const removePlayer = (matchId, playerIndex) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const players = m.players.filter((_, i) => i !== playerIndex);
        // if leader removed, reset leader to first
        if (!players.some((p) => p.leader) && players.length) players[0].leader = true;
        return { ...m, players };
      })
    );
  };

  return (
    <div className="lmWrap">
      <header className="lmHeader">
        <div>
          <h1>Live Matches Management</h1>
          <p className="muted">
            Add / edit / delete matches for Live, Upcoming & Recent. Also manage players inside a match.
          </p>
        </div>

        <div className="lmHeaderActions">
          <button className="ghostBtn" onClick={copyToClipboard}>
            Copy JSON
          </button>
          <button className="primaryBtn" onClick={saveToDb}>
            Save Changes
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="lmTabs">
        <button className={`lmTab ${tab === "recent" ? "active" : ""}`} onClick={() => setTab("recent")}>
          Recent
        </button>
        <button className={`lmTab ${tab === "live" ? "active" : ""}`} onClick={() => setTab("live")}>
          Live
        </button>
        <button className={`lmTab ${tab === "upcoming" ? "active" : ""}`} onClick={() => setTab("upcoming")}>
          Upcoming
        </button>

        <div className="lmRightTools">
          <input
            className="lmSearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tournament, player, course..."
          />
          <button className="chipBtn" onClick={addMatch}>
            + Add Match
          </button>
        </div>
      </div>

      {/* List */}
      <section className="lmCard">
        <div className="lmCardHead">
          <h2>{tab.toUpperCase()} Matches ({filtered.length})</h2>
          <span className="muted">Reorder using ↑ ↓</span>
        </div>

        <div className="lmList">
          {filtered.map((m, idx) => {
            // need actual index in matches array for reorder
            const realIndex = matches.findIndex((x) => x.id === m.id);

            return (
              <div className="lmItem" key={m.id}>
                <div className="lmItemTop">
                  <div className="badge">#{idx + 1}</div>

                  <div className="lmRowBtns">
                    <button
                      className="chipBtn"
                      disabled={realIndex <= 0}
                      onClick={() => setMatches((p) => moveItem(p, realIndex, realIndex - 1))}
                    >
                      ↑
                    </button>
                    <button
                      className="chipBtn"
                      disabled={realIndex >= matches.length - 1}
                      onClick={() => setMatches((p) => moveItem(p, realIndex, realIndex + 1))}
                    >
                      ↓
                    </button>

                    <button className="dangerBtn" onClick={() => removeMatch(m.id)}>
                      Delete Match
                    </button>
                  </div>
                </div>

                {/* Match fields */}
                <div className="lmGrid2">
                  <label className="lmLabel">
                    Tournament
                    <input
                      value={m.tournament}
                      onChange={(e) => updateMatch(m.id, { tournament: e.target.value })}
                    />
                  </label>

                  <label className="lmLabel">
                    Round
                    <input value={m.round} onChange={(e) => updateMatch(m.id, { round: e.target.value })} />
                  </label>

                  <label className="lmLabel">
                    Course
                    <input value={m.course} onChange={(e) => updateMatch(m.id, { course: e.target.value })} />
                  </label>

                  <label className="lmLabel">
                    City
                    <input value={m.city} onChange={(e) => updateMatch(m.id, { city: e.target.value })} />
                  </label>

                  <label className="lmLabel">
                    Format
                    <select value={m.format} onChange={(e) => updateMatch(m.id, { format: e.target.value })}>
                      <option>Stroke Play</option>
                      <option>Match Play</option>
                      <option>Team Play</option>
                    </select>
                  </label>

                  <label className="lmLabel">
                    Status
                    <select value={m.status} onChange={(e) => updateMatch(m.id, { status: e.target.value })}>
                      <option value="live">live</option>
                      <option value="upcoming">upcoming</option>
                      <option value="recent">recent</option>
                    </select>
                  </label>

                  <label className="lmLabel">
                    Start / Finish Text
                    <input
                      value={m.startedAt}
                      onChange={(e) => updateMatch(m.id, { startedAt: e.target.value })}
                      placeholder="10:10 AM / Tomorrow 07:20 AM / Yesterday 05:10 PM"
                    />
                  </label>

                  <label className="lmLabel">
                    Thru (holes)
                    <input
                      type="number"
                      value={m.thru}
                      onChange={(e) => updateMatch(m.id, { thru: Number(e.target.value || 0) })}
                    />
                  </label>
                </div>

                {/* Players */}
                <div className="lmPlayers">
                  <div className="lmPlayersHead">
                    <h3>Players</h3>
                    <button className="chipBtn" onClick={() => addPlayer(m.id)}>
                      + Add Player
                    </button>
                  </div>

                  <div className="lmPlayerList">
                    {m.players.map((p, pi) => (
                      <div className="lmPlayerRow" key={pi}>
                        <input
                          className="lmInput"
                          placeholder="Player name"
                          value={p.name}
                          onChange={(e) => updatePlayer(m.id, pi, { name: e.target.value })}
                        />

                        <input
                          className="lmInput"
                          placeholder="Score e.g. -4 / 2 UP / AS"
                          value={p.score}
                          onChange={(e) => updatePlayer(m.id, pi, { score: e.target.value })}
                        />

                        <label className="lmCheck">
                          <input
                            type="radio"
                            name={`leader-${m.id}`}
                            checked={!!p.leader}
                            onChange={() => setLeader(m.id, pi)}
                          />
                          Leader
                        </label>

                        <button className="dangerBtn" onClick={() => removePlayer(m.id, pi)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && <div className="lmEmpty">No matches found.</div>}
      </section>

      {/* JSON Preview */}
      <section className="lmCard">
        <div className="lmCardHead">
          <h2>Export Preview (JSON)</h2>
          <span className="muted">Store this in DB and load in Live.jsx</span>
        </div>
        <pre className="lmCode">{exportJson}</pre>
      </section>
    </div>
  );
}

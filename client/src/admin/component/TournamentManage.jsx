import React, { useMemo, useState } from "react";
import "../style/TournamentManage.css";

const emptyExtra = () => ({
  id: "e" + Date.now() + Math.floor(Math.random() * 1000),
  name: "",
  price: 0,
});

const emptySponsor = () => ({
  id: "s" + Date.now() + Math.floor(Math.random() * 1000),
  name: "",
  tier: "Partner",
  url: "#",
});

const emptyTournament = () => ({
  id: "t" + Date.now(),
  name: "",
  status: "draft", // draft | open | live | completed
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
  registration: {
    fee: 0,
    currency: "₹",
    maxPlayers: 0,
    waitlistEnabled: true,
    handicapLimit: "0 – 24",
    teamAllowed: false,
    extras: [],
  },
  sponsors: [],
});

const INITIAL_TOURNAMENTS = [
  {
    id: "t1",
    name: "City Open Championship",
    status: "open",
    banner:
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1600&q=70",
    course: "Royal Greens",
    city: "Delhi",
    dates: "Feb 10–12, 2026",
    teeOffWindow: "07:00 AM – 03:30 PM",
    format: "Stroke Play",
    rounds: 3,
    description:
      "A premium city championship featuring top amateurs and club pros. Fast greens, tight fairways, and a clean competitive vibe.",
    regClosesAt: "Feb 08, 2026 11:59 PM",
    rules: [
      "Stroke Play • 54 holes • Cut after Round 2 (Top 40 + ties)",
      "USGA Rules • Local rules applied on-course",
      "Handicap required for Net category eligibility",
    ],
    registration: {
      fee: 1999,
      currency: "₹",
      maxPlayers: 120,
      waitlistEnabled: true,
      handicapLimit: "0 – 24",
      teamAllowed: false,
      extras: [
        { id: "e1", name: "Dinner Pass", price: 499 },
        { id: "e2", name: "Merch Pack", price: 799 },
        { id: "e3", name: "Mulligans (2)", price: 299 },
      ],
    },
    sponsors: [
      { id: "s1", name: "GolfPro Gear", tier: "Title", url: "#" },
      { id: "s2", name: "GreenFuel Energy", tier: "Gold", url: "#" },
      { id: "s3", name: "Ace Wearables", tier: "Silver", url: "#" },
      { id: "s4", name: "Royal Greens Club", tier: "Partner", url: "#" },
    ],
  },
  {
    id: "t2",
    name: "Weekend Pro-Am",
    status: "open",
    banner:
      "https://images.unsplash.com/photo-1500930287309-7d0d2a9b05cb?auto=format&fit=crop&w=1600&q=70",
    course: "Lakeview Course",
    city: "Mumbai",
    dates: "Mar 02–03, 2026",
    teeOffWindow: "06:30 AM – 02:00 PM",
    format: "Team Play",
    rounds: 2,
    description: "Pro-Am fun format with team scoring and prizes. Great for new golfers too.",
    regClosesAt: "Feb 28, 2026 11:59 PM",
    rules: ["Team Play • 36 holes • Stableford scoring", "Local rules apply"],
    registration: {
      fee: 1499,
      currency: "₹",
      maxPlayers: 80,
      waitlistEnabled: false,
      handicapLimit: "0 – 30",
      teamAllowed: true,
      extras: [{ id: "e11", name: "Lunch Voucher", price: 299 }],
    },
    sponsors: [{ id: "s11", name: "Ace Wearables", tier: "Title", url: "#" }],
  },
  {
    id: "t3",
    name: "Club Match Play",
    status: "live",
    banner:
      "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1600&q=1600&q=70",
    course: "Green Valley Club",
    city: "Pune",
    dates: "Jan 24–26, 2026",
    teeOffWindow: "08:00 AM – 04:00 PM",
    format: "Match Play",
    rounds: 3,
    description: "Match play bracket with intense head-to-head battles and live scoring.",
    regClosesAt: "Jan 20, 2026 11:59 PM",
    rules: ["Match Play • Bracket format", "Tie-break: sudden death"],
    registration: {
      fee: 999,
      currency: "₹",
      maxPlayers: 64,
      waitlistEnabled: true,
      handicapLimit: "0 – 20",
      teamAllowed: false,
      extras: [],
    },
    sponsors: [{ id: "s21", name: "GreenFuel Energy", tier: "Gold", url: "#" }],
  },
];

export default function TournamentManage() {
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [tournaments, setTournaments] = useState(INITIAL_TOURNAMENTS);
  const [activeId, setActiveId] = useState(INITIAL_TOURNAMENTS[0]?.id || "");
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterCity, setFilterCity] = useState("all");

  const active = useMemo(
    () => tournaments.find((x) => x.id === activeId) || tournaments[0],
    [tournaments, activeId]
  );

  const cities = useMemo(() => Array.from(new Set(tournaments.map((x) => x.city).filter(Boolean))), [tournaments]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tournaments.filter((x) => {
      if (filterStatus !== "all" && x.status !== filterStatus) return false;
      if (filterFormat !== "all" && x.format !== filterFormat) return false;
      if (filterCity !== "all" && x.city !== filterCity) return false;

      if (!q) return true;
      const hay = `${x.name} ${x.city} ${x.course} ${x.format} ${x.dates}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tournaments, query, filterStatus, filterFormat, filterCity]);

  const exportJson = useMemo(() => JSON.stringify(tournaments, null, 2), [tournaments]);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      alert("Copied JSON ✅");
    } catch {
      alert("Copy failed ❌");
    }
  };

  const saveToDb = async () => {
    try {
      const res = await fetch(`${apiBase}/api/admin/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: exportJson
      });
      const data = await res.json();
      if (data?.ok) alert("Tournaments config saved to DB ✅");
      else alert("Save failed: " + data?.message);
    } catch (err) {
      alert("Network error");
    }
  };

  const updateActive = (patch) => {
    setTournaments((prev) => prev.map((x) => (x.id === active.id ? { ...x, ...patch } : x)));
  };

  const updateReg = (patch) => {
    setTournaments((prev) =>
      prev.map((x) => (x.id === active.id ? { ...x, registration: { ...x.registration, ...patch } } : x))
    );
  };

  const removeTournament = (id) => {
    setTournaments((prev) => prev.filter((x) => x.id !== id));
    if (activeId === id) {
      const next = tournaments.find((x) => x.id !== id);
      setActiveId(next?.id || "");
    }
  };

  const addTournament = () => {
    const t = emptyTournament();
    setTournaments((prev) => [t, ...prev]);
    setActiveId(t.id);
  };

  const addRule = () => updateActive({ rules: [...(active.rules || []), ""] });
  const updateRule = (idx, value) =>
    updateActive({ rules: active.rules.map((r, i) => (i === idx ? value : r)) });
  const removeRule = (idx) => updateActive({ rules: active.rules.filter((_, i) => i !== idx) });

  const addExtra = () => updateReg({ extras: [...active.registration.extras, emptyExtra()] });
  const updateExtra = (id, patch) =>
    updateReg({ extras: active.registration.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const removeExtra = (id) => updateReg({ extras: active.registration.extras.filter((e) => e.id !== id) });

  const addSponsor = () => updateActive({ sponsors: [...active.sponsors, emptySponsor()] });
  const updateSponsor = (id, patch) =>
    updateActive({ sponsors: active.sponsors.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeSponsor = (id) => updateActive({ sponsors: active.sponsors.filter((s) => s.id !== id) });

  return (
    <div className="tmWrap">
      <header className="tmHeader">
        <div>
          <h1>Tournament Management</h1>
          <p className="muted">Create, edit and publish tournaments. Export JSON for DB storage.</p>
        </div>

        <div className="tmHeaderActions">
          <button className="ghostBtn" onClick={copyJson}>
            Copy JSON
          </button>
          <button className="primaryBtn" onClick={saveToDb}>
            Save Changes
          </button>
        </div>
      </header>

      <div className="tmLayout">
        {/* LEFT LIST */}
        <aside className="tmListCard">
          <div className="tmListTop">
            <div className="tmListTitle">All Tournaments</div>
            <button className="chipBtn" onClick={addTournament}>
              + Add
            </button>
          </div>

          <input
            className="tmSearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, city, course..."
          />

          <div className="tmFilters">
            <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>

            <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)}>
              <option value="all">All Formats</option>
              <option value="Stroke Play">Stroke Play</option>
              <option value="Match Play">Match Play</option>
              <option value="Team Play">Team Play</option>
            </select>
          </div>

          <div className="tmList">
            {filteredList.map((x) => (
              <button
                key={x.id}
                className={`tmListItem ${x.id === activeId ? "active" : ""}`}
                onClick={() => setActiveId(x.id)}
              >
                <div className="tmListItemLeft">
                  <div className="tmName">{x.name || "Untitled Tournament"}</div>
                  <div className="tmMeta">
                    {x.city || "—"} • {x.course || "—"} • {x.dates || "—"}
                  </div>
                </div>
                <span className={`tmBadge ${x.status}`}>{x.status}</span>
              </button>
            ))}
            {filteredList.length === 0 && <div className="tmEmpty">No tournaments found.</div>}
          </div>
        </aside>

        {/* RIGHT EDITOR */}
        {active && (
          <main className="tmEditor">
            {/* Basic */}
            <section className="tmCard">
              <div className="tmCardHead">
                <h2>Basics</h2>
                <button className="dangerBtn" onClick={() => removeTournament(active.id)}>
                  Delete Tournament
                </button>
              </div>

              <div className="tmGrid2">
                <label className="tmLabel">
                  Name
                  <input value={active.name} onChange={(e) => updateActive({ name: e.target.value })} />
                </label>

                <label className="tmLabel">
                  Status
                  <select value={active.status} onChange={(e) => updateActive({ status: e.target.value })}>
                    <option value="draft">draft</option>
                    <option value="open">open</option>
                    <option value="live">live</option>
                    <option value="completed">completed</option>
                  </select>
                </label>

                <label className="tmLabel">
                  City
                  <input value={active.city} onChange={(e) => updateActive({ city: e.target.value })} />
                </label>

                <label className="tmLabel">
                  Course
                  <input value={active.course} onChange={(e) => updateActive({ course: e.target.value })} />
                </label>

                <label className="tmLabel">
                  Dates (display)
                  <input value={active.dates} onChange={(e) => updateActive({ dates: e.target.value })} />
                </label>

                <label className="tmLabel">
                  Tee-off Window
                  <input
                    value={active.teeOffWindow}
                    onChange={(e) => updateActive({ teeOffWindow: e.target.value })}
                  />
                </label>

                <label className="tmLabel">
                  Format
                  <select value={active.format} onChange={(e) => updateActive({ format: e.target.value })}>
                    <option>Stroke Play</option>
                    <option>Match Play</option>
                    <option>Team Play</option>
                  </select>
                </label>

                <label className="tmLabel">
                  Rounds
                  <input
                    type="number"
                    value={active.rounds}
                    onChange={(e) => updateActive({ rounds: Number(e.target.value || 0) })}
                  />
                </label>

                <label className="tmLabel tmFull">
                  Banner URL / Path
                  <input value={active.banner} onChange={(e) => updateActive({ banner: e.target.value })} />
                </label>
              </div>

              <div className="tmBannerPreview" style={{ backgroundImage: `url(${active.banner})` }} />

              <label className="tmLabel">
                Description
                <textarea
                  value={active.description}
                  onChange={(e) => updateActive({ description: e.target.value })}
                  rows={4}
                />
              </label>
            </section>

            {/* Registration */}
            <section className="tmCard">
              <div className="tmCardHead">
                <h2>Registration</h2>
                <span className="muted">Fee, limits, extras</span>
              </div>

              <div className="tmGrid2">
                <label className="tmLabel">
                  Fee
                  <input
                    type="number"
                    value={active.registration.fee}
                    onChange={(e) => updateReg({ fee: Number(e.target.value || 0) })}
                  />
                </label>

                <label className="tmLabel">
                  Currency
                  <input
                    value={active.registration.currency}
                    onChange={(e) => updateReg({ currency: e.target.value })}
                  />
                </label>

                <label className="tmLabel">
                  Max Players
                  <input
                    type="number"
                    value={active.registration.maxPlayers}
                    onChange={(e) => updateReg({ maxPlayers: Number(e.target.value || 0) })}
                  />
                </label>

                <label className="tmLabel">
                  Handicap Limit
                  <input
                    value={active.registration.handicapLimit}
                    onChange={(e) => updateReg({ handicapLimit: e.target.value })}
                  />
                </label>

                <label className="tmLabel">
                  Waitlist Enabled
                  <select
                    value={active.registration.waitlistEnabled ? "yes" : "no"}
                    onChange={(e) => updateReg({ waitlistEnabled: e.target.value === "yes" })}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>

                <label className="tmLabel">
                  Team Allowed
                  <select
                    value={active.registration.teamAllowed ? "yes" : "no"}
                    onChange={(e) => updateReg({ teamAllowed: e.target.value === "yes" })}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                <label className="tmLabel tmFull">
                  Registration Closes At (text or ISO)
                  <input value={active.regClosesAt} onChange={(e) => updateActive({ regClosesAt: e.target.value })} />
                </label>
              </div>

              <div className="tmSectionHead">
                <h3>Extras</h3>
                <button className="chipBtn" onClick={addExtra}>
                  + Add Extra
                </button>
              </div>

              <div className="tmMiniList">
                {active.registration.extras.map((e) => (
                  <div className="tmMiniRow" key={e.id}>
                    <input
                      className="tmInput"
                      placeholder="Extra name"
                      value={e.name}
                      onChange={(ev) => updateExtra(e.id, { name: ev.target.value })}
                    />
                    <input
                      className="tmInput"
                      type="number"
                      placeholder="Price"
                      value={e.price}
                      onChange={(ev) => updateExtra(e.id, { price: Number(ev.target.value || 0) })}
                    />
                    <button className="dangerBtn" onClick={() => removeExtra(e.id)}>
                      Delete
                    </button>
                  </div>
                ))}
                {active.registration.extras.length === 0 && <div className="tmEmptySmall">No extras.</div>}
              </div>
            </section>

            {/* Rules */}
            <section className="tmCard">
              <div className="tmCardHead">
                <h2>Rules</h2>
                <button className="chipBtn" onClick={addRule}>
                  + Add Rule
                </button>
              </div>

              <div className="tmMiniList">
                {active.rules.map((r, idx) => (
                  <div className="tmMiniRow" key={idx}>
                    <input
                      className="tmInput"
                      placeholder="Rule text"
                      value={r}
                      onChange={(e) => updateRule(idx, e.target.value)}
                    />
                    <button className="dangerBtn" onClick={() => removeRule(idx)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Sponsors */}
            <section className="tmCard">
              <div className="tmCardHead">
                <h2>Sponsors</h2>
                <button className="chipBtn" onClick={addSponsor}>
                  + Add Sponsor
                </button>
              </div>

              <div className="tmMiniList">
                {active.sponsors.map((s) => (
                  <div className="tmSponsorRow" key={s.id}>
                    <input
                      className="tmInput"
                      placeholder="Sponsor name"
                      value={s.name}
                      onChange={(e) => updateSponsor(s.id, { name: e.target.value })}
                    />

                    <select value={s.tier} onChange={(e) => updateSponsor(s.id, { tier: e.target.value })}>
                      <option>Title</option>
                      <option>Gold</option>
                      <option>Silver</option>
                      <option>Partner</option>
                    </select>

                    <input
                      className="tmInput"
                      placeholder="URL"
                      value={s.url}
                      onChange={(e) => updateSponsor(s.id, { url: e.target.value })}
                    />

                    <button className="dangerBtn" onClick={() => removeSponsor(s.id)}>
                      Delete
                    </button>
                  </div>
                ))}
                {active.sponsors.length === 0 && <div className="tmEmptySmall">No sponsors.</div>}
              </div>
            </section>

            {/* JSON Preview */}
            <section className="tmCard">
              <div className="tmCardHead">
                <h2>Export Preview (JSON)</h2>
                <span className="muted">Use this payload in MongoDB</span>
              </div>
              <pre className="tmCode">{exportJson}</pre>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

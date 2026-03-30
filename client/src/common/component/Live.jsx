import React, { useMemo, useState, useEffect } from "react";
import "../style/Live.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Live() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("live"); // recent | live | upcoming
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  const [sort, setSort] = useState("featured");

  // 🔥 Fetch ALL matches (FIXED)
  const fetchMatches = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/matches/all`);
      const data = await res.json();

      console.log("ALL MATCHES:", data);

      if (!data.ok) {
        console.error("Fetch error:", data.message);
        setMatches([]);
      } else {
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error(err);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 5000); // auto refresh
    return () => clearInterval(interval);
  }, []);

  // 🔄 Convert backend match → UI format
  const formattedMatches = useMemo(() => {
    const now = Date.now();
    return matches.map((m) => {
      const isScheduled = String(m.status).toLowerCase() === "scheduled";
      const isTimeUp = m.startTime && new Date(m.startTime).getTime() <= now;
      const isLive = String(m.status).toLowerCase() === "live" || String(m.status).toLowerCase() === "paused" || (isScheduled && isTimeUp);
      const isFinished = ["finished", "cancelled"].includes(String(m.status).toLowerCase());

      const uiStatus = isLive ? "live" : isFinished ? "recent" : "upcoming";
      
      // Date formatting helper
      const fmt = (iso) => {
        if (!iso) return "—";
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "—";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = d.getDate();
        const mon = months[d.getMonth()];
        const yr = d.getFullYear();
        let h = d.getHours();
        const min = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${day} ${mon} ${yr}, ${h}:${min} ${ampm}`;
      };

      const isMatchPlay = String(m.format || "").toLowerCase().includes("match");
      const isStableford = String(m.format || "").toLowerCase().includes("stableford");

      let pA_display = m.scoreA ?? "-";
      let pB_display = m.scoreB ?? "-";
      let standing = "";

      if (isMatchPlay && m.scoreA !== undefined && m.scoreB !== undefined) {
          const diff = m.scoreA - m.scoreB;
          if (diff === 0) standing = "All Sq";
          else standing = diff > 0 ? `${diff} Up` : `${Math.abs(diff)} Up`;
          // In match play, we might show '1' for hole win, so A=3 B=2 means A is 1 Up.
      }

      return {
        id: m._id,
        status: uiStatus,
        realStatus: (isScheduled && isTimeUp && !isFinished) ? "LIVE" : m.status?.toUpperCase(),
        tournament: m.name || "Tournament",
        isPrivate: m.visibility === "private" || m.status === "draft",
        round: m.round || "R1",
        course: m.ground || "Course",
        city: m.city || "India",
        format: m.format || "Stroke Play",
        startedAt: fmt(m.startTime || m.createdAt),
        thru: m.hole || 0,
        standing: standing,
        players: [
          {
            name: m.teamA?.[0]?.playerName || m.teamAName || "Player A",
            score: pA_display,
            leader: (m.scoreA ?? 0) < (m.scoreB ?? 0),
          },
          {
            name: m.teamB?.[0]?.playerName || m.teamBName || "Player B",
            score: pB_display,
            leader: (m.scoreB ?? 0) < (m.scoreA ?? 0),
          },
        ],
      };
    });
  }, [matches]);

  // 🔍 Filtering + Sorting
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = formattedMatches
      .filter((m) => !m.isPrivate) // Hide private/draft from public view
      .filter((m) => m.status === tab);

    if (q) {
      list = list.filter((m) => {
        const hay = `${m.tournament} ${m.course} ${m.city} ${m.format} ${m.round} ${m.players
          .map((p) => p.name)
          .join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (format !== "all") {
      list = list.filter((m) => m.format.toLowerCase() === format.toLowerCase());
    }

    if (sort === "thruHigh") list = [...list].sort((a, b) => b.thru - a.thru);
    if (sort === "thruLow") list = [...list].sort((a, b) => a.thru - b.thru);

    return list;
  }, [formattedMatches, tab, query, format, sort]);

  return (
    <div className="livePage">
      <div className="liveGrid">
        {/* LEFT SIDE */}
        <aside className="liveSide leftSide">
          <div className="sideCard stickySide">
            <div className="adLabel">Advertisement</div>
            <h4 className="sideTitle">Premium Golf Gear</h4>
            <p className="sideText">
              Get exclusive discounts on golf kits, gloves & clubs.
            </p>
            <button className="primaryBtn">Shop Now</button>
          </div>

          <div className="sideCard">
            <div className="adLabel">Sponsored</div>
            <h4 className="sideTitle">Join Membership</h4>
            <p className="sideText">Access premium tournaments & perks.</p>
            <button className="ghostBtn">View Plans</button>
          </div>
        </aside>

        {/* CENTER */}
        <main className="liveCenter">
          <div className="liveHeader">
            <div>
              <h1>Live</h1>
              <div className="liveSub">
                Follow matches in real-time • Search • Filter • Track
              </div>
            </div>

            <div className="livePills">
              <span className="pillCount">
                {formattedMatches.filter((m) => m.status === "live").length} Live Now
              </span>
              <span className="pillUpdate">Auto updating...</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="liveTabs">
            <button className={`liveTab ${tab === "recent" ? "active" : ""}`} onClick={() => setTab("recent")}>
              Recent
            </button>
            <button className={`liveTab ${tab === "live" ? "active" : ""}`} onClick={() => setTab("live")}>
              Live
            </button>
            <button className={`liveTab ${tab === "upcoming" ? "active" : ""}`} onClick={() => setTab("upcoming")}>
              Upcoming
            </button>
          </div>

          {/* Search + Filters */}
          <div className="liveToolbar">
            <div className="liveSearch">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tournament, player, course..."
              />
            </div>

            <div className="liveFilters">
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="all">All Formats</option>
                <option value="stroke play">Stroke Play</option>
                <option value="match play">Match Play</option>
                <option value="team play">Team Play</option>
              </select>

              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="thruHigh">Most Progress</option>
                <option value="thruLow">Least Progress</option>
              </select>

              <button className="moreBtn">More ▾</button>
            </div>
          </div>

          {/* LIST */}
          <div className="liveList oneLine">
            {loading ? (
              <div className="emptyLive">Loading matches...</div>
            ) : filtered.length === 0 ? (
              <div className="emptyLive">
                No matches found. Try changing filters or search.
              </div>
            ) : (
              filtered.map((match) => (
                <div className="liveCard" key={match.id}>
                  <div className="liveCardTop">
                    <div>
                      <h3 className="tTitle">
                        {match.tournament} <span className="tRound">{match.round}</span>
                      </h3>
                      <div className="liveMeta">
                        {match.course} • {match.city} • {match.format}
                      </div>
                    </div>

                    <div className="rightBadge">
                      {match.status === "live" ? (
                        <span className="liveBadge">{match.realStatus}</span>
                      ) : match.status === "upcoming" ? (
                        <span className="upBadge">{match.realStatus}</span>
                      ) : (
                        <span className="recentBadge">{match.realStatus}</span>
                      )}
                    </div>
                  </div>

                  <div className="liveBody">
                    <div className="holeInfo">
                      {match.status === "live"
                        ? `Thru Hole ${match.thru}`
                        : match.status === "upcoming"
                        ? `Starts: ${match.startedAt}`
                        : `Finished: ${match.startedAt}`}
                    </div>

                    <div className="playerList">
                      {match.players.map((p, i) => (
                        <div className={`playerRow ${p.leader ? "leader" : ""}`} key={i}>
                          <span className="playerName">{p.name}</span>
                          <span className="playerScore">{p.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="liveActions">
                    <button className="smallBtn">
                      {match.status === "live" ? "View Live" : "View Details"}
                    </button>
                    <button className="ghostBtn">Follow</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        {/* RIGHT SIDE */}
        <aside className="liveSide rightSide">
          <div className="sideCard stickySide">
            <div className="adLabel">Featured</div>
            <h4 className="sideTitle">Shot of the Day</h4>

            <div className="featuredVideo">
              <iframe
                title="Featured Golf Video"
                src="https://www.youtube.com/embed/6iQm1sJYvD8"
                allowFullScreen
              />
            </div>

            <p className="sideText">
              Watch today’s best highlight. More videos coming soon.
            </p>

            <button className="ghostBtn">View All Videos</button>
          </div>

          <div className="sideCard">
            <div className="adLabel">Update</div>
            <h4 className="sideTitle">Live Rules Tip</h4>
            <p className="sideText">
              Ball moved by wind? No penalty in most cases.
            </p>
            <button className="chipBtn">Read More</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
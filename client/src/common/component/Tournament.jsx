// Tournament.jsx (DD/MM/YYYY everywhere for DISPLAY)
// NOTE: <input type="date"> still needs YYYY-MM-DD (that’s browser standard).
// Here we only change UI display dates to DD/MM/YYYY.

import React, { useMemo, useRef, useState, useEffect } from "react";
import "../style/Tournament.css";
import { useAuth } from "./AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// --------------------
// ✅ DATE HELPERS
// --------------------
function toDateSafe(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function fmtDMY(v) {
  const d = toDateSafe(v);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`; // ✅ DD/MM/YYYY
}

function fmtDMYRange(start, end) {
  const a = fmtDMY(start);
  const b = fmtDMY(end);
  if (!a && !b) return "";
  if (a && !b) return a;
  if (!a && b) return b;
  return `${a} – ${b}`;
}

function formatMoney(amount, currency = "₹") {
  const n = Number(amount || 0);
  return `${currency}${n.toLocaleString("en-IN")}`;
}

function daysLeft(regClosesAt) {
  if (!regClosesAt) return null;
  const end = new Date(regClosesAt).getTime();
  const now = Date.now();
  if (Number.isNaN(end)) return null;
  const diff = end - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

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

function pickName(x) {
  return x?.name || x?.playerName || x?.title || x?.companyName || x?.organiserName || "Unknown";
}

export default function Tournament() {
  // page state
  const [tab, setTab] = useState("overview");
  const [fieldQuery, setFieldQuery] = useState("");
  const [selectedExtras, setSelectedExtras] = useState({});
  const [regStatus, setRegStatus] = useState("open"); // demo only (kept)

  // ✅ LOCK STATE
  const [isLocked, setIsLocked] = useState(false);

  // drawer filters (for list)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [listCity, setListCity] = useState("all");
  const [listStatus, setListStatus] = useState("all");
  const [listFormat, setListFormat] = useState("all");
  const [joinUrl, setJoinUrl] = useState("");

  // sticky bar
  const heroRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // backend data
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tournaments, setTournaments] = useState([]); // list
  const [tournamentId, setTournamentId] = useState(null); // selected for CONTENT

  const [tournament, setTournament] = useState(null); // details of selected
  const [field, setField] = useState([]);
  const [teeTimes, setTeeTimes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [updates, setUpdates] = useState([]);

  // ✅ HERO SLIDER STATE (PREVIEW ONLY)
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHoveringHero, setIsHoveringHero] = useState(false);
  const heroTrackRef = useRef(null);

  // ✅ USER + MY REGISTRATION
  const { user: me } = useAuth();
  const [myReg, setMyReg] = useState(null);
  const [registering, setRegistering] = useState(false);

  // ----------------------------
  // LOAD MY REGISTRATION
  // ----------------------------
  const loadMyReg = async (tid) => {
    if (!tid) {
      setMyReg(null);
      return;
    }
    try {
      const data = await api("/api/tournaments/players/me", { method: "GET" });
      const list = data?.tournaments || data?.items || data?.data || [];
      const found =
        list.find((x) => String(x?.tournament?._id || x?.tournament?.id) === String(tid)) ||
        list.find((x) => String(x?.tournamentId?._id || x?.tournamentId?.id || x?.tournamentId) === String(tid)) ||
        null;
      if (found?.registration) setMyReg(found.registration);
      else setMyReg(found);
    } catch {
      setMyReg(null);
    }
  };

  // ----------------------------
  // LOAD LIST (Init)
  // ----------------------------
  const loadList = async () => {
    setErr("");
    try {
      const data = await api("/api/tournaments", { method: "GET" });
      const list = data?.tournaments || [];
      setTournaments(list);

      // Check URL for tid
      const params = new URLSearchParams(window.location.search);
      const tid = params.get("tid");

      if (tid) {
        setTournamentId(tid);
      } else if (!tournamentId && list.length) {
        setTournamentId(list[0]._id || list[0].id);
      }
    } catch (e) {
      setErr(e.message);
    }
  };


  // ----------------------------
  // LOAD DETAILS (Full)
  // ----------------------------
  const loadFull = async (id) => {
    if (!id) return;
    setErr("");
    setLoading(true);
    try {
      const data = await api(`/api/tournaments/${id}`, { method: "GET" });
      setTournament(data.tournament || null);
      setField(Array.isArray(data.field) ? data.field : []);
      setTeeTimes(Array.isArray(data.teeTimes) ? data.teeTimes : []);
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setUpdates(Array.isArray(data.updates) ? data.updates : []);

      setSelectedExtras({});
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  // INIT
  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadList();
      setLoading(false);
    })();
  }, []);

  // when tournamentId changes (explicit user action)
  useEffect(() => {
    if (tournamentId) {
      loadFull(tournamentId);
      loadMyReg(tournamentId);
    }
  }, [tournamentId]);

  // sticky bar observer
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => setShowStickyBar(!entries[0].isIntersecting),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ---------------------------------------
  // Hero Gallery Slides
  // ---------------------------------------
  const heroSlides = useMemo(() => {
    const list = (tournaments || []).map((x) => {
      const reg = x.registration || {};
      const closes = reg.regClosesAt || x.regClosesAt;
      return { ...x, _days: daysLeft(closes), _closes: closes };
    });
    const withDays = list.filter((x) => x._days != null);
    const closingSoon = withDays.filter((x) => x._days > 0 && x._days <= 5).sort((a, b) => a._days - b._days);
    const others = withDays
      .filter((x) => !closingSoon.some((c) => (c._id || c.id) === (x._id || x.id)))
      .sort((a, b) => a._days - b._days);
    return [...closingSoon, ...others].slice(0, 5);
  }, [tournaments]);

  // ✅ AUTOPLAY (Independent of content)
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    if (isHoveringHero) return;

    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroSlides.length, isHoveringHero]);

  // ✅ KEYBOARD NAVIGATION
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (heroSlides.length <= 1) return;
      if (e.key === "ArrowLeft") {
        setHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
      } else if (e.key === "ArrowRight") {
        setHeroIndex((prev) => (prev + 1) % heroSlides.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [heroSlides.length]);

  // Smooth scroll dots
  useEffect(() => {
    const track = heroTrackRef.current;
    if (!track) return;
    const active = track.querySelector(".heroSlide.active");
    if (active?.scrollIntoView) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [heroIndex]);

  // ---------------------------------------
  // Map backend tournament -> UI shape (t)
  // for ACTIVE CONTENT
  // ---------------------------------------
  const t = useMemo(() => {
    if (!tournament) return null;
    const reg = tournament.registration || {};
    return {
      id: tournament._id || tournament.id,
      name: tournament.title || tournament.name,
      status: tournament.status || "draft",
      banner: tournament.bannerUrl || tournament.banner || "",
      course: tournament.course || tournament.ground || "",
      city: tournament.city || "",
      dates: tournament.datesText || fmtDMYRange(tournament.startDate, tournament.endDate),
      teeOffWindow: tournament.teeOffWindow || "",
      format: tournament.format || "Stroke Play",
      rounds: tournament.rounds || 1,
      description: tournament.description || "",
      regClosesAt: reg.regClosesAt || reg.closeAt || tournament.regClosesAt,
      rules: tournament.rules || [],
      registration: {
        fee: reg.fee ?? 0,
        currency: reg.currency || "₹",
        maxPlayers: reg.maxPlayers ?? tournament.maxPlayers ?? 0,
        waitlistEnabled: !!reg.waitlistEnabled,
        handicapLimit: reg.handicapLimit || "",
        teamAllowed: !!reg.teamAllowed,
        teamSize: reg.teamSize || 1,
        extras: Array.isArray(reg.extras) ? reg.extras : [],
      },
      sponsors: Array.isArray(tournament.sponsors) ? tournament.sponsors : [],
    };
  }, [tournament]);

  // ✅ ACTIVE SLIDE (Preview)
  const currentSlide = useMemo(() => {
    const s = heroSlides[heroIndex];
    if (!s) return null;
    const reg = s.registration || {};
    return {
      id: s._id || s.id,
      name: s.title || s.name,
      status: s.status || "draft",
      banner: s.bannerUrl || s.banner || "",
      course: s.course || s.ground || "",
      city: s.city || "",
      dates: s.datesText || fmtDMYRange(s.startDate, s.endDate),
      teeOffWindow: s.teeOffWindow || "",
      format: s.format || "Stroke Play",
      rounds: s.rounds || 1,
      regClosesAt: reg.regClosesAt || s.regClosesAt,
      registration: {
        fee: reg.fee ?? 0,
        currency: reg.currency || "₹",
        maxPlayers: reg.maxPlayers ?? s.maxPlayers ?? 0,
        teamSize: reg.teamSize || s.teamSize || 1,
      }
    };
  }, [heroSlides, heroIndex]);

  const filteredField = useMemo(() => {
    const q = fieldQuery.trim().toLowerCase();
    if (!q) return field;
    return field.filter((p) => `${p.name || ""} ${p.club || ""} ${p.handicap ?? ""}`.toLowerCase().includes(q));
  }, [fieldQuery, field]);

  const extrasTotal = useMemo(() => {
    if (!t) return 0;
    return Object.entries(selectedExtras).reduce((sum, [id, enabled]) => {
      if (!enabled) return sum;
      const item = (t.registration.extras || []).find((x) => String(x.id || x._id) === String(id));
      return sum + (Number(item?.price || 0) || 0);
    }, 0);
  }, [selectedExtras, t]);

  const totalPay = (t?.registration?.fee || 0) + extrasTotal;

  const statusPill = null;

  const closeInDays = daysLeft(t?.regClosesAt);

  const urgency =
    String(t?.status || "").toLowerCase() === "live"
      ? "Live now"
      : closeInDays != null
        ? closeInDays <= 0
          ? "Registration closed"
          : closeInDays <= 3
            ? `Closing in ${closeInDays} day${closeInDays === 1 ? "" : "s"}`
            : `Closes in ${closeInDays} days`
        : "Registration open";

  // ----------------------------
  // ✅ REGISTER HANDLER
  // ------  const [registering, setRegistering] = useState(false);
  const [partnerIds, setPartnerIds] = useState([]);
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  // ✅ INITIALIZE PARTNER IDS ON TOURNAMENT CHANGE
  useEffect(() => {
    const size = t?.registration?.teamSize || 1;
    if (size > 1) {
      setPartnerIds(new Array(size - 1).fill(""));
    } else {
      setPartnerIds([]);
    }
  }, [t?._id, t?.registration?.teamSize]);
  const [teamName, setTeamName] = useState("");
  const [friendsList, setFriendsList] = useState([]);

  useEffect(() => {
    if (me?.role === "player") {
      fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/friends/list`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          if (data.ok) setFriendsList(data.friends || []);
        })
        .catch(err => console.error("Friends fetch error:", err));
    }
  }, [me]);

  const handleRegister = async () => {
    // me?
    if (!me) {
      alert("Please login first to register.");
      return;
    }

    // wrong role
    if (String(me.role || "").toLowerCase() !== "player") {
      alert("You must login as Player to register.");
      return;
    }

    // registration closed by date
    const regClosed = closeInDays != null && closeInDays <= 0;
    if (regClosed) {
      alert("Registration closed.");
      return;
    }

    // format check (validation)
    const teamSize = t?.registration?.teamSize || 1;
    if (teamSize > 1 && !teamName.trim()) {
      alert("Please provide a team name.");
      return;
    }

    // max partners check
    const partners = partnerIds.filter(Boolean);
    if (partners.length > teamSize - 1) {
      alert(`This format allows a maximum of ${teamSize} players per team.`);
      return;
    }

    // already registered
    if (myReg && myReg.status && myReg.status !== "rejected") {
      alert(`Already registered: ${myReg.status}`);
      return;
    }

    try {
      setRegistering(true);
      setErr("");

      // ✅ build extrasChosen from selectedExtras
      const extrasChosen = Object.entries(selectedExtras)
        .filter(([_, enabled]) => enabled)
        .map(([id]) => {
          const ex = (t?.registration?.extras || []).find(
            (x) => String(x._id || x.id) === String(id)
          );
          if (!ex) return null;
          return {
            extraId: ex._id || ex.id, // support both
            name: ex.name,
            price: Number(ex.price || 0),
          };
        })
        .filter(Boolean);

      // ✅ Your backend route should accept this.
      await api(`/api/tournaments/players/me/${t.id}/register`, {
        method: "POST",
        body: JSON.stringify({
          extrasChosen,
          teamName,
          partnerIds: partners
        }),
      });

      alert("Registration submitted ✅");
      await loadMyReg(t.id);
      setPartnerIds([]);
      setTeamName("");
    } catch (e) {
      alert(e.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleJoinPrivate = () => {
    if (!joinUrl) return alert("Please paste a tournament URL first.");
    try {
      const url = new URL(joinUrl);
      // Support both ?tid=... and /tournaments/:id
      const tid = url.searchParams.get("tid") || url.pathname.split("/").filter(Boolean).pop();

      if (!tid || tid === "tournaments") {
        throw new Error("Could not find tournament ID in URL");
      }

      setTournamentId(tid);
      setDrawerOpen(false);
      setJoinUrl("");
      alert("Successfully switched to the private tournament! ✅");
    } catch (e) {
      alert("Invalid tournament URL. Please ensure it contains a valid tournament ID.");
    }
  };

  // ----------------------------
  // ✅ UPDATED PRIMARY CTA (REAL)
  // ----------------------------
  const primaryCta = (() => {
    const regClosed = closeInDays != null && closeInDays <= 0;

    // closed by date
    if (regClosed) {
      return (
        <button className="primaryBtn" disabled style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          REGISTRATION CLOSED
        </button>
      );
    }
    if (!me) {
      return (
        <button
          className="primaryBtn"
          style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => {
            e.stopPropagation();
            alert("Please login as Player to register.");
          }}
        >
          LOGIN TO REGISTER
        </button>
      );
    }
    if (String(me.role || "").toLowerCase() !== "player") {
      return (
        <button
          className="primaryBtn"
          style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', opacity: 0.8, cursor: 'default', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          ONLY PLAYERS CAN REGISTER
        </button>
      );
    }

    const st = String(myReg?.status || "").toLowerCase();
    if (st === "approved") {
      return (
        <button className="primaryBtn" disabled style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          REGISTERED
        </button>
      );
    }
    if (st === "pending") {
      return (
        <button className="primaryBtn" disabled style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          PENDING APPROVAL
        </button>
      );
    }
    if (st === "awaiting_friends") {
      return (
        <button className="primaryBtn" disabled style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          AWAITING FRIENDS APPROVAL
        </button>
      );
    }
    if (st === "waitlist") {
      return (
        <button className="primaryBtn" disabled style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          WAITLIST
        </button>
      );
    }
    if (st === "blocked") {
      return (
        <button className="primaryBtn" disabled style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          BLOCKED
        </button>
      );
    }
    if (st === "rejected") {
      return (
        <button
          className="primaryBtn"
          style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          disabled={registering}
          onClick={(e) => {
            e.stopPropagation();
            handleRegister();
          }}
        >
          RE-APPLY
        </button>
      );
    }
    return (
      <button
        className="primaryBtn"
        style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', width: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        disabled={registering}
        onClick={(e) => {
          e.stopPropagation();
          setShowPartnerModal(true);
        }}
      >
        {registering ? "REGISTERING..." : (t?.registration?.teamSize > 1 ? "REGISTER TEAM" : "REGISTER NOW")}
      </button>
    );
  })();

  const cities = useMemo(() => Array.from(new Set((tournaments || []).map((x) => x.city).filter(Boolean))), [tournaments]);

  const filteredTournaments = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return (tournaments || []).filter((x) => {
      const st = String(x.status || "").toLowerCase();
      if (listCity !== "all" && x.city !== listCity) return false;
      if (listStatus !== "all" && st !== String(listStatus).toLowerCase()) return false;
      if (listFormat !== "all" && x.format !== listFormat) return false;
      if (!q) return true;

      const hay = `${x.title || x.name || ""} ${x.city || ""} ${x.course || x.ground || ""} ${x.format || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tournaments, listQuery, listCity, listStatus, listFormat]);

  if (loading && !t) {
    return (
      <div className="tPage">
        <div className="card" style={{ margin: 20 }}>Loading...</div>
      </div>
    );
  }

  if (!t) {
    return (
      <div className="tPage">
        <div className="card" style={{ margin: 20 }}>{err ? `⚠ ${err}` : "No tournament found"}</div>
      </div>
    );
  }

  return (
    <div className="tPage">
      {err && (
        <div className="orgError" style={{ margin: 12 }}>⚠ {err}</div>
      )}

      {/* ✅ Sticky floating hero bar */}
      {showStickyBar && (
        <div className="stickyHeroBar" role="region" aria-label="Tournament quick actions">
          <div className="stickyHeroInner">
            <div className="stickyHeroLeft">
              <div className="stickyTitleRow">
                <div className="stickyTitle">{t.name}</div>
                <span className={`stickyTag ${closeInDays != null && closeInDays <= 3 ? "hot" : ""}`}>{urgency}</span>
              </div>
              <div className="stickyMeta">
                {t.city} • {t.course} • {t.dates}
              </div>
            </div>

            <div className="stickyHeroRight">
              <div className="stickyPrice">
                {formatMoney(t.registration.fee, t.registration.currency)}
                <span className="stickyPriceSub">Entry</span>
              </div>

              <button type="button" className="tOutlineBtn stickyAllBtn" onClick={() => setDrawerOpen(true)}>
                All Tournaments
              </button>

              <div className="stickyCtaWrap">{primaryCta}</div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Drawer */}
      <div className={`tDrawerOverlay ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`tDrawer ${drawerOpen ? "open" : ""}`} aria-label="All tournaments drawer">
        <div className="tDrawerHead">
          <div>
            <div className="drawerTitle">All Tournaments</div>
            <div className="drawerSub">Search + filter and pick one</div>
          </div>
          <button className="drawerClose" onClick={() => setDrawerOpen(false)} aria-label="Close">✕</button>
        </div>

        <div className="drawerFilters">
          <input
            className="drawerSearch"
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="Search by name, city, course..."
          />

          <div style={{ margin: '15px 0', borderTop: '1px solid var(--outline_variant)', paddingTop: '15px' }}>
            <div className="drawerSub" style={{ fontWeight: 700, color: 'var(--on_surface)', marginBottom: 8 }}>Join Private Tournament</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="drawerSearch"
                style={{ flex: 1, margin: 0 }}
                placeholder="Paste Private URL here..."
                value={joinUrl}
                onChange={(e) => setJoinUrl(e.target.value)}
              />
              <button className="primaryBtn" onClick={handleJoinPrivate} style={{ padding: '0 15px', height: '40px' }}>Join</button>
            </div>
          </div>

          <div className="drawerSelectRow">
            <select value={listCity} onChange={(e) => setListCity(e.target.value)}>
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select value={listStatus} onChange={(e) => setListStatus(e.target.value)} style={{ display: 'none' }}>
              <option value="all">All Status</option>
            </select>
            <div style={{ flex: 1 }} />

            <select value={listFormat} onChange={(e) => setListFormat(e.target.value)}>
              <option value="all">All Formats</option>
              <option value="Stroke Play">Stroke Play</option>
              <option value="Match Play">Match Play</option>
              <option value="Team Play">Team Play</option>
            </select>
          </div>
        </div>

        <div className="drawerList">
          {filteredTournaments.map((x) => {
            const closes = x?.registration?.regClosesAt || x.regClosesAt;
            const d = daysLeft(closes);

            const st = String(x.status || "").toLowerCase();
            const badge = (d != null && d <= 3 && d > 0) ? "CLOSING SOON" : "OPEN";

            const xid = x._id || x.id;

            return (
              <button
                key={xid}
                className={`drawerItem ${String(xid) === String(tournamentId) ? "active" : ""}`}
                onClick={() => {
                  setTournamentId(xid);
                  setDrawerOpen(false);
                  setTab("overview");
                  setSelectedExtras({});
                }}
              >
                <div className="drawerItemLeft">
                  <div className="drawerItemName">{x.title || x.name}</div>
                  <div className="drawerItemMeta">
                    {x.city || "—"} • {(x.course || x.ground || "—")} •{" "}
                    {fmtDMYRange(x.startDate, x.endDate) || "—"}
                  </div>
                  <div className="drawerItemMeta2">
                    {(x.format || "—")} • {(x.rounds || 1)} rounds
                  </div>
                </div>

                <div className="drawerItemRight">
                  <span className={`drawerBadge ${badge === "LIVE" ? "live" : badge === "CLOSING SOON" ? "hot" : ""}`}>
                    {badge}
                  </span>
                  <div className="drawerFee">
                    {formatMoney(x?.registration?.fee ?? 0, x?.registration?.currency || "₹")}
                  </div>
                </div>
              </button>
            );
          })}

          {filteredTournaments.length === 0 && <div className="drawerEmpty">No tournaments found. Try changing filters.</div>}
        </div>
      </aside>

      <div className="tGrid">
        {/* LEFT */}
        <aside className="tSide leftSide">
          <div className="sideCard stickySide">
            <div className="adLabel">Advertisement</div>
            <h4 className="sideTitle">Upgrade Your Game</h4>
            <p className="sideText">Premium clubs, gloves & range accessories — delivered fast.</p>
            <button className="primaryBtn">Shop Gear</button>
          </div>

          <div className="sideCard">
            <div className="adLabel">Sponsored</div>
            <h4 className="sideTitle">Book a Coaching Session</h4>
            <p className="sideText">Improve swing consistency with certified coaches.</p>
            <button className="tOutlineBtn">View Coaches</button>
          </div>
        </aside>

        {/* CENTER */}
        <main className="tCenter">
          {/* HERO */}
          <section className="tHero" ref={heroRef}>
            <div
              className="tHeroBanner"
              style={{ backgroundImage: `url(${currentSlide?.banner || ""})`, cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-label={`${currentSlide?.name} preview. Click to view details.`}
              onMouseEnter={() => setIsHoveringHero(true)}
              onMouseLeave={() => setIsHoveringHero(false)}
              onClick={() => {
                if (currentSlide?.id) {
                  setTournamentId(currentSlide.id);
                  document.getElementById('tournament-details')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (currentSlide?.id) {
                    setTournamentId(currentSlide.id);
                    document.getElementById('tournament-details')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
            >
              <div className="tHeroOverlay" />
              <div className="tHeroInner">
                <div className="tHeroTopRow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div className="tHeroTopLeft" style={{ flex: 1, minWidth: 0 }}>
                    <div className="tHeroTitleRow" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <h1 className="tTitle" style={{ fontSize: '1.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSlide?.name}</h1>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="tPill open">OPEN</span>
                      </div>
                    </div>

                    <div className="tHeroMetaRow" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div className="tHeroMeta" style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>
                        {currentSlide?.course} • {currentSlide?.city} • {currentSlide?.dates}
                      </div>
                      <div className="tHeroMeta2" style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>
                        {currentSlide?.format} • {currentSlide?.rounds} Rds • {currentSlide?.teeOffWindow || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="tHeroTopRight" style={{ flexShrink: 0 }}>
                    <div className="tHeroStatsRow" style={{ display: 'flex', gap: '8px' }}>
                      <div className="tStatCard">
                        <div className="tStatLabel">Capacity</div>
                        <div className="tStatValue">{currentSlide?.registration.maxPlayers || "—"} Players</div>
                      </div>
                      <div className="tStatCard">
                        <div className="tStatLabel">Entry Fee</div>
                        <div className="tStatValue">{formatMoney(currentSlide?.registration.fee, currentSlide?.registration.currency)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HERO DOTS */}
              {heroSlides.length > 0 && (
                <div className="heroCarousel" aria-label="Tournaments slider">
                  <div className="heroDots">
                    {heroSlides.map((_, i) => (
                      <button
                        key={i}
                        className={`heroDot ${i === heroIndex ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHeroIndex(i);
                        }}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* UNIFIED STABLE CONTENT BOX */}
          <div className="tUnifiedBox" id="tournament-details" style={{ background: 'var(--surface_container_low)', borderRadius: 'var(--radius-xl)', padding: '16px 20px', border: '1px solid var(--outline_variant)', boxShadow: 'var(--shadow-ambient)' }}>

            <div className="tUnifiedHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px 12px', borderBottom: '1px solid var(--outline_variant)', marginBottom: '16px', minHeight: '34px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on_surface)', height: '32px', display: 'flex', alignItems: 'center', margin: 0 }}>{t?.name?.toUpperCase()}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '32px' }}>
                {primaryCta}
                <button className="tOutlineBtn" style={{ height: '32px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: 'var(--surface_container_high)', border: '1px solid var(--outline_variant)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDrawerOpen(true)}>SEE ALL TOURNAMENTS</button>              </div>
            </div>

            {/* TABS (Tighter inside the box) */}
            <nav className="tTabs" style={{ marginTop: '0', background: 'var(--surface_container_high)', padding: '6px', marginBottom: '16px' }} aria-label="Tournament sections">
              <button className={`tTab ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>Overview</button>
              <button className={`tTab ${tab === "field" ? "active" : ""}`} onClick={() => setTab("field")}>Players</button>
              <button className={`tTab ${tab === "teetimes" ? "active" : ""}`} onClick={() => setTab("teetimes")}>Tee Times</button>
              <button className={`tTab ${tab === "leaderboard" ? "active" : ""}`} onClick={() => setTab("leaderboard")}>Leaderboard</button>
              <button className={`tTab ${tab === "sponsors" ? "active" : ""}`} onClick={() => setTab("sponsors")}>Sponsors</button>
              <button className={`tTab ${tab === "rules" ? "active" : ""}`} onClick={() => setTab("rules")}>Rules</button>
              <button className={`tTab ${tab === "updates" ? "active" : ""}`} onClick={() => setTab("updates")}>Updates</button>
            </nav>

            {/* CONTENT AREA */}
            <section className="tContent" style={{ marginTop: '0' }}>
              {/* ✅ ✅ ✅ FULL OVERVIEW */}
              {tab === "overview" && (
                <div className="grid2" style={{ gap: '12px' }}>
                  <div className="card" style={{ background: 'var(--surface_container_lowest)', padding: '20px' }}>
                    <div className="cardHead">
                      <h3>About</h3>
                      <span className="miniPill">{t.format}</span>
                    </div>
                    <p className="muted" style={{ fontSize: '0.9rem' }}>{t.description}</p>

                    <div className="keyGrid">
                      <div className="keyRow"><span className="k" style={{ fontSize: '0.8rem' }}>Course</span><span className="v" style={{ fontSize: '0.8rem' }}>{t.course}</span></div>
                      <div className="keyRow"><span className="k" style={{ fontSize: '0.8rem' }}>Dates</span><span className="v" style={{ fontSize: '0.8rem' }}>{t.dates}</span></div>
                      <div className="keyRow"><span className="k" style={{ fontSize: '0.8rem' }}>Entry Fee</span><span className="v" style={{ fontSize: '0.8rem' }}>{formatMoney(t.registration.fee, t.registration.currency)}</span></div>
                      <div className="keyRow"><span className="k" style={{ fontSize: '0.8rem' }}>Handicap</span><span className="v" style={{ fontSize: '0.8rem' }}>{t.registration.handicapLimit || "—"}</span></div>
                    </div>
                  </div>

                  <div className="card" style={{ background: 'var(--surface_container_lowest)', padding: '20px' }}>
                    <div className="cardHead">
                      <h3>Registration</h3>
                      <span className={`tag ${regStatus === "open" ? "open" : "hot"}`}>{regStatus.toUpperCase()}</span>
                    </div>

                    <div className="priceLine" style={{ margin: '12px 0' }}>
                      <div className="priceMain" style={{ fontSize: '1.4rem' }}>{formatMoney(t.registration.fee, t.registration.currency)}</div>
                      <div className="muted" style={{ fontSize: '0.8rem' }}>Base entry fee</div>
                    </div>

                    <div className="extras">
                      <div className="extrasTitle" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>Optional extras</div>
                      {(t.registration.extras || []).map((x) => {
                        const xid = String(x.id || x._id);
                        return (
                          <label key={xid} className="checkRow" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!selectedExtras[xid]}
                              onChange={(e) => setSelectedExtras((prev) => ({ ...prev, [xid]: e.target.checked }))}
                            />
                            <span className="checkText">
                              {x.name} <span className="muted">({formatMoney(x.price, t.registration.currency)})</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="divider" />


                    <div className="totalRow">
                      <span>Total</span>
                      <strong>{formatMoney(totalPay, t.registration.currency)}</strong>
                    </div>

                    <div className="ctaRow" onClick={(e) => e.stopPropagation()}>
                      {primaryCta}
                      <button className="tOutlineBtn" type="button">View Policy</button>
                    </div>

                    <div className="tiny muted">
                      Registration closes: <b>{fmtDMY(t.regClosesAt) || "—"}</b>
                    </div>
                  </div>

                  <div className="card">
                    <div className="cardHead">
                      <h3>Quick Actions</h3>
                      <span className="muted">Tournament day tools</span>
                    </div>
                    <div className="quickGrid" onClick={(e) => e.stopPropagation()}>
                      <button className="quickBtn" type="button">Share Tournament</button>
                      <button className="quickBtn" type="button">Add Reminder</button>
                      <button className="quickBtn" type="button">Contact Organiser</button>
                      <button className="quickBtn" type="button">Report Issue</button>
                    </div>
                  </div>

                  <div className="card">
                    <div className="cardHead">
                      <h3>Highlights</h3>
                      <span className="miniPill soft">Premium</span>
                    </div>
                    <ul className="bullets">
                      <li>Cut line after Round 2 • leaderboard updates live</li>
                      <li>Prizes: Nearest Pin • Longest Drive • Low Gross</li>
                      <li>Clean scoring workflow + offline sync support (Phase-2)</li>
                    </ul>
                  </div>
                </div>
              )}

              {tab === "field" && (
                <div className="card">
                  <div className="cardHead">
                    <h3>Players / Field</h3>
                    <div className="rowEnd">
                      <input
                        className="search"
                        value={fieldQuery}
                        onChange={(e) => setFieldQuery(e.target.value)}
                        placeholder="Search player or club..."
                      />
                      <span className="miniPill">{filteredField.length} Players</span>
                    </div>
                  </div>

                  <div className="table playersTable">
                    <div className="trow thead">
                      <div>Name</div>
                      <div>Handicap</div>
                      <div>Club</div>
                      <div />
                    </div>

                    {filteredField.map((p) => (
                      <div className="trow" key={String(p.id)}>
                        <div className="nameCell">
                          <div className="avatar">{pickName(p).slice(0, 1)}</div>
                          <div>
                            <div className="strong">{pickName(p)}</div>
                            <div className="muted tiny">Player ID: {String(p.playerId || p.id)}</div>
                          </div>
                        </div>
                        <div>{p.handicap ?? "—"}</div>
                        <div>{p.club || "—"}</div>
                        <div className="rowEnd">
                          <button className="tOutlineBtn small" type="button">View</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredField.length === 0 && <div className="empty">No players found.</div>}
                </div>
              )}

              {/* ✅ TeeTimes */}
              {tab === "teetimes" && (
                <div className="card">
                  <div className="cardHead">
                    <h3>Tee Times</h3>
                    <span className="muted">Groupings • hole start • players</span>
                  </div>

                  <div className="teeList">
                    {teeTimes.map((tt) => (
                      <div className="teeCard" key={String(tt.id)}>
                        <div className="teeTop">
                          <div>
                            <div className="strong">{tt.time} • {tt.tee}</div>
                            <div className="muted">
                              {fmtDMY(tt.date) || tt.date} • {tt.groupCode || tt.group} • Start Hole {tt.holeStart}
                            </div>
                          </div>
                          <button className="tOutlineBtn small" type="button">Open</button>
                        </div>

                        <div className="teePlayers">
                          {(tt.players || []).map((name) => (
                            <span className="chip" key={`${tt.id}-${name}`}>{name}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {teeTimes.length === 0 && <div className="empty">No tee times yet.</div>}
                </div>
              )}

              {tab === "leaderboard" && (
                <div className="card">
                  <div className="cardHead">
                    <h3>Leaderboard</h3>
                    <div className="rowEnd">
                      <span className="miniPill">{String(t.status).toLowerCase() === "live" ? "Live" : "Preview"}</span>
                      <button className="tOutlineBtn small" type="button">Gross</button>
                      <button className="tOutlineBtn small" type="button">Net</button>
                      <button className="tOutlineBtn small" type="button">Team</button>
                    </div>
                  </div>

                  <div className="table lbTable">
                    <div className="trow thead">
                      <div>Pos</div>
                      <div>Player</div>
                      <div>Score</div>
                      <div>Thru</div>
                      <div>Status</div>
                    </div>

                    {leaderboard.map((x) => (
                      <div className="trow" key={String(x.id)}>
                        <div className="strong">{x.pos ?? "-"}</div>
                        <div className="nameCell">
                          <div className="avatar">{pickName(x).slice(0, 1)}</div>
                          <div className="strong">{pickName(x)}</div>
                        </div>
                        <div className="strong">{x.score ?? "E"}</div>
                        <div>{x.thru ?? "-"}</div>
                        <div>
                          <span className={`miniPill ${String(x.status).toLowerCase() === "online" ? "ok" : "warn"}`}>
                            {x.status || "offline"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {leaderboard.length === 0 && <div className="empty">No leaderboard yet.</div>}
                </div>
              )}

              {tab === "updates" && (
                <div className="card">
                  <div className="cardHead">
                    <h3>Updates</h3>
                    <span className="muted">Announcements • tee changes • alerts</span>
                  </div>

                  <div className="feed">
                    {updates.map((u) => (
                      <div className="feedItem" key={String(u.id)}>
                        <div className="feedDot" />
                        <div>
                          <div className="strong">{u.title || "Update"}</div>
                          <div className="muted tiny">
                            {u.createdAt ? fmtDMY(u.createdAt) : ""} • {u.author?.name || "Organiser"}
                          </div>
                          <div className="muted" style={{ marginTop: 6 }}>{u.message || ""}</div>
                        </div>
                      </div>
                    ))}
                    {updates.length === 0 && <div className="empty">No updates yet.</div>}
                  </div>

                  <div className="divider" />
                  <button className="tOutlineBtn" type="button">View All Updates</button>
                </div>
              )}

              {tab === "sponsors" && (
                <div className="card">
                  <div className="cardHead">
                    <h3>Sponsors</h3>
                    <span className="muted">Logos + links</span>
                  </div>

                  <div className="sGrid">
                    {(t.sponsors || []).map((s) => (
                      <a className="sCard" href={s.url || "#"} key={String(s.id || s._id)}>
                        <div className="sLogo">{(s.name || "S").slice(0, 1)}</div>
                        <div>
                          <div className="strong">{s.name}</div>
                          <div className="muted tiny">{s.tier || "Sponsor"}</div>
                        </div>
                        <span className="go">↗</span>
                      </a>
                    ))}
                  </div>

                  <div className="divider" />
                  <div className="rowBetween">
                    <div>
                      <div className="strong">Become a sponsor</div>
                      <div className="muted tiny">Banner • leaderboard • hole sponsorships</div>
                    </div>
                    <button className="primaryBtn" type="button">Sponsor This Tournament</button>
                  </div>

                  {(!t.sponsors || t.sponsors.length === 0) && <div className="empty">No sponsors yet.</div>}
                </div>
              )}

              {tab === "rules" && (
                <div className="card">
                  <div className="cardHead">
                    <h3>Format & Rules</h3>
                    <span className="miniPill soft">{t.format}</span>
                  </div>

                  <ul className="bullets">
                    {(t.rules || []).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>

                  <div className="divider" />
                  <div className="rowBetween">
                    <div>
                      <div className="strong">Registration rules</div>
                      <div className="muted tiny">
                        Max {t.registration.maxPlayers || "—"} • Handicap {t.registration.handicapLimit || "—"} •{" "}
                        {t.registration.teamAllowed ? "Team allowed" : "Individual only"} • Waitlist:{" "}
                        {t.registration.waitlistEnabled ? "Yes" : "No"}
                      </div>
                    </div>
                    <button className="tOutlineBtn" type="button">Read Full Rules</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>

        {/* RIGHT */}
        <aside className="tSide rightSide">
          <div className="sideCard stickySide">
            <div className="adLabel">Featured</div>
            <h4 className="sideTitle">Course Preview</h4>

            <div className="featuredVideo">
              <iframe
                title="Course Preview Video"
                src="https://www.youtube.com/embed/6iQm1sJYvD8"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <p className="sideText">Watch a quick breakdown of the course strategy and key holes.</p>
            <button className="tOutlineBtn" onClick={() => setDrawerOpen(true)} type="button">
              Browse tournaments
            </button>
          </div>

          <div className="sideCard">
            <div className="adLabel">Tip</div>
            <h4 className="sideTitle">Rules Quick Tip</h4>
            <p className="sideText">Unsure about a drop? Check “Rules” tab or contact the organiser.</p>
            <button className="chipBtn" onClick={() => setTab("rules")} type="button">
              Open Rules
            </button>
          </div>
        </aside>
      </div >

      <PartnerSelectionModal
        show={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
        t={t}
        friendsList={friendsList}
        teamName={teamName}
        setTeamName={setTeamName}
        partnerIds={partnerIds}
        setPartnerIds={setPartnerIds}
        onConfirm={() => {
          setShowPartnerModal(false);
          handleRegister();
        }}
        registering={registering}
        formatMoney={formatMoney}
      />
    </div >
  );
}

// ✅ PARTNER SELECTION MODAL COMPONENT
const PartnerSelectionModal = ({ show, onClose, t, friendsList, teamName, setTeamName, partnerIds, setPartnerIds, onConfirm, registering, formatMoney }) => {
  const [activeSlotIdx, setActiveSlotIdx] = useState(null);

  if (!show) return null;

  const teamSize = t?.registration?.teamSize || 1;
  const maxPartners = teamSize - 1;

  // slot 0 is "Me", slot 1..N are partners
  const slots = [
    { type: 'me', name: 'You', id: 'me' },
    ...(maxPartners > 0 ? Array.from({ length: maxPartners }).map((_, i) => ({
      type: 'partner',
      idx: i,
      id: partnerIds[i],
      name: friendsList.find(f => f._id === partnerIds[i])?.playerName || `Partner ${i + 1}`
    })) : [])
  ];

  const availableFriends = friendsList.filter(f => !partnerIds.includes(f._id));

  const handleSelectFriend = (friendId) => {
    if (activeSlotIdx !== null) {
      const newIds = [...partnerIds];
      newIds[activeSlotIdx] = friendId;
      setPartnerIds(newIds);
      setActiveSlotIdx(null);
    }
  };

  const handleRemovePartner = (idx) => {
    const newIds = [...partnerIds];
    newIds[idx] = "";
    setPartnerIds(newIds);
  };

  return (
    <div className="partnerModalOverlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="partnerModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalTitle">{teamSize > 1 ? "Team Registration" : "Entry Details"}</div>
        <div className="modalSub">{teamSize > 1 ? "Get your team ready for" : "Confirm your entry for"} <b>{t?.name}</b></div>

        <div className="partnerInputGroup">
          <label className="partnerLabel">{teamSize > 1 ? "Team Name *" : "Entry Name (e.g. your name) *"}</label>
          <input
            className="search"
            placeholder="Enter a cool team name..."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={{ width: '100%', borderRadius: '12px' }}
          />
        </div>

        <div className="partnerSlots">
          {slots.map((slot, i) => (
            <div key={i} className="memberSlot">
              <div
                className={`slotCircle ${slot.type === 'me' ? 'me' : (slot.id ? 'filled' : 'empty')}`}
                onClick={() => slot.type === 'partner' && !slot.id && setActiveSlotIdx(slot.idx)}
              >
                {slot.type === 'me' ? 'Me' : (slot.id ? slot.name.substring(0, 1).toUpperCase() : '+')}
                {slot.type === 'partner' && slot.id && (
                  <div className="removePartner" onClick={(e) => { e.stopPropagation(); handleRemovePartner(slot.idx); }}>×</div>
                )}
              </div>
              <div className="slotLabel">{slot.name}</div>
            </div>
          ))}
        </div>

        {activeSlotIdx !== null && (
          <div className="friendPicker">
            <div className="pickerHeader">
              <span>Select Friend for Slot {activeSlotIdx + 1}</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setActiveSlotIdx(null)}>Cancel</span>
            </div>
            {availableFriends.length > 0 ? (
              availableFriends.map(f => {
                const isBlocked = f.status === "blocked";
                return (
                  <div
                    key={f._id}
                    className={`pickerItem ${isBlocked ? 'blocked' : ''}`}
                    onClick={() => !isBlocked && handleSelectFriend(f._id)}
                    style={{
                      opacity: isBlocked ? 0.6 : 1,
                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                      pointerEvents: isBlocked ? 'none' : 'auto'
                    }}
                  >
                    <div className="avatar">
                      {f.playerName.substring(0, 1).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{f.playerName}</span>
                      {isBlocked && <span className="tiny-blocked" style={{ color: 'var(--error)', fontSize: '0.6rem', fontWeight: 700 }}>BLOCKED</span>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty" style={{ margin: '10px 0', border: 'none' }}>No available friends found</div>
            )}
          </div>
        )}

        <div className="modalActions">
          <button className="tOutlineBtn" onClick={onClose}>Cancel</button>
          <button
            className="primaryBtn"
            disabled={registering || !teamName.trim() || partnerIds.filter(Boolean).length < maxPartners}
            onClick={onConfirm}
          >
            {registering ? "Registering..." : `Confirm & Pay`}
          </button>
        </div>
      </div>
    </div>
  );
};

// frontend/src/pages/SponsorPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../style/SponsorPage.css";

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

function toDateSafe(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function fmtDMYHM(v) {
  const d = toDateSafe(v);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function getCloseAt(t) {
  return t?.registration?.regClosesAt || t?.registrationCloseAt || null;
}

function timeLeftLabel(targetISO, now = new Date()) {
  const t = toDateSafe(targetISO);
  if (!t) return { label: "—", ms: 0 };
  const diff = t.getTime() - now.getTime();
  if (diff <= 0) return { label: "Closed", ms: diff };

  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const remH = hrs % 24;
  const remM = mins % 60;

  if (days > 0) return { label: `${days}d ${remH}h`, ms: diff };
  if (hrs > 0) return { label: `${hrs}h ${remM}m`, ms: diff };
  return { label: `${remM}m`, ms: diff };
}

// mirrors backend phase logic
function bidPhase(t, now = new Date()) {
  const closeAt = toDateSafe(getCloseAt(t));
  if (!closeAt) return "unknown";
  if (now < closeAt) return "open";

  const selectionEnd = new Date(closeAt.getTime() + 2 * 60 * 60 * 1000);
  if (now <= selectionEnd) return "processing";
  return "published";
}

const SLOT_TYPES = [
  { key: "title", label: "Title Sponsor", hint: "Max visibility" },
  { key: "gold", label: "Gold", hint: "High visibility" },
  { key: "silver", label: "Silver", hint: "Good visibility" },
];

// ✅ Fixed top tabs like organiser page
function SponsorTopTabs({ view, setView }) {
  return (
    <div className="spTabsTop">
      <button className={view === "available" ? "spBtn spBtnPrimary" : "spBtn"} onClick={() => setView("available")}>
        Available
      </button>
      <button className={view === "myBids" ? "spBtn spBtnPrimary" : "spBtn"} onClick={() => setView("myBids")}>
        My Bids
      </button>
      <button className={view === "results" ? "spBtn spBtnPrimary" : "spBtn"} onClick={() => setView("results")}>
        Results
      </button>
    </div>
  );
}

export default function SponsorPage() {
  // list view (left list is based on this view)
  const [view, setView] = useState("available"); // available | myBids | results
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("all"); // in backend we mapped this to course (or city)

  // right panel inner tabs
  const [rightView, setRightView] = useState("overview"); // overview | bid | status | assets

  const [selectedId, setSelectedId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [tournaments, setTournaments] = useState([]);
  const [myBids, setMyBids] = useState([]);

  // Bid form
  const [slotType, setSlotType] = useState("gold");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [brandCategory, setBrandCategory] = useState("Sports");
  const [contactName, setContactName] = useState("Prasun");
  const [contactPhone, setContactPhone] = useState("");

  const now = useMemo(() => new Date(), [view]); // re-evaluate time on tab change

  const loadData = async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({ view, q, location }).toString();

// ✅ 1) tournaments list (view wise)
let list = [];
if (view === "myBids") {
  // sirf wahi tournaments jisme sponsor ne bid kiya
  const tRes = await api(`/api/sponsor/my-bid-tournaments?${qs}`);
  list = tRes?.tournaments || [];
} else {
  // available / results
  const tRes = await api(`/api/sponsor/tournaments?${qs}`);
  list = tRes?.tournaments || [];
}
setTournaments(list);

// ✅ 2) bids (always)
const bRes = await api(`/api/sponsor/bids`);
setMyBids(bRes?.bids || []);
      // auto-select
      const firstId = list?.[0]?._id || null;
      setSelectedId((prev) => (prev && list.some((t) => t._id === prev) ? prev : firstId));
    } catch (e) {
      setErr(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, q, location]);

  const selected = useMemo(() => {
    return tournaments.find((t) => String(t._id) === String(selectedId)) || tournaments[0] || null;
  }, [tournaments, selectedId]);

  const selectedPhase = selected ? bidPhase(selected, now) : "unknown";
  const closeAt = selected ? getCloseAt(selected) : null;
  const closeLeft = selected ? timeLeftLabel(closeAt, now) : { label: "—", ms: 0 };

  const myBidsForSelected = useMemo(() => {
    if (!selected) return [];
    return myBids.filter((b) => String(b.tournamentId) === String(selected._id));
  }, [myBids, selected]);

  const locationOptions = useMemo(() => {
    // since we filter by course, generate course list
    const uniq = Array.from(new Set((tournaments || []).map((t) => t.course).filter(Boolean)));
    return ["all", ...uniq];
  }, [tournaments]);

  function canBid() {
    if (!selected) return false;
    if (selectedPhase !== "open") return false;

    // you currently may not have slots in Tournament schema. So allow bidding always.
    // If later you add slots, you can validate here.
    return true;
  }

  async function refreshBids() {
    const bRes = await api(`/api/sponsor/bids`);
    setMyBids(bRes?.bids || []);
  }

  async function submitBid() {
    try {
      if (!selected) return alert("Select a tournament first.");
      if (!canBid()) return alert("Bidding is closed.");

      const amt = Number(amount);
      if (!amt || Number.isNaN(amt)) return alert("Enter a valid bid amount.");

      await api("/api/sponsor/bids", {
        method: "POST",
        body: JSON.stringify({
          tournamentId: selected._id,
          slotType,
          amount: amt,
          brandCategory,
          message: msg,
          contactName,
          contactPhone,
        }),
      });

      alert("✅ Proposal submitted!");
      setMsg("");
      setAmount("");

      await refreshBids();
      setRightView("status");
      setView("myBids"); // optional: move to MyBids view after submit
    } catch (e) {
      alert(e.message || "Failed to submit bid");
    }
  }

  // banner style
  const heroStyle = useMemo(() => {
    const url = selected?.bannerUrl; // ✅ your schema
    if (!url) {
      return { backgroundImage: "linear-gradient(180deg, rgba(15,23,42,.85), rgba(15,23,42,1))" };
    }
    return {
      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.80)), url(${url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }, [selected]);

  // ✅ Only right body changes
  const renderBody = () => {
    if (!selected) return <div className="spCard">Select a tournament from the left.</div>;

    if (rightView === "overview") {
      return (
        <div className="spCard">
          <div className="spSectionTitle">Overview</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
            <b>Course:</b> {selected.course || "—"}
            <br />
            <b>City:</b> {selected.city || "—"}
            <br />
            <b>Dates:</b> {fmtDMYHM(selected.startDate)} → {fmtDMYHM(selected.endDate)}
            <br />
            <b>Registration closes:</b> {fmtDMYHM(closeAt)} ({closeLeft.label})
            <br />
            <b>Status:</b>{" "}
            {selectedPhase === "open"
              ? "Bidding Open"
              : selectedPhase === "processing"
              ? "Selection Processing"
              : selectedPhase === "published"
              ? "Results Published"
              : "Unknown"}
          </div>

          {selected.description ? (
            <>
              <div className="spSectionTitle" style={{ marginTop: 12 }}>
                Description
              </div>
              <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
                {selected.description}
              </div>
            </>
          ) : null}
        </div>
      );
    }

    if (rightView === "bid") {
      return (
        <div className="spCard">
          <div className="spSectionTitle">Place Bid</div>

          {!canBid() && (
            <div className="spNote spNoteWarn" style={{ marginTop: 10 }}>
              Bidding closed for this tournament.
            </div>
          )}

          <div className="spFormGrid" style={{ marginTop: 10 }}>
            <label className="spLabel">
              Slot type
              <select className="spInput" value={slotType} onChange={(e) => setSlotType(e.target.value)}>
                {SLOT_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="spLabel">
              Bid amount (₹)
              <input className="spInput" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 30000" />
            </label>

            <label className="spLabel">
              Brand category
              <input className="spInput" value={brandCategory} onChange={(e) => setBrandCategory(e.target.value)} />
            </label>

            <label className="spLabel">
              Message to organiser
              <textarea className="spInput spTextarea" value={msg} onChange={(e) => setMsg(e.target.value)} />
            </label>

            <div className="spRow2">
              <label className="spLabel">
                Contact name
                <input className="spInput" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </label>
              <label className="spLabel">
                Contact phone
                <input className="spInput" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91..." />
              </label>
            </div>

            <div className="spActions">
              <button className="spBtn spBtnPrimary" disabled={!canBid()} onClick={submitBid}>
                Submit Proposal
              </button>
              <button className="spBtn" onClick={() => setRightView("status")}>
                View My Status
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (rightView === "status") {
      return (
        <div className="spCard">
          <div className="spSectionTitle">My Proposals</div>

          {myBidsForSelected.length === 0 ? (
            <div className="muted">No bids submitted for this tournament yet.</div>
          ) : (
            <div className="spBidList" style={{ marginTop: 10 }}>
              {myBidsForSelected.map((b) => (
                <div key={b._id} className="spBidRow">
                  <div>
                    <div className="spBidTop">
                      <div className="spBidTitle">{b.slotType?.toUpperCase()}</div>
                      <span className="spChip spChip-info">{b.status}</span>
                    </div>
                    <div className="muted">
                      Amount: <b>₹{b.amount}</b> • Submitted: {fmtDMYHM(b.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (rightView === "assets") {
      return (
        <div className="spCard">
          <div className="spSectionTitle">Brand Assets</div>
          <div className="muted">Accepted hone ke baad yaha assets upload/approve flow aayega.</div>
        </div>
      );
    }

    return <div className="spCard">Unknown view</div>;
  };

  return (
    <div className="spWrap">
      {/* ✅ FIXED HEADER (like organiser page) */}
      <div className="spHeader">
        <div>
          <h2 className="spTitle">Sponsor Panel</h2>
          <div className="spSub muted">
            Available shows only tournaments whose <b>registration is still open</b>.
          </div>
        </div>

        <SponsorTopTabs view={view} setView={setView} />
      </div>

      <div className="spGrid">
        {/* LEFT */}
        <aside className="spLeft">
          <div className="spCard">
            <div className="spFilters">
              <input className="spInput" placeholder="Search tournament..." value={q} onChange={(e) => setQ(e.target.value)} />

              <select className="spInput" value={location} onChange={(e) => setLocation(e.target.value)}>
                {locationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "All courses" : opt}
                  </option>
                ))}
              </select>
            </div>

            {loading && <div className="muted spEmpty">Loading…</div>}
            {err && !loading && <div className="spNote spNoteWarn">{err}</div>}

            <div className="spList">
              {!loading && !err && tournaments.length === 0 ? (
                <div className="muted spEmpty">
                  {view === "available"
                    ? "No tournaments available for bidding right now."
                    : view === "myBids"
                    ? "You have not bid on any tournament yet."
                    : "No tournaments found."}
                </div>
              ) : (
                tournaments.map((t) => {
                  const p = bidPhase(t, now);
                  const close = getCloseAt(t);
                  const left = timeLeftLabel(close, now);

                  const active = String(t._id) === String(selectedId);
                  const cls = active ? "spItem spItemActive" : "spItem";

                  const chips = [];
                  if (p === "open") chips.push({ text: "Bidding Open", kind: "ok" });
                  if (p === "processing") chips.push({ text: "Processing", kind: "warn" });
                  if (p === "published") chips.push({ text: "Published", kind: "info" });

                  return (
                    <button key={t._id} className={cls} onClick={() => (setSelectedId(t._id), setRightView("overview"))}>
                      <div className="spItemTop">
                        <div className="spItemTitle">{t.title}</div>
                        <div className="spChips">
                          {chips.map((c, idx) => (
                            <span key={idx} className={`spChip spChip-${c.kind}`}>
                              {c.text}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="spItemMeta muted">
                        {t.course || "—"} • Closes: {fmtDMYHM(close)} • Left: <b>{left.label}</b>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT */}
        <section className="spRight">
          {!selected ? (
            <div className="spCard">Select a tournament from the left.</div>
          ) : (
            <div className="spRightShell">
              {/* ✅ FIXED RIGHT TOP (like organiser page) */}
              <div className="spRightTop">
                <div className="spRightTitleBlock">
                  <h3 style={{ margin: 0 }}>{selected.title}</h3>
                  <div className="muted">
                    {(selected.course || "—")} • {fmtDMYHM(selected.startDate)} → {fmtDMYHM(selected.endDate)}
                  </div>
                </div>

                {/* right tabs */}
                <div className="spTabs">
                  <button className={rightView === "overview" ? "spTab spTabActive" : "spTab"} onClick={() => setRightView("overview")}>
                    Overview
                  </button>
                  <button className={rightView === "bid" ? "spTab spTabActive" : "spTab"} onClick={() => setRightView("bid")}>
                    Place Bid
                  </button>
                  <button className={rightView === "status" ? "spTab spTabActive" : "spTab"} onClick={() => setRightView("status")}>
                    My Status
                  </button>
                  <button className={rightView === "assets" ? "spTab spTabActive" : "spTab"} onClick={() => setRightView("assets")}>
                    Brand Assets
                  </button>
                </div>
              </div>

              {/* HERO */}
              <div className="spHero" style={heroStyle}>
                <div className="spHeroContent">
                  <div className="spHeroTitle">{selected.title}</div>
                  <div className="spHeroMeta">
                    {selected.course || "—"} • Reg closes: {fmtDMYHM(closeAt)} • {closeLeft.label}
                  </div>
                </div>
              </div>

              {/* ✅ ONLY BODY CHANGES */}
              <div className="spRightBody">{renderBody()}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
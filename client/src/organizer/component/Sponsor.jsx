// frontend/src/pages/organiser/SponsorsBids.jsx
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

const SLOT_LABEL = {
  title: "Title Sponsor",
  gold: "Gold Sponsor",
  silver: "Silver Sponsor",
};

function moneyINR(n) {
  try {
    return "₹" + Number(n || 0).toLocaleString("en-IN");
  } catch {
    return "₹0";
  }
}

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

function Pill({ kind = "muted", children }) {
  return <span className={`pill pill-${kind}`}>{children}</span>;
}

function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const kind =
    s === "approved" || s === "accepted" || s === "won"
      ? "ok"
      : s === "rejected" || s === "lost" || s === "withdrawn"
      ? "bad"
      : "warn";
  return <Pill kind={kind}>{status}</Pill>;
}

/**
 * ✅ Current Selection = Highest amount (ignore rejected/withdrawn/lost)
 * Tie-break: earliest createdAt wins
 */
function pickHighest(list) {
  const eligible = (list || []).filter(
    (x) => !["rejected", "withdrawn", "lost"].includes(String(x.status || "").toLowerCase())
  );

  eligible.sort((a, b) => {
    const da = Number(a.amount || 0);
    const db = Number(b.amount || 0);
    if (db !== da) return db - da;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return eligible[0] || null;
}

export default function SponsorsBids({ tournament }) {
  const tournamentId = tournament?._id;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // backend bids list
  const [bids, setBids] = useState([]);

  // filters
  const [query, setQuery] = useState("");
  const [pkg, setPkg] = useState("All");

  // winner selector (slotType)
  const [selectedPackage, setSelectedPackage] = useState("title");

  // ✅ load bids from backend
  const loadBids = async () => {
    if (!tournamentId) return;
    setLoading(true);
    setErr("");
    try {
      const data = await api(`/api/organiser/sponsor-bids?tournamentId=${tournamentId}`);
      const list = data?.bids || [];
      setBids(list);

      // ✅ ensure selectedPackage always exists
      const types = Array.from(new Set(list.map((b) => b.slotType).filter(Boolean)));
      if (types.length) {
        setSelectedPackage((prev) => (types.includes(prev) ? prev : types[0]));
      }
    } catch (e) {
      setErr(e.message || "Failed to load bids");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  // slotTypes present in bids
  const packages = useMemo(() => {
    const set = new Set(bids.map((b) => b.slotType).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [bids]);

  // group by slotType
  const byPkg = useMemo(() => {
    const map = {};
    for (const b of bids) {
      const key = b.slotType || "unknown";
      map[key] = map[key] || [];
      map[key].push(b);
    }
    // sort each package by amount desc for readability
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (Number(b.amount || 0) - Number(a.amount || 0)));
    }
    return map;
  }, [bids]);

  // search + filter list
  const activeList = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = bids
      .filter((b) => (pkg === "All" ? true : b.slotType === pkg))
      .filter((b) => {
        if (!q) return true;
        const sponsor = b.sponsorId || {};
        const s = `${sponsor.companyName || ""} ${sponsor.email || ""} ${sponsor.phone || ""} ${b.slotType || ""}`.toLowerCase();
        return s.includes(q);
      })
      .slice();

    list.sort((a, b) => {
      const da = Number(a.amount || 0);
      const db = Number(b.amount || 0);
      if (db !== da) return db - da;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return list;
  }, [bids, pkg, query]);

  // ✅ Current Selection (highest price for selected slotType)
  const currentWinner = useMemo(() => {
    const list = byPkg[selectedPackage] || [];
    return pickHighest(list);
  }, [byPkg, selectedPackage]);

  // ✅ actions call backend
  const approveBid = async (bidId) => {
    try {
      setErr("");
      await api(`/api/organiser/sponsor-bids/${bidId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      });
      await loadBids();
    } catch (e) {
      setErr(e.message || "Approve failed");
    }
  };

  const rejectBid = async (bidId) => {
    try {
      setErr("");
      await api(`/api/organiser/sponsor-bids/${bidId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reject" }),
      });
      await loadBids();
    } catch (e) {
      setErr(e.message || "Reject failed");
    }
  };

  return (
    <div className="orgCard">
      <div className="cardHeadRow" style={{ padding: 0, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Sponsors & Bids</h3>
          <div className="muted" style={{ marginTop: 4 }}>
            {tournament?.title || "—"} • {tournament?.course || "—"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn ghost" type="button" onClick={loadBids} disabled={loading || !tournamentId}>
            Refresh
          </button>
        </div>
      </div>

      {err ? <div className="orgError">⚠ {err}</div> : null}
      {loading ? <div className="muted">Loading bids…</div> : null}

      {/* Winner selector */}
      <div className="sponTop">
        <div className="sponWinnerCard">
          <div className="sponWinnerHead">
            <div>
              <div className="sponTitle">Current Selection</div>
              <div className="muted">Always highest bid (ignores rejected/withdrawn/lost)</div>
            </div>

            <select
              className="sponSelect"
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              disabled={Object.keys(byPkg).length === 0}
            >
              {Object.keys(byPkg).length === 0 ? (
                <option value="title">No slots</option>
              ) : (
                Object.keys(byPkg).map((p) => (
                  <option key={p} value={p}>
                    {SLOT_LABEL[p] || p}
                  </option>
                ))
              )}
            </select>
          </div>

          {!currentWinner ? (
            <div className="empty">No eligible bids for this slot.</div>
          ) : (
            <div className="sponWinnerBody">
              <div className="sponRow">
                <div className="sponK">Sponsor</div>
                <div className="sponV">
                  <b>{currentWinner.sponsorId?.companyName || "—"}</b>{" "}
                  <StatusPill status={currentWinner.status} />
                </div>
              </div>

              <div className="sponRow">
                <div className="sponK">Slot</div>
                <div className="sponV">{SLOT_LABEL[currentWinner.slotType] || currentWinner.slotType}</div>
              </div>

              <div className="sponRow">
                <div className="sponK">Bid</div>
                <div className="sponV">{moneyINR(currentWinner.amount)}</div>
              </div>

              <div className="sponRow">
                <div className="sponK">Contact</div>
                <div className="sponV">
                  <span className="muted">{currentWinner.sponsorId?.email || "—"}</span> •{" "}
                  <span className="muted">{currentWinner.sponsorId?.phone || "—"}</span>
                </div>
              </div>

              <div className="sponRow">
                <div className="sponK">Message</div>
                <div className="sponV">{currentWinner.message || "—"}</div>
              </div>

              <div className="sponActions">
                <button className="btn primary" type="button" onClick={() => approveBid(currentWinner._id)}>
                  Approve Winner
                </button>
                <button className="btn ghost" type="button" onClick={() => rejectBid(currentWinner._id)}>
                  Reject → Pick Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sponSearchCard">
          <div className="sponTitle">Browse Bids</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Search and manage all bids
          </div>

          <div className="sponFilters">
            <input
              className="sponInput"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sponsor / phone / email…"
            />

            <select className="sponSelect" value={pkg} onChange={(e) => setPkg(e.target.value)}>
              {packages.map((p) => (
                <option key={p} value={p}>
                  {p === "All" ? "All slots" : SLOT_LABEL[p] || p}
                </option>
              ))}
            </select>
          </div>

          <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
            Rule: only <b>1 Approved</b> per slotType. (Approve/reject backend manage karega)
          </div>
        </div>
      </div>

      {/* Bid List */}
      <div className="sponList">
        {activeList.map((b) => (
          <div key={b._id} className="sponBid">
            <div className="sponBidTop">
              <div className="sponBidL">
                <div className="sponBidName">
                  {b.sponsorId?.companyName || "—"} <StatusPill status={b.status} />
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  <b>{SLOT_LABEL[b.slotType] || b.slotType}</b> • {moneyINR(b.amount)} • Applied: {fmt(b.createdAt)}
                </div>
              </div>

              <div className="sponBidR">
                <button className="miniBtn ok" type="button" onClick={() => approveBid(b._id)}>
                  Approve
                </button>
                <button className="miniBtn danger" type="button" onClick={() => rejectBid(b._id)}>
                  Reject
                </button>
              </div>
            </div>

            <div className="sponBidBody">
              <div className="sponContact">
                <Pill kind="muted">{b.sponsorId?.email || "—"}</Pill>
                <Pill kind="muted">{b.sponsorId?.phone || "—"}</Pill>
              </div>

              {b.brandCategory ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  Category: <b>{b.brandCategory}</b>
                </div>
              ) : null}

              {b.message ? (
                <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
                  {b.message}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {!loading && activeList.length === 0 && <div className="empty">No bids found.</div>}
      </div>
    </div>
  );
}
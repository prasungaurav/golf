// frontend/src/pages/OrganiserManageTournaments.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../style/OrganiserManage.css";

import Match from "./Match";
import UpdatesLogs from "./Updates.jsx";
import Registrations from "./Registrations.jsx";
import Scheduling from "./Scheduling.jsx";
import Sponsors from "./Sponsor.jsx";
import Settings from "./Settings.jsx";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

/* -------------------- helpers -------------------- */
function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtLocalDT(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

// ISO/UTC -> value for <input type="datetime-local" />
function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// <input type="datetime-local" /> -> ISO string
function localInputToISO(localStr) {
  if (!localStr) return "";
  // localStr is like "2026-02-18T13:21"
  const d = new Date(localStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data;
}

/* -------------------- UI components -------------------- */
function ManageMenu({ open, onToggle, onPick }) {
  return (
    <div style={{ position: "relative" }}>
      <button className="btn ghost" onClick={onToggle} type="button">
        Manage ▾
      </button>

      {open && (
        <div className="orgDrop">
          <button className="dropItem" onClick={() => onPick("overview")} type="button">
            Overview
          </button>
          <button className="dropItem" onClick={() => onPick("matches")} type="button">
            Matches (Live)
          </button>
          <button className="dropItem" onClick={() => onPick("updates")} type="button">
            Updates / Logs
          </button>

          <div className="dropSep" />

          <button className="dropItem" onClick={() => onPick("registrations")} type="button">
            Registrations
          </button>
          <button className="dropItem" onClick={() => onPick("scheduling")} type="button">
            Scheduling
          </button>
          <button className="dropItem" onClick={() => onPick("sponsors")} type="button">
            Sponsors & Bids
          </button>
          <button className="dropItem danger" onClick={() => onPick("settings")} type="button">
            Settings
          </button>
        </div>
      )}
    </div>
  );
}

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="orgModalOverlay" onMouseDown={onClose}>
      <div className="orgModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="orgModalHead">
          <div className="orgModalTitle">{title}</div>
          <button className="btn ghost" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="orgModalBody">{children}</div>

        {footer && <div className="orgModalFoot">{footer}</div>}
      </div>
    </div>
  );
}

/* -------------------- main page -------------------- */
export default function OrganiserManageTournaments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Left history list
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    return localStorage.getItem("org_selected_id") || null;
  });

  // Right panel menu + view
  const [openMenu, setOpenMenu] = useState(false);
  const [rightView, setRightView] = useState(() => {
    return localStorage.getItem("org_right_view") || "overview";
  });

  useEffect(() => {
    if (selectedId) localStorage.setItem("org_selected_id", selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (rightView) localStorage.setItem("org_right_view", rightView);
  }, [rightView]);

  // Create Modal
  const [openCreate, setOpenCreate] = useState(false);

  // Edit Modal
  const [openEditId, setOpenEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const selected = useMemo(() => {
    return items.find((x) => String(x._id) === String(selectedId)) || null;
  }, [items, selectedId]);

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    status: "published",
    visibility: "public",
    bannerUrl: "",
    course: "",
    city: "",
    startDate: "",
    endDate: "",
    teeOffWindow: "",
    format: "Stroke Play",
    rounds: 1,
    rulesText: "",

    // registration
    fee: 0,
    currency: "₹",
    maxPlayers: 0,
    waitlistEnabled: false,
    handicapMin: 0,
    handicapMax: 54,
    teamAllowed: false,
    teamSize: 1,
    regClosesAtLocal: "", // datetime-local string
    policyText: "",
  });

  const resetCreateForm = () => {
    setCreateForm({
      title: "",
      description: "",
      status: "published",
      visibility: "public",
      bannerUrl: "",
      course: "",
      city: "",
      startDate: "",
      endDate: "",
      teeOffWindow: "",
      format: "Stroke Play",
      rounds: 1,
      rulesText: "",

      fee: 0,
      currency: "₹",
      maxPlayers: 0,
      waitlistEnabled: false,
      handicapMin: 0,
      handicapMax: 54,
      teamAllowed: false,
      regClosesAtLocal: "",
      policyText: "",
    });
  };

  const getFormatConfig = (format) => {
    const f = (format || "").toLowerCase();
    if (f.includes("scramble")) {
      return { isFlexible: true, allowedSizes: [2, 3, 4], defaultSize: 4 };
    }
    if (f.includes("mixed") || f.includes("multi-round")) {
      return { isFlexible: true, allowedSizes: [1, 2, 3, 4], defaultSize: 1 };
    }
    if (f.includes("fourball") || f.includes("better ball") || f.includes("foursomes")) {
      return { isFlexible: false, allowedSizes: [2], defaultSize: 2 };
    }
    return { isFlexible: false, allowedSizes: [1], defaultSize: 1 };
  };

  const loadList = async () => {
    setError("");
    setLoading(true);
    setOpenMenu(false);
    try {
      const data = await api("/api/tournaments/me", { method: "GET" });
      const list = data?.tournaments || [];
      setItems(list);

      setSelectedId((prev) => {
        const isValid = list.some((t) => String(t._id) === String(prev));
        return isValid ? prev : (list?.[0]?._id || null);
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTournament = async () => {
    setError("");
    const { title, course, startDate, endDate, regClosesAtLocal } = createForm;
    if (!title?.trim() || !course?.trim() || !startDate || !endDate || !regClosesAtLocal) {
       return setError("Title, Course, Start Date, End Date, and Registration Closing Date are all required.");
    }

    try {
      const rules = (createForm.rulesText || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: createForm.title,
        description: createForm.description || "",
        status: "published",
        visibility: createForm.visibility || "public",
        bannerUrl: createForm.bannerUrl || "",
        course: createForm.course || "",
        city: createForm.city || "",
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        teeOffWindow: createForm.teeOffWindow || "",
        format: createForm.format || "Stroke Play",
        rounds: Number(createForm.rounds) || 1,
        rules,

        registration: {
          fee: Number(createForm.fee || 0),
          currency: createForm.currency || "₹",
          maxPlayers: Number(createForm.maxPlayers || 0),
          waitlistEnabled: !!createForm.waitlistEnabled,
          handicapMin: Number(createForm.handicapMin || 0),
          handicapMax: Number(createForm.handicapMax || 54),
          teamAllowed: Number(createForm.teamSize) > 1,
          teamSize: Number(createForm.teamSize) || 1,
          extras: [],
          regClosesAt: localInputToISO(createForm.regClosesAtLocal), // store ISO
          policyText: createForm.policyText || "",
        },
      };

      const data = await api("/api/tournaments", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newId = data?.tournament?._id;
      if (!newId) throw new Error("Created but id missing in response");

      setOpenCreate(false);
      resetCreateForm();

      await loadList();
      setSelectedId(newId);
      setRightView("overview");
    } catch (e) {
      setError(e.message);
    }
  };

  const selectItem = (id) => {
    setSelectedId(id);
    setOpenMenu(false);
    setRightView("overview");
  };

  // Open edit modal pre-filled from tournament data
  const openEditModal = (e, t) => {
    e.stopPropagation(); // don't select the item
    setEditForm({
      title: t.title || "",
      description: t.description || "",
      status: t.status || "draft",
      visibility: t.visibility || "public",
      bannerUrl: t.bannerUrl || "",
      course: t.course || "",
      city: t.city || "",
      startDate: t.startDate ? t.startDate.slice(0, 10) : "",
      endDate: t.endDate ? t.endDate.slice(0, 10) : "",
      teeOffWindow: t.teeOffWindow || "",
      format: t.format || "Stroke Play",
      rounds: t.rounds || 1,
      rulesText: (t.rules || []).join("\n"),
      fee: t.registration?.fee ?? 0,
      currency: t.registration?.currency || "₹",
      maxPlayers: t.registration?.maxPlayers ?? 0,
      waitlistEnabled: !!t.registration?.waitlistEnabled,
      handicapMin: t.registration?.handicapMin ?? 0,
      handicapMax: t.registration?.handicapMax ?? 54,
      teamAllowed: Number(t.registration?.teamSize) > 1,
      teamSize: t.registration?.teamSize || 1,
      regClosesAtLocal: isoToLocalInput(t.registration?.regClosesAt),
      policyText: t.registration?.policyText || "",
    });
    setOpenEditId(String(t._id));
  };

  const saveTournament = async () => {
    if (!openEditId) return;
    setError("");
    const { title, course, startDate, endDate, regClosesAtLocal } = editForm;
    if (!title?.trim() || !course?.trim() || !startDate || !endDate || !regClosesAtLocal) {
       return setError("Title, Course, Start Date, End Date, and Registration Closing Date are all required.");
    }
    setEditLoading(true);
    try {
      const rules = (editForm.rulesText || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: editForm.title,
        description: editForm.description || "",
        status: "published",
        visibility: editForm.visibility || "public",
        bannerUrl: editForm.bannerUrl || "",
        course: editForm.course || "",
        city: editForm.city || "",
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        teeOffWindow: editForm.teeOffWindow || "",
        format: editForm.format || "Stroke Play",
        rounds: Number(editForm.rounds) || 1,
        rules,
        registration: {
          fee: Number(editForm.fee || 0),
          currency: editForm.currency || "₹",
          maxPlayers: Number(editForm.maxPlayers || 0),
          waitlistEnabled: !!editForm.waitlistEnabled,
          handicapMin: Number(editForm.handicapMin || 0),
          handicapMax: Number(editForm.handicapMax || 54),
          teamAllowed: Number(editForm.teamSize) > 1,
          teamSize: Number(editForm.teamSize) || 1,
          regClosesAt: localInputToISO(editForm.regClosesAtLocal),
          policyText: editForm.policyText || "",
        },
      };

      await api(`/api/tournaments/me/${openEditId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setOpenEditId(null);
      await loadList();
    } catch (e) {
      setError(e.message);
    } finally {
      setEditLoading(false);
    }
  };

  const pickView = (view) => {
    setRightView(view);
    setOpenMenu(false);
  };

  const renderBody = () => {
    if (!selected) return <div className="orgCard">Select an item from history</div>;

    if (rightView === "overview") {
      return (
        <div className="orgCard">
          <button
            className="btn primary"
            type="button"
            onClick={() =>
              window.open(
                `/organiser/checkin/${selected._id}`,
                "_blank"
              )
            }
          >
            Open QR Scanner
          </button>
          <div className="orgInfoGrid">
            <div className="infoRow">
              <div className="infoK">City</div>
              <div className="infoV">{selected.city || "—"}</div>
            </div>

            <div className="infoRow">
              <div className="infoK">Visibility / Permissions</div>
              <div className="infoV">
                {selected.visibility === "private" ? "🔒 PRIVATE" : "🌍 PUBLIC"}
              </div>
            </div>

            {selected.visibility === "private" && (
              <div className="infoRow span2" style={{ background: 'var(--primary_container)', border: '1px solid var(--primary)' }}>
                <div className="infoK" style={{ color: 'var(--on_primary_container)' }}>Direct Invite Link (Private)</div>
                <div className="infoV" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    readOnly
                    value={`${window.location.origin}/tournaments?tid=${selected._id}`}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--outline)' }}
                  />
                  <button
                    className="btn primary"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/tournaments?tid=${selected._id}`);
                      alert("Link copied!");
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="infoRow">
              <div className="infoK">Format</div>
              <div className="infoV">{selected.format || "—"}</div>
            </div>

            <div className="infoRow">
              <div className="infoK">Rounds</div>
              <div className="infoV">{selected.rounds || 1}</div>
            </div>

            <div className="infoRow">
              <div className="infoK">Fee</div>
              <div className="infoV">
                {selected?.registration?.currency || "₹"}
                {selected?.registration?.fee ?? 0}
              </div>
            </div>

            <div className="infoRow">
              <div className="infoK">Max Players</div>
              <div className="infoV">{selected?.registration?.maxPlayers ?? 0}</div>
            </div>

            <div className="infoRow">
              <div className="infoK">Reg closes</div>
              <div className="infoV">{fmtLocalDT(selected?.registration?.regClosesAt)}</div>
            </div>

            <div className="infoRow span2">
              <div className="infoK">Description</div>
              <div className="infoV">{selected.description || "—"}</div>
            </div>

            <div className="infoRow span2">
              <div className="infoK">Rules</div>
              <div className="infoV">
                {(selected.rules && selected.rules.length > 0)
                  ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {selected.rules.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (rightView === "matches") return <Match key={selected._id} tournament={selected} onUpdate={loadList} />;
    if (rightView === "updates") return <UpdatesLogs key={selected._id} tournament={selected} onUpdate={loadList} />;
    if (rightView === "registrations") return <Registrations key={selected._id} tournament={selected} onUpdate={loadList} />;
    if (rightView === "scheduling") return <Scheduling key={selected._id} tournament={selected} onUpdate={loadList} />;
    if (rightView === "sponsors") return <Sponsors key={selected._id} tournament={selected} onUpdate={loadList} />;
    if (rightView === "settings") return <Settings key={selected._id} tournament={selected} onUpdate={loadList} />;

    return <div className="orgCard">Unknown view: {rightView}</div>;
  };

  if (loading) {
    return (
      <div className="orgWrap">
        <div className="orgCard">Loading...</div>
      </div>
    );
  }

  return (
    <div className="orgWrap">
      {error && <div className="orgError">⚠ {error}</div>}

      <div className="orgGrid">
        {/* LEFT */}
        <aside className="orgLeft">
          <div className="orgCard orgChatCard">
            <div className="cardHeadRow">
              <div>
                <h3 style={{ margin: 0 }}>History</h3>
                <div className="muted" style={{ marginTop: 4 }}>
                  {items.length} items
                </div>
              </div>

              <div className="rowEnd">
                <button className="btn primary" type="button" onClick={() => setOpenCreate(true)}>
                  + Create
                </button>
              </div>
            </div>

            <div className="orgChatList">
              {items.map((x) => {
                const active = String(x._id) === String(selectedId);
                return (
                  <div key={x._id} style={{ position: "relative" }}>
                    <button
                      className={`orgChatItem ${active ? "active" : ""}`}
                      type="button"
                      onClick={() => selectItem(x._id)}
                      title={x.title}
                    >
                      <div className="orgChatBubble">
                        <div className="orgChatTitle" style={{ paddingRight: 28 }}>{x.title}</div>
                        <div className="orgChatMeta">
                          {x.course || "—"} • {fmtDate(x.startDate)} → {fmtDate(x.endDate)}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Edit tournament"
                      onClick={(e) => openEditModal(e, x)}
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "1px solid var(--outline_variant)",
                        background: "var(--surface_container_high)",
                        color: "var(--on_surface_variant)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        transition: "background 0.15s ease, color 0.15s ease, transform 0.1s ease",
                        zIndex: 2,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--primary_container)";
                        e.currentTarget.style.color = "var(--on_primary_container)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--surface_container_high)";
                        e.currentTarget.style.color = "var(--on_surface_variant)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      ✏
                    </button>
                  </div>
                );
              })}

              {items.length === 0 && <div className="empty">No history yet.</div>}
            </div>
          </div>
        </aside>

        {/* RIGHT */}
        <section className="orgRight">
          {!selected ? (
            <div className="orgCard">Select an item from history</div>
          ) : (
            <div className="orgRightShell">
              <div className="orgRightTop">
                <div className="orgRightTitle">
                  <div className="orgH">
                    <h3 style={{ margin: 0 }}>{selected.title}</h3>
                    <div className="muted">
                      {(selected.course || "—")} • {fmtDate(selected.startDate)} → {fmtDate(selected.endDate)}
                    </div>
                  </div>
                </div>

                <div className="orgRightActions">
                  <div className="orgTabs">
                    <button
                      type="button"
                      className={`tabBtn ${rightView === "overview" ? "active" : ""}`}
                      onClick={() => pickView("overview")}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      className={`tabBtn ${rightView === "matches" ? "active" : ""}`}
                      onClick={() => pickView("matches")}
                    >
                      Matches (Live)
                    </button>
                    <button
                      type="button"
                      className={`tabBtn ${rightView === "updates" ? "active" : ""}`}
                      onClick={() => pickView("updates")}
                    >
                      Updates / Logs
                    </button>
                  </div>

                  <ManageMenu open={openMenu} onToggle={() => setOpenMenu((p) => !p)} onPick={pickView} />
                </div>
              </div>

              <div className="orgRightBody">{renderBody()}</div>
            </div>
          )}
        </section>
      </div>

      {/* CREATE MODAL */}
      <Modal
        open={openCreate}
        title="Create / Register Tournament"
        onClose={() => setOpenCreate(false)}
        footer={
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" type="button" onClick={() => setOpenCreate(false)}>
              Cancel
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={createTournament}
              disabled={
                !createForm.title ||
                !createForm.course ||
                !createForm.startDate ||
                !createForm.endDate ||
                !createForm.regClosesAtLocal
              }
            >
              Save
            </button>
          </div>
        }
      >
        <div className="formGrid">
          <div className="span2" style={{ fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--outline_variant)', paddingBottom: 8, marginBottom: 8 }}>
            1. Basic details
          </div>
          <label className="span2">
            Title *
            <input
              value={createForm.title}
              onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
            />
          </label>

          <label className="span2">
            Description
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>


          <label>
            Visibility (Permissions)
            <select
              value={createForm.visibility}
              onChange={(e) => setCreateForm((p) => ({ ...p, visibility: e.target.value }))}
            >
              <option value="public">🌍 Public (Visible to all)</option>
              <option value="private">🔒 Private (Invited / Registered Only)</option>
            </select>
          </label>

          <label className="span2">
            Banner URL
            <input
              value={createForm.bannerUrl}
              onChange={(e) => setCreateForm((p) => ({ ...p, bannerUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>

          <div className="span2" style={{ fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--outline_variant)', paddingBottom: 8, marginBottom: 8, marginTop: 15 }}>
            2. Location & Timing
          </div>

          <label>
            Start Date *
            <input
              type="date"
              value={createForm.startDate}
              onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
            />
          </label>

          <label>
            End Date *
            <input
              type="date"
              value={createForm.endDate}
              onChange={(e) => setCreateForm((p) => ({ ...p, endDate: e.target.value }))}
            />
          </label>

          <label>
            Course *
            <input
              value={createForm.course}
              onChange={(e) => setCreateForm((p) => ({ ...p, course: e.target.value }))}
            />
          </label>

          <label>
            City
            <input
              value={createForm.city}
              onChange={(e) => setCreateForm((p) => ({ ...p, city: e.target.value }))}
            />
          </label>

          <label className="span2">
            Registration Closes At * (datetime-local)
            <input
              type="datetime-local"
              value={createForm.regClosesAtLocal}
              onChange={(e) => setCreateForm((p) => ({ ...p, regClosesAtLocal: e.target.value }))}
            />
          </label>

          <div className="span2" style={{ fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--outline_variant)', paddingBottom: 8, marginBottom: 8, marginTop: 15 }}>
            3. Format & Rules
          </div>

          <label>
            Tee-off window (text)
            <input
              value={createForm.teeOffWindow}
              onChange={(e) => setCreateForm((p) => ({ ...p, teeOffWindow: e.target.value }))}
              placeholder="e.g. 7:00 AM - 11:00 AM"
            />
          </label>

          <label>
            Format
            <select
              value={createForm.format}
              onChange={(e) => {
                const val = e.target.value;
                const conf = getFormatConfig(val);
                setCreateForm((p) => ({ ...p, format: val, teamSize: conf.defaultSize }));
              }}
            >
              <option value="Stroke Play">Stroke Play</option>
              <option value="Match Play">Match Play</option>
              <option value="Stableford">Stableford</option>
              <option value="Fourball">Fourball</option>
              <option value="Better Ball">Better Ball</option>
              <option value="Scramble">Scramble</option>
              <option value="Mixed">Mixed / Multi-Round</option>
            </select>
          </label>

          <label>
            Team Size
            {getFormatConfig(createForm.format).isFlexible ? (
              <select
                value={createForm.teamSize}
                onChange={(e) => setCreateForm((p) => ({ ...p, teamSize: e.target.value }))}
              >
                {getFormatConfig(createForm.format).allowedSizes.map(s => (
                  <option key={s} value={s}>{s} Players</option>
                ))}
              </select>
            ) : (
              <input 
                disabled 
                value={`${getFormatConfig(createForm.format).defaultSize} Player(s)`} 
                style={{ background: 'var(--surface_container)', cursor: 'not-allowed', color: 'var(--on_surface_variant)' }}
              />
            )}
          </label>

          <label>
            Rounds
            <input
              type="number"
              min={1}
              value={createForm.rounds}
              onChange={(e) => setCreateForm((p) => ({ ...p, rounds: e.target.value }))}
            />
          </label>

          <label className="span2">
            Rules (1 per line)
            <textarea
              value={createForm.rulesText}
              onChange={(e) => setCreateForm((p) => ({ ...p, rulesText: e.target.value }))}
              placeholder={"Example:\nNo mulligans\nStrict pace of play\n..."}
            />
          </label>

          <div className="span2" style={{ marginTop: 6, fontWeight: 700 }}>
            Registration
          </div>

          <label>
            Fee
            <input
              type="number"
              min={0}
              value={createForm.fee}
              onChange={(e) => setCreateForm((p) => ({ ...p, fee: e.target.value }))}
            />
          </label>

          <label>
            Currency
            <select
              value={createForm.currency}
              onChange={(e) => setCreateForm((p) => ({ ...p, currency: e.target.value }))}
            >
              <option value="₹">₹</option>
              <option value="$">$</option>
              <option value="€">€</option>
            </select>
          </label>

          <label>
            Max Players
            <input
              type="number"
              min={0}
              value={createForm.maxPlayers}
              onChange={(e) => setCreateForm((p) => ({ ...p, maxPlayers: e.target.value }))}
            />
          </label>

          <label>
            Waitlist Enabled
            <select
              value={createForm.waitlistEnabled ? "yes" : "no"}
              onChange={(e) => setCreateForm((p) => ({ ...p, waitlistEnabled: e.target.value === "yes" }))}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>

          <label>
            Handicap Min
            <input
              type="number"
              min={0}
              value={createForm.handicapMin}
              onChange={(e) => setCreateForm((p) => ({ ...p, handicapMin: e.target.value }))}
            />
          </label>

          <label>
            Handicap Max
            <input
              type="number"
              min={0}
              value={createForm.handicapMax}
              onChange={(e) => setCreateForm((p) => ({ ...p, handicapMax: e.target.value }))}
            />
          </label>

          {(createForm.format === "Fourball" || createForm.format === "Better Ball" || createForm.format === "Scramble" || createForm.format === "Mixed") && (
            <label>
              Team Registration
              <select
                value={createForm.teamAllowed ? "yes" : "no"}
                onChange={(e) => setCreateForm((p) => ({ ...p, teamAllowed: e.target.value === "yes" }))}
              >
                <option value="no">Individual Only</option>
                <option value="yes">Teams Allowed</option>
              </select>
            </label>
          )}

          <label className="span2">
            Policy Text
            <textarea
              value={createForm.policyText}
              onChange={(e) => setCreateForm((p) => ({ ...p, policyText: e.target.value }))}
            />
          </label>
        </div>
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal
        open={!!openEditId}
        title="Edit Tournament"
        onClose={() => setOpenEditId(null)}
        footer={
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" type="button" onClick={() => setOpenEditId(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={saveTournament}
              disabled={
                editLoading ||
                !editForm.title ||
                !editForm.course ||
                !editForm.startDate ||
                !editForm.endDate
              }
            >
              {editLoading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        }
      >
        <div className="formGrid">
          <div className="span2" style={{ fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--outline_variant)', paddingBottom: 8, marginBottom: 8 }}>
            1. Basic Details
          </div>
          <label className="span2">
            Title *
            <input
              value={editForm.title || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
            />
          </label>

          <label className="span2">
            Description
            <textarea
              value={editForm.description || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>

          <label>
            Status (Progress)
            <select
              value={editForm.status || "draft"}
              onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="draft">Draft (Editing / Not Visible)</option>
              <option value="published">Published (Live for Players)</option>
              <option value="archived">Archived (Finished / Read-only)</option>
            </select>
          </label>

          <label>
            Visibility (Permissions)
            <select
              value={editForm.visibility || "public"}
              onChange={(e) => setEditForm((p) => ({ ...p, visibility: e.target.value }))}
            >
              <option value="public">🌍 Public (Visible to all)</option>
              <option value="private">🔒 Private (Invited / Registered Only)</option>
            </select>
          </label>

          <label className="span2">
            Banner URL
            <input
              value={editForm.bannerUrl || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, bannerUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>

          <div className="span2" style={{ fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--outline_variant)', paddingBottom: 8, marginBottom: 8, marginTop: 15 }}>
            2. Location & Timing
          </div>

          <label>
            Start Date *
            <input
              type="date"
              value={editForm.startDate || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
            />
          </label>

          <label>
            End Date *
            <input
              type="date"
              value={editForm.endDate || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
            />
          </label>

          <label>
            Course *
            <input
              value={editForm.course || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, course: e.target.value }))}
            />
          </label>

          <label>
            City
            <input
              value={editForm.city || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
            />
          </label>

          <label className="span2">
            Registration Closes At (datetime-local)
            <input
              type="datetime-local"
              value={editForm.regClosesAtLocal || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, regClosesAtLocal: e.target.value }))}
            />
          </label>

          <div className="span2" style={{ fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--outline_variant)', paddingBottom: 8, marginBottom: 8, marginTop: 15 }}>
            3. Format & Rules
          </div>

          <label>
            Tee-off window
            <input
              value={editForm.teeOffWindow || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, teeOffWindow: e.target.value }))}
              placeholder="e.g. 7:00 AM - 11:00 AM"
            />
          </label>

          <label>
            Format
            <select
              value={editForm.format || "Stroke Play"}
              onChange={(e) => {
                const val = e.target.value;
                const conf = getFormatConfig(val);
                setEditForm((p) => ({ ...p, format: val, teamSize: conf.defaultSize }));
              }}
            >
              <option value="Stroke Play">Stroke Play</option>
              <option value="Match Play">Match Play</option>
              <option value="Stableford">Stableford</option>
              <option value="Fourball">Fourball</option>
              <option value="Better Ball">Better Ball</option>
              <option value="Scramble">Scramble</option>
              <option value="Mixed">Mixed / Multi-Round</option>
            </select>
          </label>

          <label>
            Team Size
            {getFormatConfig(editForm.format).isFlexible ? (
              <select
                value={editForm.teamSize || 1}
                onChange={(e) => setEditForm((p) => ({ ...p, teamSize: e.target.value }))}
              >
                {getFormatConfig(editForm.format).allowedSizes.map(s => (
                  <option key={s} value={s}>{s} Players</option>
                ))}
              </select>
            ) : (
              <input 
                disabled 
                value={`${getFormatConfig(editForm.format).defaultSize} Player(s)`} 
                style={{ background: 'var(--surface_container)', cursor: 'not-allowed', color: 'var(--on_surface_variant)' }}
              />
            )}
          </label>

          <label>
            Rounds
            <input
              type="number" min={1}
              value={editForm.rounds || 1}
              onChange={(e) => setEditForm((p) => ({ ...p, rounds: e.target.value }))}
            />
          </label>

          <label className="span2">
            Rules (1 per line)
            <textarea
              value={editForm.rulesText || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, rulesText: e.target.value }))}
              placeholder="No mulligans&#10;Strict pace of play"
            />
          </label>



          <div className="span2" style={{ fontWeight: 800, color: 'var(--primary)', borderBottom: '1px solid var(--outline_variant)', paddingBottom: 8, marginBottom: 8, marginTop: 15 }}>
            4. Registration & Fee
          </div>

          <label>
            Fee
            <input
              type="number" min={0}
              value={editForm.fee ?? 0}
              onChange={(e) => setEditForm((p) => ({ ...p, fee: e.target.value }))}
            />
          </label>

          <label>
            Currency
            <select
              value={editForm.currency || "₹"}
              onChange={(e) => setEditForm((p) => ({ ...p, currency: e.target.value }))}
            >
              <option value="₹">₹</option>
              <option value="$">$</option>
              <option value="€">€</option>
            </select>
          </label>

          <label>
            Max Players
            <input
              type="number" min={0}
              value={editForm.maxPlayers ?? 0}
              onChange={(e) => setEditForm((p) => ({ ...p, maxPlayers: e.target.value }))}
            />
          </label>

          <label>
            Waitlist Enabled
            <select
              value={editForm.waitlistEnabled ? "yes" : "no"}
              onChange={(e) => setEditForm((p) => ({ ...p, waitlistEnabled: e.target.value === "yes" }))}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>

          <label>
            Handicap Min
            <input
              type="number" min={0}
              value={editForm.handicapMin ?? 0}
              onChange={(e) => setEditForm((p) => ({ ...p, handicapMin: e.target.value }))}
            />
          </label>

          <label>
            Handicap Max
            <input
              type="number" min={0}
              value={editForm.handicapMax ?? 54}
              onChange={(e) => setEditForm((p) => ({ ...p, handicapMax: e.target.value }))}
            />
          </label>

          <label>
            Team Allowed
            <select
              value={editForm.teamAllowed ? "yes" : "no"}
              onChange={(e) => setEditForm((p) => ({ ...p, teamAllowed: e.target.value === "yes" }))}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>

          <label className="span2">
            Policy Text
            <textarea
              value={editForm.policyText || ""}
              onChange={(e) => setEditForm((p) => ({ ...p, policyText: e.target.value }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
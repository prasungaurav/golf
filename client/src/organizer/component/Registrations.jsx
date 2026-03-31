import React, { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000"; // change if needed

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

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

function Pill({ status }) {
  const s = String(status || "").toLowerCase();
  const cls =
    s === "approved"
      ? "pill pill-ok"
      : s === "pending"
        ? "pill pill-warn"
        : s === "waitlist"
          ? "pill pill-info"
          : s === "rejected" || s === "blocked"
            ? "pill pill-bad"
            : "pill";
  return <span className={cls}>{status || "—"}</span>;
}

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="orgModalOverlay" onMouseDown={onClose}>
      <div className="orgModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="orgModalHead">
          <div className="orgModalTitle">{title}</div>
          <button className="btn ghost" type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="orgModalBody">{children}</div>
        {footer && <div className="orgModalFoot">{footer}</div>}
      </div>
    </div>
  );
}

export default function Registrations({ tournament }) {
  const tid = tournament?._id;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [rows, setRows] = useState([]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All"); // All/Pending/Approved/Waitlist/Rejected/Blocked
  const [onlyPaid, setOnlyPaid] = useState(false);
  const [groupedRows, setGroupedRows] = useState([]);

  // optional: manual add modal (frontend only)
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    handicap: "",
    gender: "M",
    note: "",
    status: "pending",
    paid: false,
    teamName: "",
    partners: [] // Array of {name, phone, email, handicap}
  });

  const load = async () => {
    if (!tid) return;
    setLoading(true);
    setErr("");
    try {
      const data = await api(`/api/tournaments/me/${tid}/registrations`);
      setRows(Array.isArray(data.items) ? data.items : []);
      setGroupedRows(Array.isArray(data.grouped) ? data.grouped : []);
    } catch (e) {
      setErr(e.message || "Failed to load registrations");
      setRows([]);
      setGroupedRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tid]);


  const optimisticUpdate = (rid, patch) => {
    setRows((prev) => {
      const target = prev.find(r => String(r._id) === String(rid));
      const gid = target?.registrationGroupId;

      return prev.map((r) => {
        // If they share a registrationGroupId, they are a team -> update all
        if (gid && r.registrationGroupId === gid) {
          return { ...r, ...patch };
        }
        // fallback to single record if no gid
        if (String(r._id) === String(rid)) {
          return { ...r, ...patch };
        }
        return r;
      });
    });
  };

  const setRowStatus = async (rid, nextStatus) => {
    if (!tid) return;
    const next = String(nextStatus).toLowerCase();

    // optimistic UI
    const prev = rows.find((r) => String(r._id) === String(rid));
    optimisticUpdate(rid, { status: next });

    try {
      await api(`/api/tournaments/me/${tid}/registrations/${rid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
    } catch (e) {
      // rollback
      if (prev) optimisticUpdate(rid, { status: prev.status });
      alert(e.message || "Failed to update status");
    }
  };

  const togglePaid = async (rid) => {
    if (!tid) return;
    const row = rows.find((r) => String(r._id) === String(rid));
    if (!row) return;

    const nextPaid = !row.paid;

    // optimistic
    optimisticUpdate(rid, { paid: nextPaid });

    try {
      await api(`/api/tournaments/me/${tid}/registrations/${rid}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paid: nextPaid, paymentRef: row.paymentRef || "" }),
      });
    } catch (e) {
      optimisticUpdate(rid, { paid: !!row.paid });
      alert(e.message || "Failed to update paid");
    }
  };

  const removeRowLocal = async (rid) => {
    if (!tid) return;
    if (!window.confirm("Are you sure you want to completely remove this registration? (For teams, this removes ALL members)")) return;

    const target = rows.find(r => String(r._id) === String(rid));
    const gid = target?.registrationGroupId;

    // optimistic
    const prevRows = [...rows];
    setRows((p) => p.filter((r) => {
      if (gid && r.registrationGroupId === gid) return false;
      return String(r._id) !== String(rid);
    }));

    if (String(rid).startsWith("local-")) return;

    try {
      await api(`/api/tournaments/me/${tid}/registrations/${rid}`, { // Changed to DELETE endpoint
        method: "DELETE",
      });
    } catch (e) {
      setRows(prevRows);
      alert(e.message || "Failed to remove registration");
    }
  };

  // Manual add: your backend does NOT have organiser manual create registration endpoint
  // So this is UI-only for now. (If you add backend later, we connect it.)
  // ✅ Manual add (Now saved to DB)
  const addPlayerLocal = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    if (!tid) return;

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        handicap: form.handicap,
        city: form.city.trim(),
        notes: form.note.trim(),
        paid: !!form.paid,
        teamName: form.teamName.trim(),
        partners: form.partners.filter(p => p.name && p.phone)
      };

      await api(`/api/tournaments/me/${tid}/registrations/manual`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setOpenAdd(false);
      setForm({
        name: "",
        email: "",
        phone: "",
        city: "",
        handicap: "",
        gender: "M",
        note: "",
        status: "pending",
        paid: false,
        teamName: "",
        partners: []
      });

      await load(); // Reload list
    } catch (e) {
      alert(e.message || "Failed to add player");
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupedRows
      .filter((g) => {
        if (status === "All") return true;
        const st = String(g.status || "").toLowerCase();
        return st === String(status).toLowerCase();
      })
      .filter((g) => {
        if (!q) return true;
        const s = `${g.teamName || ""} ${g.members.map(m => m.player?.name || "").join(" ")}`.toLowerCase();
        return s.includes(q);
      });
  }, [groupedRows, query, status]);

  return (
    <div className="orgCard">
      <div className="cardHeadRow" style={{ padding: 0, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Registrations</h3>
          <div className="muted" style={{ marginTop: 4 }}>
            {tournament?.title || "Tournament"} • {tournament?.course || "Course"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" type="button" onClick={load} disabled={loading || !tid}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button className="btn primary" type="button" onClick={() => setOpenAdd(true)}>
            + Add Player
          </button>
        </div>
      </div>

      {err && (
        <div className="orgAlert danger" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {/* Controls */}
      <div className="regTop" style={{ flexDirection: 'column', gap: 15, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>Team Registrations ({groupedRows.length})</div>
          <div style={{ flex: 1 }} />
          <button className="btn primary" type="button" onClick={() => setOpenAdd(true)}>
             + Add Player
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, width: '100%', flexWrap: 'wrap' }}>
          <input
            className="regSearch"
            style={{ flex: 1, minWidth: 300 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / email / phone / city / team…"
          />

          <div className="regFilters">
            <select className="regSelect" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="waitlist">Waitlist</option>
              <option value="rejected">Rejected</option>
              <option value="blocked">Blocked</option>
            </select>

            <label className="regChk">
              <input type="checkbox" checked={onlyPaid} onChange={(e) => setOnlyPaid(e.target.checked)} />
              Paid only
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="regTableWrap">
        <table className="regTable">
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Members</th>
              <th>Status</th>
              <th>Overall Paid</th>
              <th>Applied</th>
              <th style={{ width: 150 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>
                  <div className="empty">Loading registrations...</div>
                </td>
              </tr>
            )}

            {!loading && filteredTeams.map((g) => {
              const isPaidAll = g.members.every(m => m.paid);
              return (
                <tr key={g.groupId} className="teamRow">
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>{g.teamName}</div>
                    <div className="tiny muted">{g.groupId}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {g.members.map((m, idx) => (
                        <div key={m._id} style={{
                          padding: '6px 10px',
                          background: 'var(--surface_container_low)',
                          borderRadius: 6,
                          fontSize: '0.85rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong>{m.player?.name}</strong>
                              <span className={`tiny pill ${m.isLeader ? 'pill-ok' : ''}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                                {m.isLeader ? 'LEADER' : 'PLAYER'}
                              </span>
                            </div>
                            <div className="tiny muted">{m.player?.email} • HCP: {m.player?.handicap ?? "—"}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <span className={`tiny pill ${m.paid ? 'pill-ok' : 'pill-bad'}`}>{m.paid ? 'Paid' : 'Unpaid'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td><Pill status={g.status} /></td>
                  <td>
                    <button className={`miniBtn ${isPaidAll ? "ok" : ""}`} type="button" onClick={() => togglePaid(g.members[0]._id)}>
                      {isPaidAll ? "All Paid" : "Mark Team Paid"}
                    </button>
                  </td>
                  <td className="regMono">{fmt(g.members[0].createdAt)}</td>
                  <td>
                    <div className="regActions">
                      <button className="miniBtn ok" type="button" onClick={() => setRowStatus(g.members[0]._id, "approved")}>Approve</button>
                      <button className="miniBtn dangerOutline" type="button" onClick={() => setRowStatus(g.members[0]._id, "rejected")}>Reject</button>
                      <button className="miniBtn" type="button" onClick={() => removeRowLocal(g.members[0]._id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && filteredTeams.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty">No team registrations found.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Player Modal (UI-only) */}
      <Modal
        open={openAdd}
        title="Add Player (Manual Registration)"
        onClose={() => setOpenAdd(false)}
        footer={
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" type="button" onClick={() => setOpenAdd(false)}>
              Cancel
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={addPlayerLocal}
              disabled={!form.name.trim() || !form.phone.trim()}
            >
              Save
            </button>
          </div>
        }
      >
        <div className="formGrid">
          <label className="span2">
            Team Name (Optional)
            <input
              placeholder="e.g. Dream Team"
              value={form.teamName}
              onChange={(e) => setForm((p) => ({ ...p, teamName: e.target.value }))}
            />
          </label>

          <label className="span2">
            Main Player Name *
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </label>

          <label>
            Phone *
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </label>

          <label>
            Email
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </label>

          <label>
            Handicap
            <input
              type="number"
              value={form.handicap}
              onChange={(e) => setForm((p) => ({ ...p, handicap: e.target.value }))}
            />
          </label>

          <label>
            City/Club
            <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </label>

          <div className="span2" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>Partners ({form.partners.length})</strong>
              <button className="btn small" type="button" onClick={() => setForm(p => ({ ...p, partners: [...p.partners, { name: "", phone: "", email: "", handicap: "" }] }))}>+ Add Partner</button>
            </div>
            {form.partners.map((partner, idx) => (
              <div key={idx} style={{ padding: 12, border: '1px solid var(--outline_variant)', borderRadius: 8, marginBottom: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input placeholder="Partner Name" value={partner.name} onChange={(e) => {
                  const newP = [...form.partners];
                  newP[idx].name = e.target.value;
                  setForm(p => ({ ...p, partners: newP }));
                }} />
                <input placeholder="Partner Phone" value={partner.phone} onChange={(e) => {
                  const newP = [...form.partners];
                  newP[idx].phone = e.target.value;
                  setForm(p => ({ ...p, partners: newP }));
                }} />
                <input placeholder="Partner Email" value={partner.email} onChange={(e) => {
                  const newP = [...form.partners];
                  newP[idx].email = e.target.value;
                  setForm(p => ({ ...p, partners: newP }));
                }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input placeholder="Handicap" type="number" style={{ flex: 1 }} value={partner.handicap} onChange={(e) => {
                    const newP = [...form.partners];
                    newP[idx].handicap = e.target.value;
                    setForm(p => ({ ...p, partners: newP }));
                  }} />
                  <button className="btn danger small" type="button" onClick={() => setForm(p => ({ ...p, partners: p.partners.filter((_, i) => i !== idx) }))}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <label className="span2">
            Note
            <textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
          </label>

          <label>
            Status
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="waitlist">waitlist</option>
              <option value="rejected">rejected</option>
              <option value="blocked">blocked</option>
            </select>
          </label>

          <label className="regChk" style={{ alignItems: "center", marginTop: 24 }}>
            <input
              type="checkbox"
              checked={form.paid}
              onChange={(e) => setForm((p) => ({ ...p, paid: e.target.checked }))}
            />
            Mark as Paid
          </label>
        </div>

        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Note: Manual registrations are now saved to the database and linked to the tournament.
        </div>
      </Modal>
    </div>
  );
}
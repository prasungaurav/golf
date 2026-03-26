// frontend/src/pages/organiser/Settings.jsx
import React, { useMemo, useState } from "react";

/**
 * ✅ UI-ONLY Tournament Settings (Organiser)
 * Later backend:
 * - PATCH /api/organiser/tournaments/:id
 * - POST  /api/organiser/tournaments/:id/publish
 * - POST  /api/organiser/tournaments/:id/archive
 * - DELETE /api/organiser/tournaments/:id
 */

function fmtDateInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function Pill({ kind = "muted", children }) {
  return <span className={`pill pill-${kind}`}>{children}</span>;
}

function Section({ title, sub, children, right }) {
  return (
    <div className="setSection">
      <div className="setHead">
        <div>
          <div className="setTitle">{title}</div>
          {sub ? <div className="muted" style={{ marginTop: 4 }}>{sub}</div> : null}
        </div>
        {right ? <div className="setHeadRight">{right}</div> : null}
      </div>
      <div className="setBody">{children}</div>
    </div>
  );
}

export default function Settings({ tournament, onUpdate }) {
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // ✅ UI state (clone from tournament for editing)
  const [form, setForm] = useState(() => ({
    title: tournament?.title || "",
    description: tournament?.description || "",
    course: tournament?.course || "",
    city: tournament?.city || "",
    bannerUrl: tournament?.bannerUrl || "",
    startDate: fmtDateInput(tournament?.startDate),
    endDate: fmtDateInput(tournament?.endDate),
    visibility: tournament?.visibility || "public",
    format: tournament?.format || "Stroke Play",
    rounds: tournament?.rounds ?? 1,

    // registration settings
    regClosesAt: tournament?.registration?.regClosesAt || "",
    fee: tournament?.registration?.fee ?? 0,
    currency: tournament?.registration?.currency || "₹",
    maxPlayers: tournament?.registration?.maxPlayers ?? 0,
    waitlistEnabled: !!tournament?.registration?.waitlistEnabled,
    handicapMin: tournament?.registration?.handicapMin ?? 0,
    handicapMax: tournament?.registration?.handicapMax ?? 54,
    teamAllowed: !!tournament?.registration?.teamAllowed,
    policyText: tournament?.registration?.policyText || "",
  }));

  // ✅ UI-only status toggles
  const [dirty, setDirty] = useState(false);

  const canPublish = useMemo(() => {
    return !!form.title && !!form.course && !!form.startDate && !!form.endDate && !!form.regClosesAt;
  }, [form]);

  const onChange = (patch) => {
    setDirty(true);
    setForm((p) => ({ ...p, ...patch }));
  };

  const updateBackend = async (payload, successMsg) => {
    if (!tournament?._id) return alert("No tournament ID");
    try {
      const res = await fetch(`${apiBase}/api/tournaments/me/${tournament._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data?.ok) {
        alert(successMsg);
        setDirty(false);
        if (onUpdate) onUpdate();
      } else {
        alert("Failed: " + data?.message);
      }
    } catch (err) {
      alert("Network error");
    }
  };

  const save = () => {
    const payload = {
      ...form,
      registration: {
        fee: form.fee,
        currency: form.currency,
        maxPlayers: form.maxPlayers,
        waitlistEnabled: form.waitlistEnabled,
        handicapMin: form.handicapMin,
        handicapMax: form.handicapMax,
        teamAllowed: form.teamAllowed,
        regClosesAt: form.regClosesAt,
        policyText: form.policyText,
      }
    };
    updateBackend(payload, "Saved successfully ✅");
  };


  const deleteTournament = async () => {
    const ok = window.confirm("DELETE tournament permanently? This cannot be undone.");
    if (!ok) return;
    
    try {
      const res = await fetch(`${apiBase}/api/tournaments/me/${tournament._id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();
      if (data?.ok) {
        alert("Deleted successfully ✅");
        if (onUpdate) onUpdate();
        // window.location.reload(); // Removed in favor of onUpdate
      } else {
        alert("Failed to delete: " + data?.message);
      }
    } catch (err) {
      alert("Network error");
    }
  };

  return (
    <div className="orgCard">
      <div className="cardHeadRow" style={{ padding: 0, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Settings</h3>
          <div className="muted" style={{ marginTop: 4 }}>
            {tournament?.title || "Tournament"} • {dirty ? <Pill kind="warn">Unsaved</Pill> : <Pill kind="ok">Saved</Pill>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn ghost" type="button" onClick={() => alert("Preview page (later)")}>
            Preview Public Page
          </button>
          <button className="btn primary" type="button" onClick={save} disabled={!dirty}>
            Save Changes
          </button>
        </div>
      </div>

      <div className="setGrid">
        {/* LEFT column */}
        <div className="setCol">
          <Section
            title="Basic Details"
            sub="Title, dates, course, and public visibility."
            right={<Pill kind={form.visibility === "public" ? "ok" : "muted"}>{form.visibility}</Pill>}
          >
            <div className="formGrid">
              <label className="span2">
                Title <span className="req">*</span>
                <input value={form.title} onChange={(e) => onChange({ title: e.target.value })} />
              </label>

              <label className="span2">
                Description
                <textarea value={form.description} onChange={(e) => onChange({ description: e.target.value })} />
              </label>

              <label>
                Start Date <span className="req">*</span>
                <input type="date" value={form.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
              </label>

              <label>
                End Date <span className="req">*</span>
                <input type="date" value={form.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
              </label>

              <label>
                Course <span className="req">*</span>
                <input value={form.course} onChange={(e) => onChange({ course: e.target.value })} />
              </label>

              <label>
                City
                <input value={form.city} onChange={(e) => onChange({ city: e.target.value })} />
              </label>

              <label className="span2">
                Banner URL
                <input value={form.bannerUrl} onChange={(e) => onChange({ bannerUrl: e.target.value })} />
              </label>

              <label>
                Visibility
                <select value={form.visibility} onChange={(e) => onChange({ visibility: e.target.value })}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>

              <label>
                Format
                <select value={form.format} onChange={(e) => onChange({ format: e.target.value })}>
                  <option value="Stroke Play">Stroke Play</option>
                  <option value="Match Play">Match Play</option>
                  <option value="Team Play">Team Play</option>
                </select>
              </label>

              <label>
                Rounds
                <input type="number" value={form.rounds} onChange={(e) => onChange({ rounds: e.target.value })} />
              </label>
            </div>
          </Section>

          <Section title="Registration Rules" sub="Who can register and until when.">
            <div className="formGrid">
              <label className="span2">
                Registration closes at <span className="req">*</span>
                <input
                  type="datetime-local"
                  value={form.regClosesAt}
                  onChange={(e) => onChange({ regClosesAt: e.target.value })}
                />
              </label>

              <label>
                Fee
                <input type="number" value={form.fee} onChange={(e) => onChange({ fee: e.target.value })} />
              </label>

              <label>
                Currency
                <input value={form.currency} onChange={(e) => onChange({ currency: e.target.value })} />
              </label>

              <label>
                Max Players (0 = unlimited)
                <input type="number" value={form.maxPlayers} onChange={(e) => onChange({ maxPlayers: e.target.value })} />
              </label>

              <label>
                Handicap Min
                <input type="number" value={form.handicapMin} onChange={(e) => onChange({ handicapMin: e.target.value })} />
              </label>

              <label>
                Handicap Max
                <input type="number" value={form.handicapMax} onChange={(e) => onChange({ handicapMax: e.target.value })} />
              </label>

              <label>
                Waitlist Enabled
                <select value={form.waitlistEnabled ? "yes" : "no"} onChange={(e) => onChange({ waitlistEnabled: e.target.value === "yes" })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>

              <label>
                Team Allowed
                <select value={form.teamAllowed ? "yes" : "no"} onChange={(e) => onChange({ teamAllowed: e.target.value === "yes" })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>

              <label className="span2">
                Policy Text
                <textarea value={form.policyText} onChange={(e) => onChange({ policyText: e.target.value })} />
              </label>
            </div>
          </Section>
        </div>

        {/* RIGHT column */}
        <div className="setCol">

          <Section title="Security & Access" sub="Private tournaments require invitation / code (later backend).">
            <div className="setMiniGrid">
              <div className="setMiniCard">
                <div className="setMiniK">Invite Code</div>
                <div className="setMiniV">AUTO-GENERATE (later)</div>
                <button className="miniBtn" type="button" onClick={() => alert("Copy code (later)")}>
                  Copy
                </button>
              </div>

              <div className="setMiniCard">
                <div className="setMiniK">Edit Access</div>
                <div className="setMiniV">Organiser Only</div>
                <button className="miniBtn" type="button" onClick={() => alert("Add co-organiser (later)")}>
                  Add Co-Organiser
                </button>
              </div>
            </div>
          </Section>

          <Section title="Danger Zone" sub="Be careful. These actions are destructive.">
            <div className="setDanger">
              <button className="btn ghost" type="button" onClick={() => alert("Tournament cancellation coming soon...")}>
                Cancel Tournament
              </button>
              <button className="btn ghost" type="button" onClick={deleteTournament}>
                Delete Tournament
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

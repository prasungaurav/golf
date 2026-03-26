// frontend/src/pages/organiser/UpdatesLogs.jsx
import React, { useEffect, useMemo, useState } from "react";
import { openMatchPiP } from "../../MatchPip";

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

function Pill({ children, kind = "default" }) {
  return <span className={`pill pill-${kind}`}>{children}</span>;
}

function Card({ children }) {
  return <div className="ulogCard">{children}</div>;
}

/**
 * ✅ Same component works in:
 * - normal page (mode="page") => shows Open/Close Preview button
 * - PiP preview window (mode="pip") => NO close/cross button (as you wanted)
 */
export default function UpdatesLogs({
  tournament,
  mode = "page", // "page" | "pip"
  showPreviewButton = true,
  initialUpdates,
  initialLogs,
}) {
  const [pipHandle, setPipHandle] = useState(null);
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Dummy state
  const [updates, setUpdates] = useState(initialUpdates?.length ? initialUpdates : []);
  const [logs, setLogs] = useState(initialLogs?.length ? initialLogs : []);

  useEffect(() => {
    if (!tournament?._id || mode === "pip") return;
    fetch(`${apiBase}/api/tournaments/me/${tournament._id}/updates-logs`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data?.ok) {
          setUpdates(data.updates || []);
          setLogs(data.logs || []);
        }
      })
      .catch(console.error);
  }, [tournament?._id, mode, apiBase]);

  // Tabs inside right panel
  const [tab, setTab] = useState("updates"); // updates | logs

  // Composer
  const [form, setForm] = useState({
    type: "Announcement",
    title: "",
    message: "",
    pinned: false,
  });

  const pinned = useMemo(() => updates.filter((u) => u.pinned), [updates]);
  const normal = useMemo(() => updates.filter((u) => !u.pinned), [updates]);

  const publish = async () => {
    if (!form.message.trim() || !tournament?._id) return;
    
    try {
      const res = await fetch(`${apiBase}/api/tournaments/me/${tournament._id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data?.ok && data.update) {
        setUpdates(p => [data.update, ...p]);
        setForm({ type: "Announcement", title: "", message: "", pinned: false });
        // Also add a log
        const metaStr = `${form.type} • ${form.title || form.type}`;
        fetch(`${apiBase}/api/tournaments/me/${tournament._id}/logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "Update published", meta: metaStr })
        }).then(r => r.json()).then(ld => {
          if (ld?.ok && ld.log) setLogs(p => [ld.log, ...p]);
        });
        setTab("updates");
      } else {
        alert("Failed to publish update");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  const togglePin = (id) => {
    setUpdates((p) =>
      p.map((u) => (String(u._id) === String(id) ? { ...u, pinned: !u.pinned } : u))
    );
  };

  const removeUpdate = (id) => {
    setUpdates((p) => p.filter((u) => String(u._id) !== String(id)));
  };

  const openPreview = async () => {
    try {
      const h = await openMatchPiP(
        UpdatesLogs, // ✅ SAME component in PiP
        {
          tournament,
          mode: "pip",
          showPreviewButton: false, // ✅ no preview button inside preview
          initialUpdates: updates,
          initialLogs: logs,
        },
        { width: 920, height: 640 }
      );

      h?.pipWin?.addEventListener?.("pagehide", () => setPipHandle(null));
      h?.pipWin?.addEventListener?.("unload", () => setPipHandle(null));

      setPipHandle(h);
    } catch (e) {
      alert(e.message || "Preview failed (Use Chrome/Edge)");
    }
  };

  const closePreview = () => {
    pipHandle?.close?.();
    setPipHandle(null);
  };

  return (
    <div className="orgCard">
      {/* Top Bar */}
      <div className="cardHeadRow ulogTop" style={{ padding: 0, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Updates & Logs</h3>
          <div className="muted" style={{ marginTop: 4 }}>
            {tournament?.title || "Demo Tournament"} • {tournament?.course || "Demo Course"} •{" "}
            <Pill kind="info">{updates.length} updates</Pill> <Pill kind="muted">{logs.length} logs</Pill>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* ✅ No button in PiP mode (as per your preference) */}
          {mode !== "pip" && showPreviewButton && (
            <>
              {!pipHandle ? (
                <button className="btn ghost" type="button" onClick={openPreview}>
                  Open Preview
                </button>
              ) : (
                <button className="btn ghost" type="button" onClick={closePreview}>
                  Close Preview
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="ulogTabs">
        <button className={`tabBtn ${tab === "updates" ? "active" : ""}`} type="button" onClick={() => setTab("updates")}>
          Updates
        </button>
        <button className={`tabBtn ${tab === "logs" ? "active" : ""}`} type="button" onClick={() => setTab("logs")}>
          Logs
        </button>
      </div>

      {/* Content */}
      <div className="ulogGrid">
        {/* Left: Composer + Feed */}
        <div className="ulogLeft">
          {/* Composer (hide in PiP? you can keep or hide. Here we keep it) */}
          <Card>
            <div className="ulogHead">
              <div className="ulogTitle">Quick Publish</div>
              <div className="muted">Send announcement during live game</div>
            </div>

            <div className="ulogForm">
              <label>
                Type
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  <option>Announcement</option>
                  <option>Weather</option>
                  <option>Rule</option>
                  <option>Tee Time Change</option>
                  <option>Emergency</option>
                </select>
              </label>

              <label>
                Title (optional)
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Short title…" />
              </label>

              <label className="span2">
                Message
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Write update…"
                />
              </label>

              <label className="chk">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm((p) => ({ ...p, pinned: e.target.checked }))}
                />
                Pin on top
              </label>

              <div className="span2 ulogActions">
                <button className="btn primary" type="button" onClick={publish} disabled={!form.message.trim()}>
                  Publish
                </button>
                <button className="btn ghost" type="button" onClick={() => setForm({ type: "Announcement", title: "", message: "", pinned: false })}>
                  Clear
                </button>
              </div>
            </div>
          </Card>

          {/* Feed */}
          <Card>
            <div className="ulogHead">
              <div className="ulogTitle">Live Feed</div>
              <div className="muted">Pinned first • newest on top</div>
            </div>

            <div className="ulogFeed">
              {pinned.map((u) => (
                <div key={u._id} className="ulogItem pinned">
                  <div className="ulogItemTop">
                    <div className="ulogItemL">
                      <Pill kind="pin">Pinned</Pill>
                      <Pill kind="info">{u.type}</Pill>
                      <span className="ulogItemTitle">{u.title}</span>
                    </div>
                    <div className="ulogItemR">
                      <span className="muted">{fmtTime(u.createdAt)}</span>
                    </div>
                  </div>

                  <div className="ulogMsg">{u.message}</div>

                  {mode !== "pip" && (
                    <div className="ulogItemBtns">
                      <button className="miniBtn" type="button" onClick={() => togglePin(u._id)}>
                        Unpin
                      </button>
                      <button className="miniBtn danger" type="button" onClick={() => removeUpdate(u._id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {normal.map((u) => (
                <div key={u._id} className="ulogItem">
                  <div className="ulogItemTop">
                    <div className="ulogItemL">
                      <Pill kind="info">{u.type}</Pill>
                      <span className="ulogItemTitle">{u.title}</span>
                    </div>
                    <div className="ulogItemR">
                      <span className="muted">{fmtTime(u.createdAt)}</span>
                    </div>
                  </div>

                  <div className="ulogMsg">{u.message}</div>

                  {mode !== "pip" && (
                    <div className="ulogItemBtns">
                      <button className="miniBtn" type="button" onClick={() => togglePin(u._id)}>
                        Pin
                      </button>
                      <button className="miniBtn danger" type="button" onClick={() => removeUpdate(u._id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {updates.length === 0 && <div className="empty">No updates yet.</div>}
            </div>
          </Card>
        </div>

        {/* Right: Logs panel */}
        <div className="ulogRight">
          <Card>
            <div className="ulogHead">
              <div className="ulogTitle">Activity Logs</div>
              <div className="muted">System actions & organiser actions</div>
            </div>

            {tab !== "logs" ? (
              <div className="muted" style={{ padding: 12, lineHeight: 1.7 }}>
                Switch to <b>Logs</b> tab to see tournament activity.
              </div>
            ) : (
              <div className="ulogLogs">
                {logs.map((l) => (
                  <div key={l._id} className="ulogLogRow">
                    <div className="ulogLogAt">{fmtTime(l.at)}</div>
                    <div className="ulogLogBody">
                      <div className="ulogLogAction">{l.action}</div>
                      <div className="muted">{l.meta}</div>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && <div className="empty">No logs yet.</div>}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

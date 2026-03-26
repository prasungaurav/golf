// src/organizer/component/OrganiserCheckIn.jsx
// Uses @zxing/browser — zero injected UI, full control over video element
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "../style/OrganiserChekIn.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export default function OrganiserCheckIn() {
  const { tid } = useParams();

  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const busyRef = useRef(false);

  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("Initializing camera...");
  const [camInfo, setCamInfo] = useState("");
  const [playerInfo, setPlayerInfo] = useState(null);

  useEffect(() => {
    let alive = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    (async () => {
      try {
        setMsg("Finding cameras...");

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!alive) return;

        if (!devices || devices.length === 0) {
          setMsg("No camera found");
          setStatus("error");
          return;
        }

        // Prefer back/rear camera
        const back =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ||
          devices[devices.length - 1];

        setCamInfo(back.label || back.deviceId);
        setMsg("Point camera at QR code");
        setStatus("scanning");

        await reader.decodeFromVideoDevice(
          back.deviceId,
          videoRef.current,
          async (result, err) => {
            if (!alive || !result) return;
            if (busyRef.current) return;

            busyRef.current = true;
            setMsg("Verifying...");
            setStatus("idle");
            setPlayerInfo(null);

            try {
              const res = await api(`/api/tournaments/me/${tid}/checkin`, {
                method: "POST",
                body: JSON.stringify({ qrPayload: result.getText() }),
              });

              if (res?.player) setPlayerInfo(res.player);

              if (res.alreadyCheckedIn) {
                setMsg("Already checked-in");
                setStatus("warning");
              } else {
                setMsg("Check-in Successful!");
                setStatus("success");
              }
            } catch (e) {
              setMsg(e.message || "Check-in failed");
              setStatus("error");
            } finally {
              setTimeout(() => {
                if (!alive) return;
                busyRef.current = false;
                setMsg("Point camera at QR code");
                setStatus("scanning");
              }, 2500);
            }
          }
        );
      } catch (e) {
        if (!alive) return;
        console.error("QR START ERROR:", e);
        setMsg(`Camera error: ${e?.message || "Permission / device issue"}`);
        setStatus("error");
      }
    })();

    return () => {
      alive = false;
      try { readerRef.current?.reset(); } catch {}
    };
  }, [tid]);

  const playerName     = playerInfo?.playerName || "—";
  const playerEmail    = playerInfo?.email || "—";
  const playerAge      = playerInfo?.age ?? "—";
  const playerPhone    = playerInfo?.phone || "—";
  const playerCity     = playerInfo?.city || "—";
  const playerHandicap = playerInfo?.handicap ?? "—";

  const statusIcons = { idle: "⏳", scanning: "📷", success: "✅", warning: "⚠️", error: "❌" };

  return (
    <div className="scanPage">
      {/* Header */}
      <div className="scanHeader">
        <div>
          <h2 className="scanTitle">Check-in Scanner</h2>
          <div className="scanSub muted">Allow camera access · Works on HTTPS or localhost</div>
        </div>
        <div className={`scanStatusPill scanStatusPill--${status}`}>
          {statusIcons[status]} {msg}
        </div>
      </div>

      <div className="scanGrid">
        {/* LEFT: Scanner */}
        <div className="scanLeft">
          <div className="scanCard">
            <div className="scanCardHead">
              <div className="scanCardTitle">QR Scanner</div>
              {camInfo && <div className="scanCamInfo muted">📷 {camInfo}</div>}
            </div>

            {/* Premium scanner frame — pure video element */}
            <div className="scanFrame">
              <video
                ref={videoRef}
                className="scanVideo"
                muted
                playsInline
                autoPlay
              />

              {/* Corner brackets */}
              <div className="scanCorners" aria-hidden="true">
                <span className="scanCorner tl" />
                <span className="scanCorner tr" />
                <span className="scanCorner bl" />
                <span className="scanCorner br" />
              </div>

              {/* Animated laser sweep */}
              {status === "scanning" && <div className="scanLaser" />}

              {/* Flash on result */}
              {(status === "success" || status === "warning" || status === "error") && (
                <div className={`scanFlash scanFlash--${status}`} />
              )}
            </div>

            <div className="scanTip muted">Tip: use back camera with good lighting</div>
          </div>
        </div>

        {/* RIGHT: Details */}
        <div className="scanRight">
          <div className="detailCard">
            <div className="detailHead">
              <div className="detailTitle">Player Details</div>
              <div className="detailSub muted">Appears after a successful scan</div>
            </div>

            {!playerInfo ? (
              <div className="detailEmpty">
                <div className="detailEmptyIcon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div className="detailEmptyText muted">No player scanned yet</div>
              </div>
            ) : (
              <div className="detailGrid">
                {[
                  ["Name", playerName],
                  ["Email", playerEmail],
                  ["Age", playerAge],
                  ["Phone", playerPhone],
                  ["City", playerCity],
                  ["Handicap", playerHandicap],
                ].map(([key, val]) => (
                  <div className="detailRow" key={key}>
                    <div className="detailKey">{key}</div>
                    <div className="detailVal">{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="detailNote muted">
            🔒 QR payload contains a secret token. Do not accept screenshots.
          </div>
        </div>
      </div>
    </div>
  );
}
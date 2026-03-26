import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "../style/PlayerEntryPass.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.log("API ERROR:", { path, status: res.status, data });
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

function fmtDMY(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function isObjectId(id) {
  return /^[a-f\d]{24}$/i.test(String(id || "").trim());
}

export default function PlayerEntryPass() {
  const { tid: rawTid } = useParams();
  const tid = String(rawTid || "").trim();

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const cardRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);

        if (!tid) throw new Error("Tournament id missing in URL");
        if (!isObjectId(tid)) throw new Error(`Invalid tournament id: ${tid}`);

        const d = await api(`/api/tournaments/players/me/${encodeURIComponent(tid)}/entry-pass`);
        setData(d);
      } catch (e) {
        setErr(e.message || "Failed to load entry pass");
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [tid]);

  const downloadPDF = async () => {
    const el = cardRef.current;
    if (!el) return;

    // render card into canvas
    const canvas = await html2canvas(el, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");

    // A4 portrait
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // keep margins + center
    const margin = 12;
    const maxW = pageW - margin * 2;

    const imgProps = pdf.getImageProperties(imgData);
    const imgW = maxW;
    const imgH = (imgProps.height * imgW) / imgProps.width;

    const x = (pageW - imgW) / 2;
    const y = Math.max(margin, (pageH - imgH) / 2);

    pdf.addImage(imgData, "PNG", x, y, imgW, imgH);
    pdf.save("entry-pass.pdf");
  };

  if (loading) return <div className="card" style={{ marginTop: 12 }}>Loading...</div>;
  if (err) return <div className="orgError">⚠ {err}</div>;
  if (!data) return null;

  const t = data.tournament || {};
  const e = data.entry || {};

  return (
    <div className="entryPassPage">
      {/* ✅ Button width SAME as card */}
      <div className="entryPassWrap">
        <div className="entryPassTopBar">
          <h2 className="entryPassPageTitle">Entry Pass</h2>
          <button className="entryPassBtn" onClick={downloadPDF}>
            Download Entry Pass
          </button>
        </div>

        {/* ✅ Portrait Card */}
        <div ref={cardRef} className="entryPassCardPortrait">
          <div className="entryPassHeader">
            <div className="entryPassHeaderTitle">{t.title || "Tournament"}</div>
            <div className="entryPassHeaderSub">
              {t.course || "—"} • {t.city || "—"}
            </div>
            <div className="entryPassHeaderDate">
              {fmtDMY(t.startDate)} – {fmtDMY(t.endDate)}
            </div>
          </div>

          <div className="entryPassBody">
            <div className="entryPassQRBox">
              <QRCodeCanvas value={e.qrPayload || ""} size={160} />
              <div className="entryPassQRHint">Scan at venue</div>
            </div>

            <div className="entryPassCodeBox">
              <div className="entryPassLabel">Entry Code</div>
              <div className="entryPassCode">{e.code || "—"}</div>

              <div className="entryPassMetaLine">
                <span className="entryPassMetaKey">Issued:</span> {fmtDMY(e.issuedAt)}
              </div>
              <div className="entryPassMetaLine">
                <span className="entryPassMetaKey">Checked-in:</span>{" "}
                {e.checkInAt ? fmtDMY(e.checkInAt) : "Not yet"}
              </div>
            </div>
          </div>

          <div className="entryPassFooter">
            <div className="entryPassWarn">
              Verified by organiser scanner only. Don’t share QR publicly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
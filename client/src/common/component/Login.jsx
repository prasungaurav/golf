import React, { useEffect, useMemo, useState } from "react";
import "../style/Login.css";

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}
function isPhone(v) {
  const s = String(v).replace(/\D/g, "");
  return s.length >= 10 && s.length <= 13;
}

export default function Login({
  open,
  onClose,
  onSuccess,
  apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000",
}) {
  const [tab, setTab] = useState("phone");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setErr("");
  }, [open, tab, phone, otp, email, password]);

  useEffect(() => {
    if (!open) {
      setTab("phone");
      setPhone("");
      setOtp("");
      setOtpSent(false);
      setEmail("");
      setPassword("");
      setErr("");
      setLoading(false);
    }
  }, [open]);

  const canSendOtp = useMemo(() => isPhone(phone) && !loading, [phone, loading]);
  const canVerifyOtp = useMemo(
    () => isPhone(phone) && String(otp).trim().length >= 4 && !loading,
    [phone, otp, loading]
  );
  const canLoginEmail = useMemo(
    () => isEmail(email) && password.length >= 6 && !loading,
    [email, password, loading]
  );

  const sendOtp = async () => {
    setErr("");
    if (!isPhone(phone)) return setErr("Enter valid phone number.");

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/otp-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErr(data?.message || "OTP send failed");
        return;
      }

      setOtpSent(true);
    } catch (e) {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setErr("");

    if (!otpSent) return setErr("Please request OTP first.");
    if (!isPhone(phone)) return setErr("Enter valid phone number.");
    if (String(otp).trim().length < 4) return setErr("Enter valid OTP.");

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/otp-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErr(data?.message || "OTP verify failed");
        return;
      }

      localStorage.setItem("app_mode", "common");
      onSuccess?.(data);
      onClose?.();
    } catch (e) {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (e) => {
    e.preventDefault();
    setErr("");

    if (!isEmail(email)) return setErr("Enter valid email.");
    if (password.length < 6) return setErr("Password must be 6+ characters.");

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/login-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErr(data?.message || "Login failed");
        return;
      }

      localStorage.setItem("app_mode", "common");
      onSuccess?.(data);
      onClose?.();
    } catch (e) {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="lmOverlay" onMouseDown={onClose}>
      <div className="lmModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lmTop">
          <div>
            <h2>Login</h2>
            <p className="muted">Choose method: OTP or Email.</p>
          </div>
          <button className="lmClose" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="lmTabs">
          <button
            className={`lmTab ${tab === "phone" ? "active" : ""}`}
            onClick={() => setTab("phone")}
            type="button"
          >
            Phone + OTP
          </button>
          <button
            className={`lmTab ${tab === "email" ? "active" : ""}`}
            onClick={() => setTab("email")}
            type="button"
          >
            Email + Password
          </button>
          <div className={`lmIndicator ${tab}`} />
        </div>

        <div className="lmBody">
          {err && <div className="lmError">{err}</div>}

          {tab === "phone" && (
            <form onSubmit={verifyOtp} className="lmForm">
              <div className="field">
                <label>Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone"
                />
              </div>

              <div className="otpRow">
                <div className="field" style={{ flex: 1 }}>
                  <label>OTP</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    disabled={!otpSent}
                  />
                </div>

                <button
                  className="otpBtn"
                  type="button"
                  onClick={sendOtp}
                  disabled={!canSendOtp}
                >
                  {otpSent ? "Resend" : "Send OTP"}
                </button>
              </div>

              <button
                className="lmPrimary"
                type="submit"
                disabled={!canVerifyOtp}
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </button>

              <div className="lmHint">OTP comes in server console (demo).</div>
            </form>
          )}

          {tab === "email" && (
            <form onSubmit={loginWithEmail} className="lmForm">
              <div className="field">
                <label>Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>

              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>

              <button
                className="lmPrimary"
                type="submit"
                disabled={!canLoginEmail}
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <button className="lmGhost" type="button">
                Forgot password?
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

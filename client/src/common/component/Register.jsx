import React, { useEffect, useMemo, useState } from "react";
import "../style/Register.css";

const ROLE_OPTIONS = [
  { value: "", label: "Select role" },
  { value: "player", label: "Player" },
  { value: "sponsor", label: "Sponsor" },
  { value: "organiser", label: "Organiser" },
];

const initialState = {
  role: "",

  // player
  playerName: "",
  playerEmail: "",
  playerPhone: "",
  playerPassword: "",
  playerConfirmPassword: "",
  handicap: "no",

  // sponsor
  companyName: "",
  sponsorEmail: "",
  sponsorPhone: "",
  sponsorPassword: "",
  industryCategory: "",
  companyWebsite: "",
  companyAddress: "",

  // organiser
  organiserName: "",
  organiserType: "",
  organiserEmail: "",
  organiserPhone: "",
  organiserAddress: "",
  organiserPassword: "",
  organiserConfirmPassword: "",
};

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}
function isPhone(v) {
  const s = String(v).replace(/\D/g, "");
  return s.length >= 10 && s.length <= 13;
}
function isUrl(v) {
  if (!v) return true;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

export default function Register({
  open,
  onClose,
  onSuccess,
  apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000",
}) {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const role = form.role;

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
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
    setErrors({});
  }, [open, role]);

  useEffect(() => {
    if (!open) {
      setForm(initialState);
      setErrors({});
      setLoading(false);
    }
  }, [open]);

  const requiredFields = useMemo(() => {
    if (role === "player") {
      return [
        "playerName",
        "playerEmail",
        "playerPhone",
        "playerPassword",
        "playerConfirmPassword",
      ];
    }
    if (role === "sponsor") {
      return [
        "companyName",
        "sponsorEmail",
        "sponsorPhone",
        "sponsorPassword",
        "industryCategory",
        "companyWebsite",
        "companyAddress",
      ];
    }
    if (role === "organiser") {
      return [
        "organiserName",
        "organiserType",
        "organiserEmail",
        "organiserPhone",
        "organiserAddress",
        "organiserPassword",
        "organiserConfirmPassword",
      ];
    }
    return [];
  }, [role]);

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!role) e.role = "Please select a role.";

    if (role === "player") {
      if (!form.playerName.trim()) e.playerName = "Name is required.";
      if (!isEmail(form.playerEmail)) e.playerEmail = "Enter a valid email.";
      if (!isPhone(form.playerPhone)) e.playerPhone = "Enter a valid phone.";
      if (!form.playerPassword || form.playerPassword.length < 6)
        e.playerPassword = "Min 6 characters.";
      if (form.playerConfirmPassword !== form.playerPassword)
        e.playerConfirmPassword = "Passwords do not match.";
    }

    if (role === "sponsor") {
      if (!form.companyName.trim()) e.companyName = "Company name is required.";
      if (!isEmail(form.sponsorEmail)) e.sponsorEmail = "Enter a valid email.";
      if (!isPhone(form.sponsorPhone)) e.sponsorPhone = "Enter a valid phone.";
      if (!form.sponsorPassword || form.sponsorPassword.length < 6)
        e.sponsorPassword = "Min 6 characters.";
      if (!form.industryCategory.trim())
        e.industryCategory = "Industry category required.";
      if (!form.companyWebsite.trim()) e.companyWebsite = "Website required.";
      else if (!isUrl(form.companyWebsite))
        e.companyWebsite = "Valid URL required (https://...)";
      if (!form.companyAddress.trim())
        e.companyAddress = "Company address required.";
    }

    if (role === "organiser") {
      if (!form.organiserName.trim())
        e.organiserName = "Organiser name required.";
      if (!form.organiserType) e.organiserType = "Select organiser type.";
      if (!["golf club", "charity", "corporate"].includes(form.organiserType))
        e.organiserType = "Invalid organiser type.";
      if (!isEmail(form.organiserEmail))
        e.organiserEmail = "Enter a valid email.";
      if (!isPhone(form.organiserPhone))
        e.organiserPhone = "Enter a valid phone.";
      if (!form.organiserAddress.trim())
        e.organiserAddress = "Address required.";
      if (!form.organiserPassword || form.organiserPassword.length < 6)
        e.organiserPassword = "Min 6 characters.";
      if (form.organiserConfirmPassword !== form.organiserPassword)
        e.organiserConfirmPassword = "Passwords do not match.";
    }

    requiredFields.forEach((k) => {
      if (!String(form[k] || "").trim()) if (!e[k]) e[k] = "Required.";
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErrors((p) => ({
          ...p,
          form: data?.message || "Register failed",
        }));
        setLoading(false);
        return;
      }

      localStorage.setItem("app_mode", "common");
      onSuccess?.(data);

      setLoading(false);
      onClose?.();
      setForm(initialState);
      setErrors({});
    } catch (e) {
      setLoading(false);
      setErrors((p) => ({ ...p, form: "Network error" }));
    }
  };

  if (!open) return null;

  return (
    <div className="rmOverlay" onMouseDown={onClose}>
      <div className="rmModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="rmTop">
          <div>
            <h2>Create Account</h2>
            <p className="muted">Select role and fill required details.</p>
          </div>

          <button className="rmClose" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rmBody">
          {errors.form && <div className="err">{errors.form}</div>}

          <div className="field">
            <label>Role</label>
            <select
              value={form.role}
              onChange={(e) => setField("role", e.target.value)}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.role && <div className="err">{errors.role}</div>}
          </div>

          {role === "player" && (
            <div className="section">
              <div className="sectionTitle">Player Details</div>
              <div className="grid2">
                <div className="field">
                  <label>Name</label>
                  <input
                    value={form.playerName}
                    onChange={(e) => setField("playerName", e.target.value)}
                  />
                  {errors.playerName && (
                    <div className="err">{errors.playerName}</div>
                  )}
                </div>

                <div className="field">
                  <label>Email</label>
                  <input
                    value={form.playerEmail}
                    onChange={(e) => setField("playerEmail", e.target.value)}
                  />
                  {errors.playerEmail && (
                    <div className="err">{errors.playerEmail}</div>
                  )}
                </div>

                <div className="field">
                  <label>Phone</label>
                  <input
                    value={form.playerPhone}
                    onChange={(e) => setField("playerPhone", e.target.value)}
                  />
                  {errors.playerPhone && (
                    <div className="err">{errors.playerPhone}</div>
                  )}
                </div>

                <div className="field">
                  <label>Handicap</label>
                  <select
                    value={form.handicap}
                    onChange={(e) => setField("handicap", e.target.value)}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={form.playerPassword}
                    onChange={(e) =>
                      setField("playerPassword", e.target.value)
                    }
                  />
                  {errors.playerPassword && (
                    <div className="err">{errors.playerPassword}</div>
                  )}
                </div>

                <div className="field">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={form.playerConfirmPassword}
                    onChange={(e) =>
                      setField("playerConfirmPassword", e.target.value)
                    }
                  />
                  {errors.playerConfirmPassword && (
                    <div className="err">{errors.playerConfirmPassword}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {role === "sponsor" && (
            <div className="section">
              <div className="sectionTitle">Sponsor Details</div>
              <div className="grid2">
                <div className="field">
                  <label>Company Name</label>
                  <input
                    value={form.companyName}
                    onChange={(e) => setField("companyName", e.target.value)}
                  />
                  {errors.companyName && (
                    <div className="err">{errors.companyName}</div>
                  )}
                </div>

                <div className="field">
                  <label>Email</label>
                  <input
                    value={form.sponsorEmail}
                    onChange={(e) => setField("sponsorEmail", e.target.value)}
                  />
                  {errors.sponsorEmail && (
                    <div className="err">{errors.sponsorEmail}</div>
                  )}
                </div>

                <div className="field">
                  <label>Phone</label>
                  <input
                    value={form.sponsorPhone}
                    onChange={(e) => setField("sponsorPhone", e.target.value)}
                  />
                  {errors.sponsorPhone && (
                    <div className="err">{errors.sponsorPhone}</div>
                  )}
                </div>

                <div className="field">
                  <label>Industry Category</label>
                  <input
                    value={form.industryCategory}
                    onChange={(e) =>
                      setField("industryCategory", e.target.value)
                    }
                  />
                  {errors.industryCategory && (
                    <div className="err">{errors.industryCategory}</div>
                  )}
                </div>

                <div className="field">
                  <label>Company Website</label>
                  <input
                    value={form.companyWebsite}
                    onChange={(e) =>
                      setField("companyWebsite", e.target.value)
                    }
                    placeholder="https://company.com"
                  />
                  {errors.companyWebsite && (
                    <div className="err">{errors.companyWebsite}</div>
                  )}
                </div>

                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={form.sponsorPassword}
                    onChange={(e) =>
                      setField("sponsorPassword", e.target.value)
                    }
                  />
                  {errors.sponsorPassword && (
                    <div className="err">{errors.sponsorPassword}</div>
                  )}
                </div>

                <div className="field full">
                  <label>Company Address</label>
                  <input
                    value={form.companyAddress}
                    onChange={(e) =>
                      setField("companyAddress", e.target.value)
                    }
                  />
                  {errors.companyAddress && (
                    <div className="err">{errors.companyAddress}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {role === "organiser" && (
            <div className="section">
              <div className="sectionTitle">Organiser Details</div>
              <div className="grid2">
                <div className="field">
                  <label>Organiser Name</label>
                  <input
                    value={form.organiserName}
                    onChange={(e) =>
                      setField("organiserName", e.target.value)
                    }
                  />
                  {errors.organiserName && (
                    <div className="err">{errors.organiserName}</div>
                  )}
                </div>

                <div className="field">
                  <label>Organiser Type</label>
                  <select
                    value={form.organiserType}
                    onChange={(e) =>
                      setField("organiserType", e.target.value)
                    }
                  >
                    <option value="">Select type</option>
                    <option value="golf club">Golf Club</option>
                    <option value="charity">Charity</option>
                    <option value="corporate">Corporate</option>
                  </select>
                  {errors.organiserType && (
                    <div className="err">{errors.organiserType}</div>
                  )}
                </div>

                <div className="field">
                  <label>Official Email</label>
                  <input
                    value={form.organiserEmail}
                    onChange={(e) =>
                      setField("organiserEmail", e.target.value)
                    }
                  />
                  {errors.organiserEmail && (
                    <div className="err">{errors.organiserEmail}</div>
                  )}
                </div>

                <div className="field">
                  <label>Phone</label>
                  <input
                    value={form.organiserPhone}
                    onChange={(e) =>
                      setField("organiserPhone", e.target.value)
                    }
                  />
                  {errors.organiserPhone && (
                    <div className="err">{errors.organiserPhone}</div>
                  )}
                </div>

                <div className="field full">
                  <label>Address</label>
                  <input
                    value={form.organiserAddress}
                    onChange={(e) =>
                      setField("organiserAddress", e.target.value)
                    }
                  />
                  {errors.organiserAddress && (
                    <div className="err">{errors.organiserAddress}</div>
                  )}
                </div>

                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={form.organiserPassword}
                    onChange={(e) =>
                      setField("organiserPassword", e.target.value)
                    }
                  />
                  {errors.organiserPassword && (
                    <div className="err">{errors.organiserPassword}</div>
                  )}
                </div>

                <div className="field">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={form.organiserConfirmPassword}
                    onChange={(e) =>
                      setField("organiserConfirmPassword", e.target.value)
                    }
                  />
                  {errors.organiserConfirmPassword && (
                    <div className="err">{errors.organiserConfirmPassword}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button className="submitBtn" type="submit" disabled={!form.role || loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

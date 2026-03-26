import React from "react";
import { useAuth } from "./AuthContext";

export default function Blocked() {
  const { logout } = useAuth();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--surface)",
      color: "var(--on_surface)",
      textAlign: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "var(--error_container)",
        color: "var(--on_error_container)",
        padding: "32px",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--error)",
        maxWidth: "400px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "16px", fontWeight: 800 }}>Account Blocked</h1>
        <p style={{ opacity: 0.9, marginBottom: "24px", lineHeight: "1.6" }}>
          Your account has been restricted by the administrator. 
          You no longer have access to the GolfNow platform.
        </p>
        <button 
          className="primaryBtn" 
          onClick={logout}
          style={{ width: "100%", background: "var(--error)", color: "white" }}
        >
          Logout & Exit
        </button>
      </div>
      
      <p style={{ marginTop: "24px", opacity: 0.5, fontSize: "0.85rem" }}>
        If you believe this is a mistake, please contact support.
      </p>
    </div>
  );
}

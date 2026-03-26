import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);

  const navigate = useNavigate();

  // ✅ FETCH SESSION (correct API)
  const fetchSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });

      const data = await res.json();

      if (data?.ok && data?.user) {
        setSession(true);
        setUser(data.user); // 👈 full user (name, email, role)
      } else {
        setSession(false);
        setUser(null);
      }
    } catch (e) {
      console.error("Session fetch error:", e);
      setSession(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ AUTO LOAD ON APP START
  useEffect(() => {
    fetchSession();
  }, []);

  // ✅ CHECK FOR BLOCKED STATUS
  useEffect(() => {
    if (user?.status === "blocked") {
      const path = window.location.pathname;
      if (path !== "/blocked") {
        navigate("/blocked");
      }
    }
  }, [user, navigate]);

  // ✅ LOGIN HANDLER
  const login = (payload) => {
    if (payload?.user) {
      setSession(true);
      setUser(payload.user); // 👈 no fallback fake user
    }

    setOpenLogin(false);
    setOpenRegister(false);
  };

  // ✅ LOGOUT HANDLER
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout error:", e);
    }

    setSession(false);
    setUser(null);

    setOpenLogin(true);
    setOpenRegister(false);

    navigate("/");
  };

  const value = {
    session,
    user,
    userRole: user?.role || null,
    loading,

    openLogin,
    setOpenLogin,
    openRegister,
    setOpenRegister,

    login,
    logout,
    fetchSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

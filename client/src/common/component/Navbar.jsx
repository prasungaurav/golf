// Navbar.jsx
// ✅ No "common / switch mode" button
// ✅ Common links ALWAYS visible
// ✅ If logged in, role-specific links are ADDED in the same header

import React, { useEffect, useMemo, useRef, useState } from "react";
import "../style/Navbar.css";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import { useAuth } from "./AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Navbar() {
  const navigate = useNavigate();

  const {
    user,
    session,
    userRole,
    openLogin,
    setOpenLogin,
    openRegister,
    setOpenRegister,
    login: onLoginSuccess,
    logout,
  } = useAuth();

  const [openBubble, setOpenBubble] = useState(false);
  const bubbleRef = useRef(null);

  // Theme support
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Close dropdown when clicking anywhere outside the avatar wrapper
  useEffect(() => {
    if (!openBubble) return;
    const handleClickOutside = (e) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        setOpenBubble(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openBubble]);

  const onRegisterSuccess = (payload) => {
    onLoginSuccess(payload);
  };

  const navLinks = useMemo(() => {
    return (
      <>
        {/* ✅ Common links always */}
        <li>
          <NavLink to="/" end className="navItem">
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/live" className="navItem">
            Live
          </NavLink>
        </li>
        <li>
          <NavLink to="/tournaments" className="navItem">
            Tournaments
          </NavLink>
        </li>
        <li>
          <NavLink to="/news" className="navItem">
            News
          </NavLink>
        </li>
        <li>
          <NavLink to="/rules" className="navItem">
            Rules
          </NavLink>
        </li>

        {/* ✅ Extra (role-based) links in the SAME header */}
        {session && userRole === "admin" && (
          <>
            <li className="navSep" />
            <li>
              <NavLink to="/admin/profile" className="navItem">
                Admin Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/users" className="navItem">
                Users
              </NavLink>
            </li>
          </>
        )}

        {session && userRole === "player" && (
          <>
            <li className="navSep" />
            <li>
              <NavLink to="/player/register" className="navItem">
                Join Matches
              </NavLink>
            </li>
          </>
        )}

        {session && userRole === "organiser" && (
          <>
            <li className="navSep" />
            <li>
              <NavLink to="/organiser/profile" className="navItem">
                Organiser Dashboard
              </NavLink>
            </li>
          </>
        )}

        {session && userRole === "sponsor" && (
          <>
            <li className="navSep" />
            <li>
              <NavLink to="/sponsor/profile" className="navItem">
                Sponsor Dashboard
              </NavLink>
            </li>
          </>
        )}
      </>
    );
  }, [session, userRole]);

  return (
    <>
      <nav className="navbar">
        <div className="navLeft">
          <Link to="/" className="logo">
            <img src="logo.jpeg" alt="GolfNow Logo" className="logoIcon" />
            <span className="logoText">GolfNow</span>
          </Link>
        </div>

        <ul className="navLinks">{navLinks}</ul>


        <div className="navRight">
          <button
            className="themeToggleBtn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Theme"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>

          {!session ? (
            <>
              <Link
                to="#"
                className="navBtn ghost"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenLogin(true);
                }}
              >
                Login
              </Link>

              <Link
                to="#"
                className="navBtn primary"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenRegister(true);
                }}
              >
                Register
              </Link>
            </>
          ) : (
            <div
              className="navAvatarWrapper"
              ref={bubbleRef}
            >
              <div className="navUserBadge" onClick={() => setOpenBubble(!openBubble)}>
                <div className="navUserInfo">
                  <span className="navUserName">{user?.name || user?.playerName || user?.organiserName || user?.companyName || "User"}</span>
                  <span className="navUserRole">{userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}</span>
                </div>
                <div className="navAvatar">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="navAvatarImg" />
                  ) : (
                    <span className="navAvatarInitial">
                      {(user?.name || user?.playerName || user?.organiserName || user?.companyName || "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {openBubble && (
                <div className="navBubble">
                  {userRole === "player" && (
                    <>
                      <Link to="/player/profile" className="navBubbleItem" onClick={() => setOpenBubble(false)}>My Profile</Link>
                      <Link to="/player/register" className="navBubbleItem" onClick={() => setOpenBubble(false)}>My Tournaments</Link>
                      <div className="navBubbleSep" />
                    </>
                  )}
                  {userRole === "organiser" && (
                    <>
                      <Link to="/organiser/profile" className="navBubbleItem" onClick={() => setOpenBubble(false)}>My Profile</Link>
                      <Link to="/organiser/tournaments" className="navBubbleItem" onClick={() => setOpenBubble(false)}>Manage Tournaments</Link>
                      <div className="navBubbleSep" />
                    </>
                  )}
                  {userRole === "sponsor" && (
                    <>
                      <Link to="/sponsor/profile" className="navBubbleItem" onClick={() => setOpenBubble(false)}>My Profile</Link>
                      <div className="navBubbleSep" />
                    </>
                  )}
                  {userRole === "admin" && (
                    <>
                      <Link to="/admin/profile" className="navBubbleItem" onClick={() => setOpenBubble(false)}>My Profile</Link>
                      <div className="navBubbleSep" />
                    </>
                  )}
                  <button className="navBubbleItem danger" onClick={logout} type="button">
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <Register
        open={openRegister}
        onClose={() => setOpenRegister(false)}
        onSuccess={onRegisterSuccess}
        apiBase={API_BASE}
      />

      <Login
        open={openLogin}
        onClose={() => setOpenLogin(false)}
        onSuccess={onLoginSuccess}
        apiBase={API_BASE}
      />
    </>
  );
}

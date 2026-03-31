import React from "react";
import { NavLink } from "react-router-dom";
import "../style/Admin.css";

// Basic icons using SVG paths
const Icon = ({ name }) => {
  const icons = {
    dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    users: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    config: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.07-.47 0-.59.22L3.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.07.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    tournament: "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 2.82V7h2v1c0 1.3-.84 2.4-2 2.82z",
    news: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5V6h14v12zM8 17h8v-2H8v2zm0-4h8v-2H8v2zm0-4h8V7H8v2z",
    sponsor: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
    pages: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    live: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17 12l-4 4-2-2-4 4V8l9 4z"
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d={icons[name]} />
    </svg>
  );
};

export default function AdminSidebar({ theme, toggleTheme }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-logo">
        <div style={{width: 32, height: 32, borderRadius: 8, background: 'var(--signature-gradient)'}} />
        <span>Golf Admin</span>
      </div>

      <nav className="admin-nav">
        <NavLink to="/admin/profile" className={({isActive}) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
          <Icon name="dashboard" />
          Dashboard
        </NavLink>
        <NavLink to="/admin/users" className={({isActive}) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
          <Icon name="users" />
          User Directory
        </NavLink>
        <NavLink to="/admin/tournaments" className={({isActive}) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
          <Icon name="tournament" />
          Tournaments
        </NavLink>
        <NavLink to="/admin/live" className={({isActive}) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
          <Icon name="live" />
          Live Scores
        </NavLink>
        <NavLink to="/admin/sponsors" className={({isActive}) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
          <Icon name="sponsor" />
          Sponsor Bids
        </NavLink>
        <NavLink to="/admin/dashboard" className={({isActive}) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
          <Icon name="config" />
          Site Config
        </NavLink>
        <NavLink to="/admin/news" className={({isActive}) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
          <Icon name="news" />
          News & Media
        </NavLink>
        <NavLink to="/admin/pages" className={({isActive}) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
          <Icon name="pages" />
          CMS Pages
        </NavLink>
      </nav>

      <div style={{marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--admin-border)'}}>
         <button 
           className="admin-nav-item" 
           onClick={toggleTheme}
           style={{width: '100%', background: 'none', cursor: 'pointer', marginBottom: 8}}
         >
            {theme === "dark" ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                <span>Dark Mode</span>
              </>
            )}
         </button>
         <NavLink to="/" className="admin-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Exit Terminal
         </NavLink>
      </div>
    </aside>
  );
}

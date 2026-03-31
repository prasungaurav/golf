import React, { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import "../style/Admin.css";

export default function AdminLayout({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem("admin-theme") || "dark");

  useEffect(() => {
    localStorage.setItem("admin-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className={`admin-body ${theme === "light" ? "light-mode" : ""}`}>
      <div className={`admin-layout ${theme === "light" ? "light-mode" : ""}`}>
        <AdminSidebar theme={theme} toggleTheme={toggleTheme} />
        <main className="admin-main">
          <div className="fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

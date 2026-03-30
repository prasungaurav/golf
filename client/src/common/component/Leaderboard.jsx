import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../style/Dashboard.css"; // Reuse card and list styles

export default function Leaderboard() {
  const navigate = useNavigate();
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetch(`${apiBase}/api/matches/rankings/all`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setRankings(data.rankings);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [apiBase]);

  const totalPages = Math.ceil(rankings.length / itemsPerPage);
  const currentRankings = rankings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="dash" style={{ padding: "40px 20px" }}>
      <div className="sectionHead" style={{ maxWidth: "1000px", margin: "0 auto 30px" }}>
        <div>
          <h2>Global Leaderboard</h2>
          <p className="sectionSub">Showing ranks {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, rankings.length)} of {rankings.length}</p>
        </div>
        <button className="primaryBtn outline" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="card" style={{ maxWidth: "1000px", margin: "0 auto", minHeight: "auto", paddingBottom: "30px" }}>
        <div className="dmTable">
          <div className="dmTableHead" style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 80px 100px", padding: "15px", fontWeight: "800", opacity: "0.8" }}>
            <span>Rank</span>
            <span>Player Name</span>
            <span>Wins</span>
            <span>Losses</span>
            <span>Draws</span>
            <span>Points</span>
          </div>
          
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>Loading rankings...</div>
          ) : currentRankings.length > 0 ? (
            currentRankings.map((p, idx) => {
              const globalIdx = (currentPage - 1) * itemsPerPage + idx;
              return (
                <div key={p._id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 80px 100px", padding: "15px", borderBottom: "1px solid var(--outline_variant)", alignItems: "center" }}>
                  <span style={{ fontWeight: "800", color: "var(--primary)" }}>#{globalIdx + 1}</span>
                  <span style={{ fontWeight: "600" }}>
                    <Link to={`/profile/${p._id || p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {p.playerName || p.name || "Unknown Player"}
                    </Link>
                  </span>
                  <span>{p.wins || 0}</span>
                  <span>{p.losses || 0}</span>
                  <span>{p.draws || 0}</span>
                  <span style={{ fontWeight: "800", color: "var(--primary_container)" }}>{p.points} pts</span>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "40px", textAlign: "center" }}>No players ranked yet.</div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "30px" }}>
            <button 
              className="smallBtn" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentPage(i + 1)}
                  style={{ 
                    padding: "5px 12px", 
                    borderRadius: "4px", 
                    background: currentPage === i + 1 ? "var(--primary)" : "var(--surface_container_highest)",
                    color: currentPage === i + 1 ? "var(--on_primary)" : "var(--on_surface)",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              className="smallBtn" 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

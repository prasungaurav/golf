import React, { useMemo, useState, useEffect } from "react";
import "../style/Admin.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const emptySlide = () => ({ title: "", subtitle: "", cta: "", image: "" });
const emptyLeader = () => ({ name: "", score: "" });
const emptyNews = () => ({ img: "", title: "", meta: "" });
const emptyUpcoming = () => ({ t: "10:00 AM", name: "New Match Heat" });

export default function DashboardManage() {
  const [heroSlides, setHeroSlides] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [rulesSummary, setRulesSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/dashboard`, { credentials: "include" });
      const json = await res.json();
      if (json.ok && json.data) {
        const d = json.data;
        setHeroSlides(d.heroSlides || []);
        setLeaderboard(d.leaderboard || []);
        setUpcomingMatches(d.upcomingMatches || []);
        setNewsItems(d.media?.newsItems || []);
        setPhotos(d.media?.photos || []);
        setVideos(d.media?.videos || []);
        setRulesSummary(d.rulesSummary || []);
      }
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const saveToDb = async () => {
    try {
      const payload = {
        heroSlides,
        leaderboard,
        upcomingMatches,
        media: { newsItems, photos, videos },
        rulesSummary
      };
      const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) alert("Global configuration updated successfully.");
      else alert("Save failed: " + data.message);
    } catch (err) {
      alert("Error synchronizing with core.");
    }
  };

  if (loading) return <div className="admin-title"><h1>Accessing Site Matrix...</h1></div>;

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div className="admin-title">
          <h1>Site Configuration</h1>
          <p>Global CMS for homepage, hero sections, and public media</p>
        </div>
        <div className="admin-actions">
          <button className="admin-btn" onClick={saveToDb}>Commit Changes</button>
        </div>
      </header>

      {/* HERO SLIDES */}
      <section className="admin-card" style={{marginBottom: 24}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
          <h3>Hero Slides</h3>
          <button className="admin-btn-outline" style={{padding: '5px 12px', fontSize: '0.75rem'}} onClick={() => setHeroSlides([...heroSlides, emptySlide()])}>+ Add Slide</button>
        </div>
        <div className="admin-grid-2">
          {heroSlides.map((s, idx) => (
            <div key={idx} className="stat-item" style={{display: 'block', padding: 16}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                 <span className="status-badge active">Slide #{idx + 1}</span>
                 <button className="status-badge blocked" style={{border: 'none', cursor: 'pointer'}} onClick={() => setHeroSlides(heroSlides.filter((_, i) => i !== idx))}>DELETE</button>
              </div>
              <input className="admin-input" style={{marginBottom: 10}} placeholder="Title" value={s.title} onChange={e => {
                const copy = [...heroSlides]; copy[idx].title = e.target.value; setHeroSlides(copy);
              }} />
              <input className="admin-input" style={{marginBottom: 10}} placeholder="Subtitle" value={s.subtitle} onChange={e => {
                const copy = [...heroSlides]; copy[idx].subtitle = e.target.value; setHeroSlides(copy);
              }} />
              <input className="admin-input" placeholder="Image URL" value={s.image} onChange={e => {
                const copy = [...heroSlides]; copy[idx].image = e.target.value; setHeroSlides(copy);
              }} />
            </div>
          ))}
        </div>
      </section>

      <div className="admin-grid-2">
        {/* LEADERBOARD OVERRIDE */}
        <section className="admin-card">
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
            <h3>Leaderboard (Manual)</h3>
            <button className="admin-btn-outline" style={{padding: '5px 12px', fontSize: '0.75rem'}} onClick={() => setLeaderboard([...leaderboard, emptyLeader()])}>+ Add</button>
          </div>
          <div className="admin-table-wrap" style={{marginTop: 0}}>
             <table className="admin-table">
               <thead><tr><th>Rank</th><th>Name</th><th>Score</th><th></th></tr></thead>
               <tbody>
                 {leaderboard.map((l, idx) => (
                   <tr key={idx}>
                     <td>{idx + 1}</td>
                     <td><input className="admin-input" style={{padding: '4px 8px'}} value={l.name} onChange={e => {
                       const c = [...leaderboard]; c[idx].name = e.target.value; setLeaderboard(c);
                     }}/></td>
                     <td><input className="admin-input" style={{padding: '4px 8px'}} value={l.score} onChange={e => {
                       const c = [...leaderboard]; c[idx].score = e.target.value; setLeaderboard(c);
                     }}/></td>
                     <td><button style={{background: 'none', border: 'none', color: 'var(--admin-error)', cursor: 'pointer'}} onClick={() => setLeaderboard(leaderboard.filter((_, i) => i !== idx))}>×</button></td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </section>

        {/* UPCOMING MATCHES */}
        <section className="admin-card">
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
            <h3>Upcoming Queue</h3>
            <button className="admin-btn-outline" style={{padding: '5px 12px', fontSize: '0.75rem'}} onClick={() => setUpcomingMatches([...upcomingMatches, emptyUpcoming()])}>+ Add</button>
          </div>
          <div style={{display: 'grid', gap: 8}}>
            {upcomingMatches.map((x, idx) => (
              <div key={idx} style={{display: 'flex', gap: 8}}>
                <input className="admin-input" style={{width: '100px'}} value={x.t} onChange={e => {
                   const c = [...upcomingMatches]; c[idx].t = e.target.value; setUpcomingMatches(c);
                }} />
                <input className="admin-input" value={x.name} onChange={e => {
                   const c = [...upcomingMatches]; c[idx].name = e.target.value; setUpcomingMatches(c);
                }} />
                <button className="admin-btn-outline" style={{color: 'var(--admin-error)'}} onClick={() => setUpcomingMatches(upcomingMatches.filter((_, i) => i !== idx))}>×</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="admin-grid-2" style={{marginTop: 24}}>
          {/* RULES SUMMARY */}
          <section className="admin-card">
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
            <h3>Quick Rules</h3>
            <button className="admin-btn-outline" style={{padding: '5px 12px', fontSize: '0.75rem'}} onClick={() => setRulesSummary([...rulesSummary, ""])}>+ Add</button>
          </div>
          <div style={{display: 'grid', gap: 8}}>
            {rulesSummary.map((r, idx) => (
              <div key={idx} style={{display: 'flex', gap: 8}}>
                <input className="admin-input" value={r} onChange={e => {
                  const c = [...rulesSummary]; c[idx] = e.target.value; setRulesSummary(c);
                }} />
                <button className="admin-btn-outline" style={{color: 'var(--admin-error)'}} onClick={() => setRulesSummary(rulesSummary.filter((_, i) => i !== idx))}>×</button>
              </div>
            ))}
          </div>
        </section>

        {/* MEDIA SECTION */}
        <section className="admin-card">
            <h3>Global Media Articles</h3>
            <div className="admin-grid-1" style={{marginTop: 16, display: 'grid', gap: 12}}>
            {newsItems.map((n, idx) => (
                <div key={idx} className="stat-item" style={{display: 'block', padding: 12}}>
                    <input className="admin-input" style={{marginBottom: 8}} placeholder="Title" value={n.title} onChange={e => {
                        const c = [...newsItems]; c[idx].title = e.target.value; setNewsItems(c);
                    }} />
                    <input className="admin-input" placeholder="Meta (e.g. 2h ago)" value={n.meta} onChange={e => {
                        const c = [...newsItems]; c[idx].meta = e.target.value; setNewsItems(c);
                    }} />
                    <div style={{marginTop: 8, textAlign: 'right'}}>
                        <button className="status-badge blocked" style={{border: 'none', cursor: 'pointer'}} onClick={() => setNewsItems(newsItems.filter((_, i) => i !== idx))}>REMOVE</button>
                    </div>
                </div>
            ))}
            <button className="stat-item" style={{justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', cursor: 'pointer'}} onClick={() => setNewsItems([...newsItems, emptyNews()])}>
                + ADD NEWS ITEM
            </button>
            </div>
        </section>
      </div>
    </div>
  );
}

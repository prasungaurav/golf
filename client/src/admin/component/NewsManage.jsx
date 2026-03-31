import React, { useState, useEffect } from "react";
import "../style/Admin.css";

export default function NewsManage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: "", content: "", category: "Update", image: "", status: "published" });

  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchNews = () => {
    setLoading(true);
    fetch(`${apiBase}/api/news/all`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.ok) setNews(data.news);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchNews, [apiBase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `${apiBase}/api/news/${editing._id}` : `${apiBase}/api/news/create`;
    const method = editing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include"
      });
      const data = await res.json();
      if (data.ok) {
        setEditing(null);
        setFormData({ title: "", content: "", category: "Update", image: "", status: "published" });
        fetchNews();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Confirm deletion of this narrative?")) return;
    try {
      const res = await fetch(`${apiBase}/api/news/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.ok) fetchNews();
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      image: item.image,
      status: item.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div className="admin-title">
          <h1>News & Media Feed</h1>
          <p>Broadcast updates, tournament results, and lifestyle content</p>
        </div>
        <div className="admin-actions">
           <button 
             className="admin-btn-outline" 
             onClick={async () => {
                if(!window.confirm("Sync system updates from tournament events?")) return;
                const res = await fetch(`${apiBase}/api/news/sync-updates`, { method: "POST", credentials: "include" });
                const data = await res.json();
                alert(data.ok ? data.message : "Sync failed");
                if(data.ok) fetchNews();
             }}
           >
             🔄 Sync Events
           </button>
        </div>
      </header>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
         {/* FORM */}
         <section className="admin-card">
            <h3>{editing ? "Edit Narrative" : "Compose New Post"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
               <input 
                 className="admin-input" 
                 placeholder="Headline Title" 
                 value={formData.title} 
                 onChange={e => setFormData({ ...formData, title: e.target.value })} 
                 required 
               />
               <textarea 
                 className="admin-input" 
                 placeholder="Broadcast Content" 
                 rows={8} 
                 value={formData.content} 
                 onChange={e => setFormData({ ...formData, content: e.target.value })} 
                 required 
               />
               <div className="admin-grid-2">
                  <div>
                    <label className="stat-label">Sector</label>
                    <select 
                      className="admin-input" 
                      value={formData.category} 
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Update">General Update</option>
                      <option value="Tournament">Tournament Official</option>
                      <option value="Match Result">Score Update</option>
                      <option value="Rules">Regulation</option>
                      <option value="Lifestyle">Lifestyle</option>
                      <option value="Pro Tips">Performance Tips</option>
                    </select>
                  </div>
                  <div>
                    <label className="stat-label">Visibility</label>
                    <select 
                      className="admin-input" 
                      value={formData.status} 
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="published">Published</option>
                      <option value="pending">Draft / Hidden</option>
                    </select>
                  </div>
               </div>
               <input 
                 className="admin-input" 
                 placeholder="Media URL (Image source)" 
                 value={formData.image} 
                 onChange={e => setFormData({ ...formData, image: e.target.value })} 
               />
               <div style={{display: 'flex', gap: 12}}>
                  <button className="admin-btn" type="submit" style={{flex: 1}}>
                    {editing ? "Commit Edit" : "Publish to Feed"}
                  </button>
                  {editing && (
                    <button className="admin-btn-outline" type="button" onClick={() => { setEditing(null); setFormData({ title: "", content: "", category: "Update", image: "", status: "published" }); }}>
                      Cancel
                    </button>
                  )}
               </div>
            </form>
         </section>

         {/* LIST */}
         <section className="admin-card">
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
               <h3>Live Feed Items</h3>
               <span className="status-badge active">{news.length} Total</span>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto', paddingRight: 8}}>
               {loading ? (
                 <p className="admin-text-muted">Scanning feed...</p>
               ) : news.map(item => (
                 <div key={item._id} className="stat-item" style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16}}>
                    <div style={{maxWidth: '70%'}}>
                       <div style={{fontWeight: 700, marginBottom: 4}}>{item.title}</div>
                       <div style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                          <span style={{color: 'var(--admin-primary)'}}>{item.category}</span> • 
                          <span style={{color: item.status === 'published' ? 'var(--admin-success)' : 'var(--admin-error)'}}> {item.status}</span> • 
                          <span className="admin-text-muted"> {item.isAutoGenerated ? "🤖 AUTO" : "👤 MANUAL"}</span>
                       </div>
                    </div>
                    <div style={{display: 'flex', gap: 8}}>
                       <button className="status-badge active" style={{border: 'none', cursor: 'pointer'}} onClick={() => startEdit(item)}>EDIT</button>
                       <button className="status-badge blocked" style={{border: 'none', cursor: 'pointer'}} onClick={() => handleDelete(item._id)}>DROP</button>
                    </div>
                 </div>
               ))}
               {news.length === 0 && <p className="admin-text-muted">The feed is currently silent.</p>}
            </div>
         </section>
      </div>
    </div>
  );
}

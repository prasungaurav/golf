import React, { useEffect, useState } from "react";
import "../style/Admin.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AdminPageEditor() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/pages`, { credentials: "include" });
      const json = await res.json();
      if (json.ok) setPages(json.pages);
      else setError(json.message);
    } catch (e) {
      setError("Failed to sync with page repository.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/api/admin/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedPage),
        credentials: "include"
      });
      const json = await res.json();
      if (json.ok) {
        alert("Page data committed to main server.");
        fetchPages();
      } else {
        alert(json.message);
      }
    } catch (e) {
      alert("Transmission error.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="admin-title"><h1>Reading Page Matrix...</h1></div>;

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div className="admin-title">
          <h1>CMS Page Repository</h1>
          <p>Edit dynamic content for static platform pages (About, FAQ, Rules)</p>
        </div>
        <div className="admin-actions">
           <button className="admin-btn-outline" onClick={() => setSelectedPage({ slug: "", title: "", content: "" })}>+ New Entry</button>
        </div>
      </header>

      <div style={{display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px'}}>
         <div className="admin-card" style={{padding: 0}}>
            <div style={{padding: 16, borderBottom: '1px solid var(--admin-border)', fontWeight: 700}}>Active Pages</div>
            <div style={{maxHeight: '60vh', overflowY: 'auto'}}>
               {pages.map(p => (
                 <div 
                  key={p.slug} 
                  className={`admin-nav-item ${selectedPage?.slug === p.slug ? 'active' : ''}`}
                  style={{borderRadius: 0, margin: '4px 0', cursor: 'pointer'}}
                  onClick={() => setSelectedPage({...p})}
                 >
                   {p.title}
                 </div>
               ))}
            </div>
         </div>

         {selectedPage ? (
           <div className="admin-card fade-in">
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
                 <h3>Editing: {selectedPage.title || "New Page"}</h3>
                 <button className="admin-btn" disabled={isSaving} onClick={handleSave}>{isSaving ? "Saving..." : "Commit Update"}</button>
              </div>

              <div style={{display: 'grid', gap: '16px'}}>
                 <div>
                    <label className="stat-label">Page Slug (Unique ID)</label>
                    <input 
                      disabled={selectedPage._id}
                      className="admin-input" 
                      value={selectedPage.slug} 
                      onChange={e => setSelectedPage({...selectedPage, slug: e.target.value})}
                      placeholder="e.g. about-us"
                    />
                 </div>
                 <div>
                    <label className="stat-label">Display Title</label>
                    <input 
                      className="admin-input" 
                      value={selectedPage.title} 
                      onChange={e => setSelectedPage({...selectedPage, title: e.target.value})}
                      placeholder="e.g. About Our Platform"
                    />
                 </div>
                 <div>
                    <label className="stat-label">Page Content (Markdown/HTML supported)</label>
                    <textarea 
                      className="admin-input" 
                      style={{minHeight: '300px', fontFamily: 'monospace'}}
                      value={selectedPage.content} 
                      onChange={e => setSelectedPage({...selectedPage, content: e.target.value})}
                      placeholder="Write your content here..."
                    />
                 </div>
              </div>
           </div>
         ) : (
           <div className="admin-card" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px'}}>
              <p className="admin-text-muted">Select a page from the sidebar to begin terminal editing.</p>
           </div>
         )}
      </div>
    </div>
  );
}

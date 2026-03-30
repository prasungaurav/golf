import React, { useState, useEffect } from "react";
import "../../common/style/Dashboard.css"; // Reuse some card styles

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
    if (!window.confirm("Are you sure?")) return;
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
  };

  return (
    <div className="dash" style={{ padding: 40 }}>
      <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="cardHead">
          <h3>{editing ? "Edit News" : "Create News"}</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <button 
              className="ghostBtn" 
              style={{ width: "auto", border: "1px solid var(--primary)", color: "var(--primary)" }} 
              onClick={async () => {
                if(!window.confirm("This will import missing updates from tournaments. Proceed?")) return;
                const res = await fetch(`${apiBase}/api/news/sync-updates`, { method: "POST", credentials: "include" });
                const data = await res.json();
                alert(data.ok ? data.message : "Sync failed");
                if(data.ok) fetchNews();
              }}
            >
              🔄 Sync Updates
            </button>
            <button className="ghostBtn" style={{ width: "auto" }} onClick={() => { setEditing(null); setFormData({ title: "", content: "", category: "Update", image: "", status: "published" }); }}>
              Clear
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          <input 
            className="inputField" 
            placeholder="Title" 
            value={formData.title} 
            onChange={e => setFormData({ ...formData, title: e.target.value })} 
            required 
            style={{ padding: 12, borderRadius: 8, border: "1px solid var(--outline_variant)" }}
          />
          <textarea 
            className="inputField" 
            placeholder="Content" 
            rows={5} 
            value={formData.content} 
            onChange={e => setFormData({ ...formData, content: e.target.value })} 
            required 
            style={{ padding: 12, borderRadius: 8, border: "1px solid var(--outline_variant)", fontFamily: "inherit" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
            <select 
              className="inputField" 
              value={formData.category} 
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid var(--outline_variant)" }}
            >
              <option value="Update">Update</option>
              <option value="Tournament">Tournament</option>
              <option value="Tournament Update">Tournament Update</option>
              <option value="Match Result">Match Result</option>
              <option value="Rules">Rules</option>
              <option value="Lifestyle">Lifestyle</option>
              <option value="Pro Tips">Pro Tips</option>
            </select>
            <select 
              className="inputField" 
              value={formData.status} 
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid var(--outline_variant)" }}
            >
              <option value="published">Published</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <input 
            className="inputField" 
            placeholder="Image URL (optional)" 
            value={formData.image} 
            onChange={e => setFormData({ ...formData, image: e.target.value })} 
            style={{ padding: 12, borderRadius: 8, border: "1px solid var(--outline_variant)" }}
          />
          <button className="primaryBtn" type="submit" style={{ width: "100%" }}>
            {editing ? "Save Changes" : "Create Post"}
          </button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: 800, margin: "40px auto 0" }}>
        <div className="cardHead">
          <h3>Manage News</h3>
          <span className="badge">{news.length} Items</span>
        </div>

        <div className="news-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <p>Loading...</p>
          ) : news.map(item => (
            <div key={item._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 15, background: "var(--surface_container_high)", borderRadius: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{item.title}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--on_surface_variant)" }}>
                  {item.category} • {item.status} • {item.isAutoGenerated ? "🤖 Auto" : "👤 Manual"}
                  {item.tournamentId && (
                    <div style={{ color: "var(--primary)", fontWeight: 600, marginTop: 2 }}>
                      Tournament: {item.tournamentId.title || "Unknown"}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="smallBtn" onClick={() => startEdit(item)}>Edit</button>
                <button className="smallBtn" style={{ color: "var(--error)" }} onClick={() => handleDelete(item._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

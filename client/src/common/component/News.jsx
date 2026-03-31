import React, { useState, useEffect } from "react";
import "../style/News.css";

export default function News() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetch(`${apiBase}/api/news/all`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setNewsList(data.news || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apiBase]);

  const [selectedNews, setSelectedNews] = useState(null);

  return (
    <div className="news-page">
      <header className="news-header">
        <h1>Latest News & Updates</h1>
        <p>Stay informed about tournaments, rules, and lifestyle updates.</p>
      </header>

      <div className="news-grid">
        {loading ? (
          <div className="loading-news">Loading newest updates...</div>
        ) : newsList.length === 0 ? (
          <div className="empty-news">No golf news or tournament updates yet. Check back soon!</div>
        ) : (
          newsList.map(item => (
            <article key={item._id} className="news-card">
              <div className="news-image-container">
                <div
                  className="news-image"
                  style={{ backgroundImage: `url(${item.image || "/images/golf_basics.png"})` }}
                />
                <span className={`news-category-badge cat-${(item.category || "update").toLowerCase().replace(/\s+/g, '-')}`}>
                  {item.category}
                </span>
              </div>

              <div className="news-content">
                <div className="news-date">
                  <i className="material-icons text-xs">calendar_today</i>
                  {new Date(item.createdAt).toLocaleDateString()}
                  {item.tournamentId && (
                    <span className="news-origin">
                      • {item.tournamentId.title}
                    </span>
                  )}
                </div>
                <div className="news-author" style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, marginBottom: 8 }}>
                  By {item.authorId?.organiserName || item.authorId?.playerName || item.authorId?.name || "Official"}
                </div>
                <h2>{item.title}</h2>
                <p>{item.excerpt || item.content?.substring(0, 150) + "..."}</p>
                <button className="read-more-btn" onClick={() => setSelectedNews(item)}>
                  Read Full Story
                  <i className="material-icons">east</i>
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedNews && (
        <div className="news-modal-overlay" onClick={() => setSelectedNews(null)}>
          <div className="news-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedNews(null)}>
              <i className="material-icons">close</i>
            </button>

            <div className="modal-header-image" style={{ backgroundImage: `url(${selectedNews.image || "/images/golf_basics.png"})` }}>
              <span className={`news-category-badge cat-${(selectedNews.category || "update").toLowerCase().replace(/\s+/g, '-')}`}>
                {selectedNews.category}
              </span>
            </div>

            <div className="modal-body">
              <div className="news-date">
                <i className="material-icons">calendar_today</i>
                {new Date(selectedNews.createdAt).toLocaleString()}
                {selectedNews.tournamentId && (
                  <span className="news-origin">• {selectedNews.tournamentId.title}</span>
                )}
              </div>
              <h1>{selectedNews.title}</h1>
              <div className="news-author" style={{ color: "var(--primary)", fontWeight: 700, marginBottom: 20 }}>
                By {selectedNews.authorId?.organiserName || selectedNews.authorId?.playerName || selectedNews.authorId?.name || "Official"}
              </div>
              <div className="full-content">
                {selectedNews.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

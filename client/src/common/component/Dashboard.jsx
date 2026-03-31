import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "../style/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  useAuth();
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [heroSlides, setHeroSlides] = useState([
    { title: "Play Like a Pro", subtitle: "Track matches, rankings & highlights in one place.", cta: "Explore Tournaments", image: "/images/golf1.png" },
    { title: "Live Golf. Real-Time.", subtitle: "Follow ongoing matches with instant updates.", cta: "View Live Matches", image: "/images/golf2.png" }
  ]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    // Top 10 rankings
    fetch(`${apiBase}/api/matches/rankings/all`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok) {
          setLeaderboard(data.rankings.slice(0, 5));
        }
      })
      .catch(console.error);

    // Latest News for Ribbon
    fetch(`${apiBase}/api/news/all`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok) setNewsItems((data.news || []).slice(0, 5));
      })
      .catch(console.error);

    // Other dashboard content
    fetch(`${apiBase}/api/config`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok && data.data) {
          const conf = data.data;
          if (conf.heroSlides?.length) setHeroSlides(conf.heroSlides);
          if (conf.liveMatches?.length) setLiveMatches(conf.liveMatches);
          if (conf.upcomingMatches?.length) setUpcomingMatches(conf.upcomingMatches);
          if (conf.media) {
            if (conf.media.videos?.length) setVideos(conf.media.videos);
          }
        }
      })
      .catch(console.error);
  }, [apiBase]);
  const [active, setActive] = useState(0);
  const [livePage, setLivePage] = useState(0);
  const [isHoveringHero, setIsHoveringHero] = useState(false);

  useEffect(() => {
    if (isHoveringHero) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [heroSlides.length, isHoveringHero]);

  // AUTO-SLIDE for Live Matches (1-by-1 sliding window)
  useEffect(() => {
    if (liveMatches.length <= 2) return;
    const id = setInterval(() => {
      setLivePage((prev) => (prev + 1) % liveMatches.length);
    }, 5000);
    return () => clearInterval(id);
  }, [liveMatches.length]);

  // ✅ KEYBOARD NAVIGATION
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (heroSlides.length <= 1) return;
      if (e.key === "ArrowLeft") {
        setActive((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
      } else if (e.key === "ArrowRight") {
        setActive((prev) => (prev + 1) % heroSlides.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [heroSlides.length]);

  const slide = heroSlides[active];

  return (
    <div className="dash">


      {/* HERO (full width) */}
      <section
        className="hero"
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
      >
        <div
          className="heroBg"
          style={{ backgroundImage: `url(${slide.image})` }}
        />
        <div className="heroOverlay" />

        <div className="heroContent">
          <h1>{slide.title}</h1>
          <p>{slide.subtitle}</p>
          <button className="primaryBtn">{slide.cta}</button>
        </div>

        <div className="dots">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === active ? "active" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* NEWS RIBBON (Thin slide under hero) */}
      <div className="news-ribbon">
        <div className="ribbon-label">LATEST UPDATES</div>
        <div className="ribbon-content">
          <div className="ribbon-track">
            {newsItems.length > 0 ? newsItems.map((n, i) => (
              <span key={i} className="ribbon-item">
                <span className="dot">•</span>
                <strong>{n.title}:</strong> {n.content}
              </span>
            )) : (
              <span className="ribbon-item">Welcome to the Golf Platform! Stay tuned for more updates.</span>
            )}
          </div>
        </div>
        <button className="ribbon-btn" onClick={() => navigate("/news")}>
          See More <i className="material-icons">arrow_forward</i>
        </button>
      </div>

      {/* MAIN GRID */}
      <main className="mainGrid">
        {/* LEFT: Leaderboard */}
        <aside className="leftCol">
          <div className="card sticky">
            <div className="cardHead">
              <h3>Top Leaderboard</h3>
              <span className="badge">Global</span>
            </div>

            <div className="leaderList">
              {leaderboard.length > 0 ? leaderboard.map((p, idx) => (
                <div className="leaderRow" key={idx}>
                  <div className="rank">{idx + 1}</div>
                  <div className="pname">
                    <Link to={`/profile/${p._id || p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {p.playerName || p.name || "Player"}
                    </Link>
                  </div>
                  <div className="pscore">{p.points || 0} pts</div>
                </div>
              )) : (
                <div className="emptyState" style={{ textAlign: "center", padding: "20px", opacity: 0.6 }}>
                  No players ranked yet
                </div>
              )}
            </div>

            <button className="ghostBtn leaderboardBtn">View Full Leaderboard</button>
          </div>
        </aside>

        {/* CENTER: Live -> Upcoming -> Highlights */}
        <section className="centerCol">
          {/* Live Matches */}
          <div className="card">
            <div className="cardHead">
              <h3>Live Matches</h3>
              <span className="liveDot">LIVE</span>
            </div>

            <div className="match-carousel-container">
              <div 
                className="match-track" 
                style={{ 
                  transform: `translateX(calc(-${livePage * 50}% - ${livePage * 8}px))`
                }}
              >
                {liveMatches.map((m, idx) => (
                  <div className="matchCard" key={m.matchId || idx}>
                    <div className="matchTop">
                      <span className="pill live">{m.status || "Live"}</span>
                      <span className="muted">{m.hole || "Hole 1"}</span>
                    </div>
                    <div className="matchTitle">{m.title}</div>
                    <div className="matchMeta">
                      <span>Score: {m.score}</span>
                      <span>•</span>
                      <span>Course: {m.course}</span>
                    </div>
                    <button className="smallBtn">Watch / Track</button>
                  </div>
                ))}
                {/* Wraparound clone for seamless loop */}
                {liveMatches.length > 2 && (
                   <div className="matchCard clone">
                      <div className="matchTop">
                        <span className="pill live">{liveMatches[0].status || "Live"}</span>
                        <span className="muted">{liveMatches[0].hole || "Hole 1"}</span>
                      </div>
                      <div className="matchTitle">{liveMatches[0].title}</div>
                      <div className="matchMeta">
                        <span>Score: {liveMatches[0].score}</span>
                        <span>•</span>
                        <span>Course: {liveMatches[0].course}</span>
                      </div>
                      <button className="smallBtn">Watch / Track</button>
                   </div>
                )}
              </div>
            </div>

            {liveMatches.length > 2 && (
              <div className="live-pagination">
                {liveMatches.map((_, i) => (
                  <button 
                    key={i} 
                    className={`pagi-dot ${i === livePage ? 'active' : ''}`} 
                    onClick={() => setLivePage(i)}
                    aria-label={`Go to live match start ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="center-bottom">
            {/* Upcoming Matches */}
            <div className="card">
              <div className="cardHead">
                <h3>Upcoming Matches</h3>
                <span className="badge">Next 7 days</span>
              </div>

              <div className="list">
                {upcomingMatches.map((x, i) => (
                  <div className="listRow" key={i}>
                    <div className="listTime">{x.t}</div>
                    <div className="listName">{x.name}</div>
                    <button className="chipBtn">Details</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights */}
            <div className="card">
              <div className="cardHead">
                <h3>Highlights</h3>
                <span className="badge">Trending</span>
              </div>

              <div className="highlightGrid">
                {videos.slice(0, 3).map((h, i) => (
                  <div className="highlight" key={i}>
                    <div className="thumb" style={{ backgroundImage: `url(${h.img})` }} />
                    <div className="hText">
                      <div className="hTitle">{h.title}</div>
                      <div className="muted">{h.dur} • {h.meta}</div>
                    </div>
                    <button className="smallBtn">Play</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: Ads */}
        <aside className="rightCol">
          <div className="card sticky">
            <div className="adBox">
              <div className="adLabel">Advertisement</div>
              <h4>Golf Club Membership</h4>
              <p className="muted">
                Join premium tournaments. Get special entry access & perks.
              </p>
              <button className="primaryBtn">Join Now</button>
            </div>

            <div className="adBox small">
              <div className="adLabel">Sponsored</div>
              <h4>Buy New Golf Set</h4>
              <p className="muted">Limited time discount for players.</p>
              <button className="ghostBtn">View Offer</button>
            </div>
          </div>
        </aside>
      </main>


    </div>
  );
}

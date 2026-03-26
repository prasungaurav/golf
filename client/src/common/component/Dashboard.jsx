import React, { useEffect, useState } from "react";
import "../style/Dashboard.css";

export default function Dashboard() {
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [heroSlides, setHeroSlides] = useState([
    { title: "Play Like a Pro", subtitle: "Track matches, rankings & highlights in one place.", cta: "Explore Tournaments", image: "/images/golf1.png" },
    { title: "Live Golf. Real-Time.", subtitle: "Follow ongoing matches with instant updates.", cta: "View Live Matches", image: "/images/golf2.png" }
  ]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    fetch(`${apiBase}/api/admin/dashboard`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok && data.data) {
          const conf = data.data;
          if (conf.heroSlides?.length) setHeroSlides(conf.heroSlides);
          if (conf.leaderboard?.length) setLeaderboard(conf.leaderboard);
          if (conf.liveMatches?.length) setLiveMatches(conf.liveMatches);
          if (conf.upcomingMatches?.length) setUpcomingMatches(conf.upcomingMatches);
          if (conf.media) {
            if (conf.media.newsItems?.length) setNewsItems(conf.media.newsItems);
            if (conf.media.photos?.length) setPhotos(conf.media.photos);
            if (conf.media.videos?.length) setVideos(conf.media.videos);
          }
        }
      })
      .catch(console.error);
  }, [apiBase]);
  const [active, setActive] = useState(0);
  const [isHoveringHero, setIsHoveringHero] = useState(false);

  useEffect(() => {
    if (isHoveringHero) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [heroSlides.length, isHoveringHero]);

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

      {/* MAIN GRID */}
      <main className="mainGrid">
        {/* LEFT: Leaderboard */}
        <aside className="leftCol">
          <div className="card sticky">
            <div className="cardHead">
              <h3>Top Leaderboard</h3>
              <span className="badge">Today</span>
            </div>

            <div className="leaderList">
              {leaderboard.map((p, idx) => (
                <div className="leaderRow" key={idx}>
                  <div className="rank">{idx + 1}</div>
                  <div className="pname">{p.name}</div>
                  <div className="pscore">{p.score}</div>
                </div>
              ))}
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

            <div className="matchGrid">
              {liveMatches.map((m, idx) => (
                <div className="matchCard" key={idx}>
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
            </div>
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


      {/* NEWS + PHOTOS + VIDEOS (Below Highlights) */}
      <div className="mediaSection">
        <div className="mediaHead">
          <h2>Updates</h2>
          <button className="mediaMoreBtn">More →</button>
        </div>

        <div className="mediaGrid">
          {/* NEWS */}
          <div className="mediaCard">
            <div className="mediaCardHead">
              <h3>News</h3>
              <button className="linkBtn">View all</button>
            </div>

            <div className="newsCards">
              {newsItems.map((n, i) => (
                <button className="newsCard" key={i}>
                  <div
                    className="newsImg"
                    style={{ backgroundImage: `url(${n.img})` }}
                  />
                  <div className="newsText">
                    <div className="newsTitle">{n.title}</div>
                    <div className="newsMeta">{n.meta}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Add new item button (UI only) */}
            <button className="addBtn">+ Add News</button>
          </div>

          {/* PHOTOS */}
          <div className="mediaCard">
            <div className="mediaCardHead">
              <h3>Photos</h3>
              <button className="linkBtn">View all</button>
            </div>

            <div className="photoGrid">
              {photos.map((src, i) => (
                <button
                  className="photoItem"
                  key={i}
                  style={{ backgroundImage: `url(${src})` }}
                  aria-label={`Open photo ${i + 1}`}
                />
              ))}
            </div>

            <button className="addBtn">+ Add Photo</button>
          </div>

          {/* VIDEOS */}
          <div className="mediaCard">
            <div className="mediaCardHead">
              <h3>Videos</h3>
              <button className="linkBtn">View all</button>
            </div>

            <div className="videoCards">
              {videos.map((v, i) => (
                <button className="videoCard" key={i}>
                  <div
                    className="videoThumb"
                    style={{ backgroundImage: `url(${v.img})` }}
                  >
                    <span className="videoDur">{v.dur}</span>
                  </div>

                  <div className="videoText">
                    <div className="videoTitle">{v.title}</div>
                    <div className="videoMeta">{v.meta}</div>
                  </div>
                </button>
              ))}
            </div>

            <button className="addBtn">+ Add Video</button>
          </div>
        </div>
      </div>
    </div>
  );
}

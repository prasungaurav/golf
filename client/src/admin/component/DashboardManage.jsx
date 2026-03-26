import React, { useMemo, useState, useEffect } from "react";
import "../style/DashboardManage.css";

const emptySlide = () => ({
  title: "",
  subtitle: "",
  cta: "",
  image: "",
});

const emptyLeader = () => ({ name: "", score: "" });

const emptyLiveMatch = () => ({
  status: "Live",
  hole: "Hole 1",
  title: "",
  score: "",
  course: "",
});

const emptyUpcoming = () => ({ t: "", name: "" });

const emptyNews = () => ({ img: "", title: "", meta: "" });

const emptyVideo = () => ({ img: "", title: "", meta: "", dur: "00:00" });

export default function DashboardManage() {
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // ====== DATA STATE (edit this to load from DB later) ======
  const [heroSlides, setHeroSlides] = useState([
    {
      title: "Play Like a Pro",
      subtitle: "Track matches, rankings & highlights in one place.",
      cta: "Explore Tournaments",
      image: "/images/golf1.png",
    },
    {
      title: "Live Golf. Real-Time.",
      subtitle: "Follow ongoing matches with instant updates.",
      cta: "View Live Matches",
      image: "/images/golf2.png",
    },
    {
      title: "Premium Events",
      subtitle: "Rules for everyone, play access for premium members.",
      cta: "Get Premium",
      image: "/images/golf3.png",
    },
  ]);

  const [leaderboard, setLeaderboard] = useState([
    { name: "A. Sharma", score: "-6" },
    { name: "R. Singh", score: "-5" },
    { name: "P. Verma", score: "-4" },
    { name: "K. Mehta", score: "-3" },
    { name: "S. Khan", score: "-2" },
  ]);

  const [liveMatches, setLiveMatches] = useState([
    {
      status: "Live",
      hole: "Hole 12",
      title: "Team Eagle vs Team Birdie",
      score: "3 - 2",
      course: "Royal Greens",
    },
    {
      status: "Live",
      hole: "Hole 8",
      title: "Kings vs Masters",
      score: "1 - 1",
      course: "Green Valley",
    },
    {
      status: "Live",
      hole: "Hole 8",
      title: "Kings vs Masters",
      score: "1 - 1",
      course: "Green Valley",
    },
    {
      status: "Live",
      hole: "Hole 8",
      title: "Kings vs Masters",
      score: "1 - 1",
      course: "Green Valley",
    },
  ]);

  const [upcomingMatches, setUpcomingMatches] = useState([
    { t: "Sunday 9:00 AM", name: "City Open Qualifier" },
    { t: "Monday 4:30 PM", name: "Club Championship - Round 1" },
    { t: "Wednesday 7:00 AM", name: "Pro-Am Special Match" },
  ]);

  const [newsItems, setNewsItems] = useState([
    {
      img: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80",
      title: "City Open: Round 1 leaderboard update",
      meta: "2 hours ago • Tournament",
    },
    {
      img: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=800&q=80",
      title: "New handicap rule update explained",
      meta: "5 hours ago • Rules",
    },
  ]);

  const [photos, setPhotos] = useState([
    "https://images.unsplash.com/photo-1500930287596-c1ecaa373b61?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1529692236671-f1dcadff19b0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1508778552286-12d4d0506a3a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1520975958225-2fa3f91f4500?auto=format&fit=crop&w=800&q=80",
  ]);

  const [videos, setVideos] = useState([
    {
      img: "https://images.unsplash.com/photo-1520975958225-2fa3f91f4500?auto=format&fit=crop&w=800&q=80",
      title: "Top 5 shots of the week",
      meta: "3 min • Highlights",
      dur: "03:12",
    },
    {
      img: "https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=800&q=80",
      title: "How to swing like a pro (simple)",
      meta: "6 min • Training",
      dur: "06:08",
    },
  ]);

  useEffect(() => {
    fetch(`${apiBase}/api/admin/dashboard`, { credentials: "include" })
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

  // ====== JSON PREVIEW / EXPORT ======
  const exportJson = useMemo(() => {
    return JSON.stringify(
      {
        heroSlides,
        leaderboard,
        liveMatches,
        upcomingMatches,
        media: { newsItems, photos, videos },
      },
      null,
      2
    );
  }, [heroSlides, leaderboard, liveMatches, upcomingMatches, newsItems, photos, videos]);

  // ====== HELPERS ======
  const moveItem = (arr, from, to) => {
    const copy = [...arr];
    const [sp] = copy.splice(from, 1);
    copy.splice(to, 0, sp);
    return copy;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      alert("Copied JSON to clipboard ✅");
    } catch {
      alert("Copy failed ❌ (browser blocked)");
    }
  };

  const saveToDb = async () => {
    try {
      const payload = JSON.parse(exportJson);
      const res = await fetch(`${apiBase}/api/admin/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data?.ok) {
        alert("Saved to DB successfully ✅");
      } else {
        alert("Failed to save: " + data?.message);
      }
    } catch (err) {
      alert("Error saving to DB");
      console.error(err);
    }
  };

  return (
    <div className="dmWrap">
      <header className="dmHeader">
        <div>
          <h1>Dashboard Management</h1>
          <p className="muted">
            Manage hero slides, matches, leaderboard and media from one admin page.
          </p>
        </div>

        <div className="dmHeaderActions">
          <button className="ghostBtn" onClick={copyToClipboard}>
            Copy JSON
          </button>
          <button
            className="primaryBtn"
            onClick={saveToDb}
          >
            Save Changes
          </button>
        </div>
      </header>

      {/* ========= HERO SLIDES ========= */}
      <section className="dmCard">
        <div className="dmCardHead">
          <h2>Hero Slides</h2>
          <button
            className="chipBtn"
            onClick={() => setHeroSlides((p) => [...p, emptySlide()])}
          >
            + Add Slide
          </button>
        </div>

        <div className="dmGrid">
          {heroSlides.map((s, idx) => (
            <div className="dmItem" key={idx}>
              <div className="dmItemTop">
                <div className="badge">Slide #{idx + 1}</div>
                <div className="dmRowBtns">
                  <button
                    className="chipBtn"
                    disabled={idx === 0}
                    onClick={() => setHeroSlides((p) => moveItem(p, idx, idx - 1))}
                  >
                    ↑
                  </button>
                  <button
                    className="chipBtn"
                    disabled={idx === heroSlides.length - 1}
                    onClick={() => setHeroSlides((p) => moveItem(p, idx, idx + 1))}
                  >
                    ↓
                  </button>
                  <button
                    className="dangerBtn"
                    onClick={() => setHeroSlides((p) => p.filter((_, i) => i !== idx))}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <label className="dmLabel">
                Title
                <input
                  value={s.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHeroSlides((p) =>
                      p.map((x, i) => (i === idx ? { ...x, title: v } : x))
                    );
                  }}
                />
              </label>

              <label className="dmLabel">
                Subtitle
                <input
                  value={s.subtitle}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHeroSlides((p) =>
                      p.map((x, i) => (i === idx ? { ...x, subtitle: v } : x))
                    );
                  }}
                />
              </label>

              <div className="dmRow">
                <label className="dmLabel">
                  CTA
                  <input
                    value={s.cta}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHeroSlides((p) =>
                        p.map((x, i) => (i === idx ? { ...x, cta: v } : x))
                      );
                    }}
                  />
                </label>

                <label className="dmLabel">
                  Image URL / Path
                  <input
                    value={s.image}
                    placeholder="/images/golf1.png or https://..."
                    onChange={(e) => {
                      const v = e.target.value;
                      setHeroSlides((p) =>
                        p.map((x, i) => (i === idx ? { ...x, image: v } : x))
                      );
                    }}
                  />
                </label>
              </div>

              <div
                className="dmPreview"
                style={{ backgroundImage: `url(${s.image})` }}
                aria-label="slide preview"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ========= LEADERBOARD ========= */}
      <section className="dmCard">
        <div className="dmCardHead">
          <h2>Leaderboard</h2>
          <button
            className="chipBtn"
            onClick={() => setLeaderboard((p) => [...p, emptyLeader()])}
          >
            + Add Player
          </button>
        </div>

        <div className="dmTable">
          {leaderboard.map((p, idx) => (
            <div className="dmTableRow" key={idx}>
              <div className="rank">{idx + 1}</div>

              <input
                className="dmInput"
                placeholder="Player name"
                value={p.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setLeaderboard((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, name: v } : x))
                  );
                }}
              />

              <input
                className="dmInput"
                placeholder="Score e.g. -6"
                value={p.score}
                onChange={(e) => {
                  const v = e.target.value;
                  setLeaderboard((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, score: v } : x))
                  );
                }}
              />

              <button
                className="dangerBtn"
                onClick={() => setLeaderboard((prev) => prev.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ========= LIVE MATCHES ========= */}
      <section className="dmCard">
        <div className="dmCardHead">
          <h2>Live Matches</h2>
          <button
            className="chipBtn"
            onClick={() => setLiveMatches((p) => [...p, emptyLiveMatch()])}
          >
            + Add Live Match
          </button>
        </div>

        <div className="dmGrid">
          {liveMatches.map((m, idx) => (
            <div className="dmItem" key={idx}>
              <div className="dmItemTop">
                <div className="badge">Match #{idx + 1}</div>
                <button
                  className="dangerBtn"
                  onClick={() => setLiveMatches((p) => p.filter((_, i) => i !== idx))}
                >
                  Delete
                </button>
              </div>

              <div className="dmRow">
                <label className="dmLabel">
                  Hole
                  <input
                    value={m.hole}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLiveMatches((p) =>
                        p.map((x, i) => (i === idx ? { ...x, hole: v } : x))
                      );
                    }}
                  />
                </label>

                <label className="dmLabel">
                  Course
                  <input
                    value={m.course}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLiveMatches((p) =>
                        p.map((x, i) => (i === idx ? { ...x, course: v } : x))
                      );
                    }}
                  />
                </label>
              </div>

              <label className="dmLabel">
                Match Title
                <input
                  value={m.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLiveMatches((p) =>
                      p.map((x, i) => (i === idx ? { ...x, title: v } : x))
                    );
                  }}
                />
              </label>

              <label className="dmLabel">
                Score
                <input
                  value={m.score}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLiveMatches((p) =>
                      p.map((x, i) => (i === idx ? { ...x, score: v } : x))
                    );
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* ========= UPCOMING MATCHES ========= */}
      <section className="dmCard">
        <div className="dmCardHead">
          <h2>Upcoming Matches</h2>
          <button
            className="chipBtn"
            onClick={() => setUpcomingMatches((p) => [...p, emptyUpcoming()])}
          >
            + Add Upcoming
          </button>
        </div>

        <div className="dmTable">
          {upcomingMatches.map((x, idx) => (
            <div className="dmTableRow" key={idx}>
              <input
                className="dmInput"
                placeholder="Time e.g. Sunday 9:00 AM"
                value={x.t}
                onChange={(e) => {
                  const v = e.target.value;
                  setUpcomingMatches((p) =>
                    p.map((it, i) => (i === idx ? { ...it, t: v } : it))
                  );
                }}
              />
              <input
                className="dmInput"
                placeholder="Event name"
                value={x.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setUpcomingMatches((p) =>
                    p.map((it, i) => (i === idx ? { ...it, name: v } : it))
                  );
                }}
              />
              <button
                className="dangerBtn"
                onClick={() => setUpcomingMatches((p) => p.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ========= MEDIA (NEWS / PHOTOS / VIDEOS) ========= */}
      <section className="dmCard">
        <div className="dmCardHead">
          <h2>Media Section</h2>
          <div className="muted">News / Photos / Videos</div>
        </div>

        <div className="dmSplit">
          {/* NEWS */}
          <div className="dmSubCard">
            <div className="dmCardHead small">
              <h3>News</h3>
              <button
                className="chipBtn"
                onClick={() => setNewsItems((p) => [...p, emptyNews()])}
              >
                + Add
              </button>
            </div>

            {newsItems.map((n, idx) => (
              <div className="dmMini" key={idx}>
                <input
                  className="dmInput"
                  placeholder="Image URL"
                  value={n.img}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewsItems((p) => p.map((x, i) => (i === idx ? { ...x, img: v } : x)));
                  }}
                />
                <input
                  className="dmInput"
                  placeholder="Title"
                  value={n.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewsItems((p) =>
                      p.map((x, i) => (i === idx ? { ...x, title: v } : x))
                    );
                  }}
                />
                <input
                  className="dmInput"
                  placeholder="Meta e.g. 2 hours ago • Tournament"
                  value={n.meta}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewsItems((p) => p.map((x, i) => (i === idx ? { ...x, meta: v } : x)));
                  }}
                />
                <button
                  className="dangerBtn"
                  onClick={() => setNewsItems((p) => p.filter((_, i) => i !== idx))}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          {/* PHOTOS */}
          <div className="dmSubCard">
            <div className="dmCardHead small">
              <h3>Photos</h3>
              <button className="chipBtn" onClick={() => setPhotos((p) => [...p, ""])}>
                + Add
              </button>
            </div>

            <div className="dmPhotoList">
              {photos.map((src, idx) => (
                <div className="dmPhotoRow" key={idx}>
                  <div
                    className="dmPhotoThumb"
                    style={{ backgroundImage: `url(${src})` }}
                  />
                  <input
                    className="dmInput"
                    placeholder="Photo URL"
                    value={src}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPhotos((p) => p.map((x, i) => (i === idx ? v : x)));
                    }}
                  />
                  <button
                    className="dangerBtn"
                    onClick={() => setPhotos((p) => p.filter((_, i) => i !== idx))}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* VIDEOS */}
          <div className="dmSubCard">
            <div className="dmCardHead small">
              <h3>Videos</h3>
              <button
                className="chipBtn"
                onClick={() => setVideos((p) => [...p, emptyVideo()])}
              >
                + Add
              </button>
            </div>

            {videos.map((v, idx) => (
              <div className="dmMini" key={idx}>
                <input
                  className="dmInput"
                  placeholder="Thumbnail URL"
                  value={v.img}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVideos((p) => p.map((x, i) => (i === idx ? { ...x, img: val } : x)));
                  }}
                />
                <input
                  className="dmInput"
                  placeholder="Title"
                  value={v.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVideos((p) => p.map((x, i) => (i === idx ? { ...x, title: val } : x)));
                  }}
                />
                <input
                  className="dmInput"
                  placeholder="Meta"
                  value={v.meta}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVideos((p) => p.map((x, i) => (i === idx ? { ...x, meta: val } : x)));
                  }}
                />
                <div className="dmRow">
                  <input
                    className="dmInput"
                    placeholder="Duration e.g. 03:12"
                    value={v.dur}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVideos((p) => p.map((x, i) => (i === idx ? { ...x, dur: val } : x)));
                    }}
                  />
                  <button
                    className="dangerBtn"
                    onClick={() => setVideos((p) => p.filter((_, i) => i !== idx))}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========= JSON PREVIEW ========= */}
      <section className="dmCard">
        <div className="dmCardHead">
          <h2>Export Preview (JSON)</h2>
          <span className="muted">Use this payload to store in MongoDB</span>
        </div>
        <pre className="dmCode">{exportJson}</pre>
      </section>
    </div>
  );
}

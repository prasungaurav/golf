import React, { useState, useEffect } from "react";
import "../style/Rules.css";

// --- Sub-components for better organization ---

const Keyword = ({ children, tooltip }) => (
  <span className="keyword-tag" title={tooltip}>
    {children}
  </span>
);

const RuleCard = ({ title, icon, description, detail, isExpanded, onToggle }) => (
  <div className={`rule-card ${isExpanded ? 'expanded' : ''}`} onClick={onToggle}>
    <span className="icon">{icon}</span>
    <div className="card-header-row">
      <h4>{title}</h4>
      <i className="material-icons expand-icon">{isExpanded ? 'expand_less' : 'expand_more'}</i>
    </div>
    <p className="summary">{description}</p>
    {isExpanded && (
      <div className="extra-detail animate-fade-in">
        <hr />
        <p>{detail}</p>
      </div>
    )}
  </div>
);

const Quiz = ({ question, options, correctAnswer, onComplete }) => {
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null); // 'correct' | 'wrong'

  const handleCheck = () => {
    if (selected === correctAnswer) {
      setStatus('correct');
      setTimeout(() => onComplete(), 1500);
    } else {
      setStatus('wrong');
    }
  };

  return (
    <div className={`quiz-box ${status}`}>
      <h5>⚡ Mini Quiz: Check your knowledge!</h5>
      <p>{question}</p>
      <div className="quiz-options">
        {options.map((opt, i) => (
          <button 
            key={i} 
            className={`opt-btn ${selected === i ? 'selected' : ''}`}
            onClick={() => { setSelected(i); setStatus(null); }}
          >
            {opt}
          </button>
        ))}
      </div>
      <button className="check-btn" onClick={handleCheck} disabled={selected === null}>
        {status === 'correct' ? '✅ Correct!' : status === 'wrong' ? '❌ Try Again' : 'Check Answer'}
      </button>
    </div>
  );
};

// --- Main Categories Data ---

const CATEGORIES = [
  { id: "basics", name: "Basics", icon: "⛳" },
  { id: "swing", name: "The Swing", icon: "🏌️" },
  { id: "oncourse", name: "On Course", icon: "🌳" },
  { id: "etiquette", name: "Etiquette", icon: "🤝" },
  { id: "videos", name: "Tutorials", icon: "📺" },
];

export default function Rules() {
  const [activeTab, setActiveTab] = useState("basics");
  const [viewed, setViewed] = useState(() => {
    const saved = localStorage.getItem("golf_rules_progress");
    return saved ? JSON.parse(saved) : { basics: false, swing: false, oncourse: false, etiquette: false, videos: false };
  });
  const [expandedId, setExpandedId] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    localStorage.setItem("golf_rules_progress", JSON.stringify(viewed));
  }, [viewed]);

  const markViewed = (id) => {
    if (!viewed[id]) setViewed(prev => ({ ...prev, [id]: true }));
  };

  const progressCount = Object.values(viewed).filter(Boolean).length;
  const progressPercent = (progressCount / CATEGORIES.length) * 100;

  return (
    <div className="rules-page">
      <header className="rules-header">
        <div className="badge-featured">GOLF ACADEMY</div>
        <h1>Golf Masterclass</h1>
        <p>Your comprehensive guide to mastering the game, from basic rules to professional techniques.</p>
        
        <div className="progress-container">
          <div className="progress-info">
            <span>Overall Completion</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </header>

      <div className="rules-tabs">
        {CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            className={`rules-tab ${activeTab === cat.id ? "active" : ""}`}
            onClick={() => { setActiveTab(cat.id); markViewed(cat.id); }}
          >
            <span style={{ marginRight: 8 }}>{cat.icon}</span>
            {cat.name}
            {viewed[cat.id] && <i className="material-icons check-done">check_circle</i>}
          </button>
        ))}
      </div>

      <div className="tab-content-wrapper animate-slide-up" key={activeTab}>
        {activeTab === 'basics' && (
          <div className="learning-grid">
            <div className="learning-image">
              <img src="/images/golf_basics.png" alt="Golf Basics" />
              <div className="img-caption">Visual Guide: Anatomy of a Hole</div>
            </div>
            <div className="content-body">
              <div className="section-title-wrap">
                <span className="section-num">01</span>
                <h2>Master the Fundamentals</h2>
              </div>
              
              <div className="content-section">
                <h3><i className="material-icons">info</i> The Objective</h3>
                <p>Golf is played by hitting a ball with a club from the <Keyword tooltip="The starting area for each hole">Teeing Ground</Keyword> into the hole by a <Keyword tooltip="An act of hitting the ball">Stroke</Keyword> or successive strokes in accordance with the Rules.</p>
              </div>

              <div className="rule-cards">
                <RuleCard 
                  title="Par" icon="🎯"
                  description="Standard strokes for a hole."
                  detail="The number of strokes an expert golfer is expected to need to complete the hole. Most holes are Par 3, 4, or 5."
                  isExpanded={expandedId === 'par'}
                  onToggle={() => setExpandedId(expandedId === 'par' ? null : 'par')}
                />
                <RuleCard 
                  title="Birdie" icon="🐦"
                  description="One under par (-1)."
                  detail="A fantastic result! Taking one fewer stroke than the hole's par rating."
                  isExpanded={expandedId === 'birdie'}
                  onToggle={() => setExpandedId(expandedId === 'birdie' ? null : 'birdie')}
                />
              </div>

              <Quiz 
                question="If you complete a Par 4 hole in 3 strokes, what is your score called?"
                options={["Birdie", "Eagle", "Bogey", "Par"]}
                correctAnswer={0}
                onComplete={() => {}} 
              />
            </div>
          </div>
        )}

        {activeTab === 'swing' && (
          <div className="learning-grid">
            <div className="learning-image">
              <img src="/images/golf_swing.png" alt="Golf Swing Guide" />
            </div>
            <div className="content-body">
              <div className="section-title-wrap">
                <span className="section-num">02</span>
                <h2>The Perfect Swing</h2>
              </div>
              <div className="content-section">
                <h3><i className="material-icons">front_hand</i> The Grip</h3>
                <p>The foundation of every good swing. A proper grip allows for maximum clubhead speed and directional control.</p>
              </div>
              
              <div className="instruction-box">
                <div className="inst-step">
                  <span className="step-count">1</span>
                  <p><strong>Setup:</strong> Stand balanced with feet shoulder-width apart.</p>
                </div>
                <div className="inst-step">
                  <span className="step-count">2</span>
                  <p><strong>Backswing:</strong> Rotate your torso while keeping your lead arm straight.</p>
                </div>
                <div className="inst-step">
                  <span className="step-count">3</span>
                  <p><strong>Impact:</strong> Strike the ball with a squared clubface for accuracy.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'oncourse' && (
          <div className="learning-grid">
            <div className="learning-image">
              <img src="/images/golf_basics.png" alt="On Course Rules" />
            </div>
            <div className="content-body">
              <div className="section-title-wrap">
                <span className="section-num">03</span>
                <h2>Rules of the Course</h2>
              </div>
              
              <div className="rule-cards">
                <RuleCard 
                  title="Out of Bounds" icon="⚠️"
                  description="Marked by white stakes."
                  detail="If your ball goes OB, you take a 'Stroke and Distance' penalty. You must add 1 penalty stroke and play again from your previous spot."
                  isExpanded={expandedId === 'ob'}
                  onToggle={() => setExpandedId(expandedId === 'ob' ? null : 'ob')}
                />
                <RuleCard 
                  title="Penalty Areas" icon="💧"
                  description="Marked by red/yellow stakes."
                  detail="You can play the ball as it lies without penalty, or take relief options with a 1-stroke penalty."
                  isExpanded={expandedId === 'penalty'}
                  onToggle={() => setExpandedId(expandedId === 'penalty' ? null : 'penalty')}
                />
              </div>

              <Quiz 
                question="What color stakes typically mark a Penalty Area where you can take lateral relief?"
                options={["White", "Red", "Blue", "Black"]}
                correctAnswer={1}
                onComplete={() => {}} 
              />
            </div>
          </div>
        )}

        {activeTab === 'etiquette' && (
          <div className="learning-grid">
            <div className="learning-image">
              <img src="/images/golf_etiquette.png" alt="Golf Etiquette" />
            </div>
            <div className="content-body">
              <div className="section-title-wrap">
                <span className="section-num">04</span>
                <h2>Spirit of the Game</h2>
              </div>
              <div className="info-strip">
                <i className="material-icons">timer</i>
                <span><strong>Pro Tip:</strong> Aim to complete 18 holes in under 4 hours and 15 minutes.</span>
              </div>
              <div className="content-section">
                <h3><i className="material-icons">groups</i> Pace of Play</h3>
                <p>Keep up with the group in front. Be ready to play when it's your turn. Ready golf is encouraged in social play.</p>
              </div>
              <div className="content-section">
                <h3><i className="material-icons">cleaning_services</i> Course Care</h3>
                <p>Always rake bunkers, replace divots, and repair ball marks on the green to keep the course in top condition for others.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="content-body" style={{ width: '100%' }}>
            <h2>Masterclass Video Library</h2>
            <div className="video-grid">
              {[
                { id: 1, title: "Getting Started: Basics", dur: "12:45", level: "Beginner", thumb: "/images/golf_basics.png" },
                { id: 2, title: "Perfecting Your Drive", dur: "08:30", level: "Advanced", thumb: "/images/golf_swing.png" },
                { id: 3, title: "Etiquette & Conduct", dur: "05:20", level: "All Levels", thumb: "/images/golf_etiquette.png" },
              ].map(v => (
                <div key={v.id} className="video-card" onClick={() => setActiveVideo(v)}>
                  <div className="video-thumb">
                    <img src={v.thumb} alt={v.title} />
                    <div className="play-overlay"><i className="material-icons">play_circle_filled</i></div>
                  </div>
                  <div className="video-info">
                    <h4>{v.title}</h4>
                    <div className="video-meta">
                      <span>{v.dur}</span>
                      <span className="dot">•</span>
                      <span>{v.level}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {activeVideo && (
        <div className="video-modal-overlay" onClick={() => setActiveVideo(null)}>
          <div className="video-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setActiveVideo(null)}>×</button>
            <div className="video-player-placeholder">
              <div className="player-ui">
                <i className="material-icons">play_circle_outline</i>
                <p>Streaming <strong>{activeVideo.title}</strong></p>
                <div className="player-controls">
                  <div className="play-bar-bg"><div className="play-bar-fill" style={{width: '60%'}}></div></div>
                  <div className="control-icons">
                    <i className="material-icons">replay_10</i>
                    <i className="material-icons">play_arrow</i>
                    <i className="material-icons">forward_30</i>
                    <i className="material-icons">volume_up</i>
                    <i className="material-icons">settings</i>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-desc">
              <h3>{activeVideo.title}</h3>
              <p>Learn the key concepts of {activeVideo.title.toLowerCase()} in this expert-led masterclass. Focus on position, timing, and execution.</p>
            </div>
          </div>
        </div>
      )}

      <div className="footer-cta" style={{ textAlign: 'center', marginTop: 80 }}>
        <button className="primaryBtn large" onClick={() => window.location.href='/tournaments'}>Apply Your Knowledge Now</button>
      </div>
    </div>
  );
}

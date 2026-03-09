import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import './LandingPage.css';

/* ── Animated counter hook ─────────────────────────── */
function useCountUp(end, duration = 2000, startOnView = false, ref = null) {
  const [count, setCount] = useState(0);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const started = startOnView ? inView : true;

  useEffect(() => {
    if (!started) return;
    let raf;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, started]);

  return count;
}

/* ── Stat card ─────────────────────────────────────── */
function StatCard({ icon, value, suffix = '', label, delay }) {
  const ref = useRef(null);
  const count = useCountUp(value, 2200, true, ref);
  return (
    <motion.div
      ref={ref}
      className="stat-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
    >
      <span className="stat-icon">{icon}</span>
      <span className="stat-number">{count.toLocaleString()}{suffix}</span>
      <span className="stat-label">{label}</span>
    </motion.div>
  );
}

/* ── Step card ─────────────────────────────────────── */
function StepCard({ number, icon, title, desc, delay }) {
  return (
    <motion.div
      className="step-card"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="step-number">{number}</div>
      <span className="step-icon">{icon}</span>
      <h3 className="step-title">{title}</h3>
      <p className="step-desc">{desc}</p>
    </motion.div>
  );
}

/* ── Fade-up wrapper ───────────────────────────────── */
function FadeUp({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark' ||
      localStorage.getItem('theme') === 'dark';
  });

  // Secret admin shortcut: Ctrl+Shift+A
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate('/auth?admin=true');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleFaq = (index) => setOpenFaq(openFaq === index ? null : index);

  return (
    <div className="landing-page">
      {/* Dark / light toggle */}
      <button
        className="theme-toggle"
        onClick={() => setDarkMode((d) => !d)}
        aria-label="Toggle dark mode"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      {/* ─── HERO ─────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-gradient" />
        <div className="hero-grid-bg" />
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <span className="hero-badge">🛡️ Community-Powered Safety</span>
          <h1 className="hero-title">
            Make Your City{' '}
            <span className="text-gradient">Safer</span>
          </h1>
          <p className="hero-description">
            Report potholes, garbage, and safety issues. Track with heat maps.
            Vote on community issues. Emergency SOS with location sharing.
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn-hero">
              Get Started Free <span className="btn-arrow">→</span>
            </Link>
            <Link to="/live" className="btn-hero-outline">
              View Live Map
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── STATS ────────────────────────────────── */}
      <section className="stats-section">
        <div className="stats-grid">
          <StatCard icon="📍" value={500} suffix="+" label="Issues Reported" delay={0} />
          <StatCard icon="👥" value={1200} suffix="+" label="Active Citizens" delay={0.1} />
          <StatCard icon="✅" value={340} suffix="+" label="Issues Resolved" delay={0.2} />
          <StatCard icon="🏙️" value={25} suffix="+" label="Cities Covered" delay={0.3} />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────── */}
      <section className="steps-section">
        <FadeUp>
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Three simple steps to a cleaner, safer neighbourhood</p>
        </FadeUp>
        <div className="steps-grid">
          <StepCard number="1" icon="📍" title="Spot an Issue" desc="See a pothole, broken light, or garbage pile? Tap the map to mark it." delay={0.1} />
          <div className="step-connector" />
          <StepCard number="2" icon="📸" title="Report & Upload" desc="Choose a category, snap a photo, add a description, and submit." delay={0.2} />
          <div className="step-connector" />
          <StepCard number="3" icon="🗳️" title="Community Votes" desc="Others upvote your report. Top-voted issues get prioritised for action." delay={0.3} />
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────── */}
      <section className="features-section" id="features">
        <FadeUp>
          <h2 className="section-title">What You Can Do</h2>
          <p className="section-subtitle">Everything you need to make a difference</p>
        </FadeUp>
        <div className="features-grid">
          {[
            { icon: '📍', title: 'Map-Based Reporting', desc: 'Click map, add photo, submit issue. 11 categories, instant tracking.', link: '/auth', cta: 'Try it' },
            { icon: '🔥', title: 'Heat Maps', desc: 'See problem hotspots at a glance with real-time color-coded zones.', link: '/map', cta: 'View map' },
            { icon: '👥', title: 'Live Crowd Tracking', desc: 'See active users in real-time. Find safer, well-populated areas.', link: '/signup', cta: 'Join map' },
            { icon: '👍', title: 'Voting System', desc: 'Upvote issues to prioritise them. Community-driven decision making.', link: '/signup', cta: 'Start voting' },
            { icon: '🚨', title: 'Emergency SOS', desc: 'One-click emergency with GPS sharing, quick-dial, and Telegram alerts.', link: '/account', cta: 'Setup SOS' },
            { icon: '🔔', title: 'Instant Alerts', desc: 'Telegram notifications for emergencies. Keep your contacts informed.', link: '/signup', cta: 'Get alerts' },
          ].map((f, i) => (
            <FadeUp key={i} delay={i * 0.08}>
              <div className="feature-card">
                <span className="feature-card-icon">{f.icon}</span>
                <h3 className="feature-card-title">{f.title}</h3>
                <p className="feature-card-desc">{f.desc}</p>
                <Link to={f.link} className="feature-card-cta">{f.cta} →</Link>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ─── TRUST BADGES ─────────────────────────── */}
      <section className="trust-section">
        <FadeUp>
          <h2 className="section-title">Built With Trust</h2>
        </FadeUp>
        <div className="trust-grid">
          {[
            { icon: '🔒', title: 'Anonymous Reports', desc: 'No personal data attached to any report' },
            { icon: '🌐', title: 'Open Source', desc: 'Transparent code anyone can inspect' },
            { icon: '📱', title: 'Works Offline', desc: 'Installable PWA with offline support' },
            { icon: '⚡', title: 'Real-Time', desc: 'WebSocket-powered live updates' },
          ].map((b, i) => (
            <FadeUp key={i} delay={i * 0.08}>
              <div className="trust-badge">
                <span className="trust-icon">{b.icon}</span>
                <h4 className="trust-title">{b.title}</h4>
                <p className="trust-desc">{b.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────── */}
      <section className="faq-section" id="faq">
        <FadeUp>
          <h2 className="section-title">Frequently Asked Questions</h2>
        </FadeUp>
        <div className="faq-list">
          {[
            { q: 'How do I report an issue?', a: 'Click anywhere on the map → select category (pothole/garbage/safety) → upload photo (optional) → add description → submit. Report appears immediately.' },
            { q: 'What do the heat maps show?', a: 'Red = high concentration of reports. Yellow = medium. Green = low. Toggle between issue heat map and crowd density map in the map view.' },
            { q: 'How does voting work?', a: 'Click on any report marker → click upvote button. One vote per user per issue. Higher votes help authorities prioritize which issues to fix first.' },
            { q: 'Is the emergency SOS feature live?', a: 'Yes. Set up emergency contacts in your profile (including Telegram IDs). Press SOS button → your location is shared + emergency alert sent via Telegram.' },
            { q: 'Can I see who reported what?', a: 'No. Reports are anonymous by design. Only timestamps, categories, and vote counts are public.' },
          ].map((item, i) => (
            <FadeUp key={i} delay={i * 0.05}>
              <div className="faq-item">
                <button
                  className={`faq-question ${openFaq === i ? 'active' : ''}`}
                  onClick={() => toggleFaq(i)}
                >
                  <span>{item.q}</span>
                  <span className="faq-chevron">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <motion.div
                    className="faq-answer"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.25 }}
                  >
                    {item.a}
                  </motion.div>
                )}
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────── */}
      <section className="cta-section">
        <FadeUp>
          <div className="cta-card">
            <h2 className="cta-title">Ready to Make a Difference?</h2>
            <p className="cta-subtitle">Join the community keeping neighbourhoods safe and clean</p>
            <Link to="/signup" className="btn-hero">
              Get Started Free <span className="btn-arrow">→</span>
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ─── FOOTER ───────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand-col">
            <div className="footer-brand">
              <i className="bi bi-map-fill"></i> StreetSense
            </div>
            <p className="footer-tagline">Community-driven civic reporting for a better tomorrow</p>
          </div>
          <div className="footer-links-col">
            <h4>Platform</h4>
            <Link to="/live">Live Map</Link>
            <Link to="/signup">Sign Up</Link>
            <Link to="/login">Login</Link>
          </div>
          <div className="footer-links-col">
            <h4>About</h4>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} StreetSense. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
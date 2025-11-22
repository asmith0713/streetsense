import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  // Secret keyboard shortcut for admin access: Ctrl+Shift+A
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

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            CIVIC ISSUE REPORTING
            <span className="hero-subtitle-inline"> WITH REAL-TIME MAPS</span>
          </h1>
          <p className="hero-description">
            Report potholes, garbage, and safety issues. Track with heat maps. 
            Vote on community issues. Emergency SOS with location sharing.
          </p>
          <Link to="/auth" className="btn-hero">
            Start Reporting
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="features-title">WHAT WE BUILT</h2>
        <div className="features-list">
          <div className="feature-item">
            <div className="feature-left">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">📍</span>
              </div>
              <div>
                <h3 className="feature-heading">Map-Based Reporting</h3>
                <p className="feature-subheading">Click map, add photo, submit issue</p>
              </div>
            </div>
            <div className="feature-right">
              <ul className="feature-benefits">
                <li>Geolocation pinning with Leaflet.js</li>
                <li>Image upload and storage</li>
                <li>Issue categories (pothole, garbage, safety)</li>
                <li>MongoDB backend for persistence</li>
              </ul>
              <Link to="/auth" className="feature-cta">Try it <span>→</span></Link>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-left">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">🔥</span>
              </div>
              <div>
                <h3 className="feature-heading">Heat Maps</h3>
                <p className="feature-subheading">Density visualization of problem areas</p>
              </div>
            </div>
            <div className="feature-right">
              <ul className="feature-benefits">
                <li>Leaflet.heat plugin integration</li>
                <li>Real-time data aggregation</li>
                <li>Color-coded intensity zones</li>
                <li>Toggle layers on/off</li>
              </ul>
              <Link to="/map" className="feature-cta">View map <span>→</span></Link>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-left">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">👥</span>
              </div>
              <div>
                <h3 className="feature-heading">Live Crowd Tracking</h3>
                <p className="feature-subheading">See active users in real-time</p>
              </div>
            </div>
            <div className="feature-right">
              <ul className="feature-benefits">
                <li>User location sharing via Socket.IO</li>
                <li>Real-time position updates</li>
                <li>Crowd density heatmap layer</li>
                <li>Privacy-focused (no personal data)</li>
              </ul>
              <Link to="/auth" className="feature-cta">Join map <span>→</span></Link>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-left">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">👍</span>
              </div>
              <div>
                <h3 className="feature-heading">Voting System</h3>
                <p className="feature-subheading">Upvote to prioritize issues</p>
              </div>
            </div>
            <div className="feature-right">
              <ul className="feature-benefits">
                <li>One vote per user per issue</li>
                <li>Vote count tracked in database</li>
                <li>Sort by votes for prioritization</li>
                <li>Prevents fake reports</li>
              </ul>
              <Link to="/auth" className="feature-cta">Start voting <span>→</span></Link>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-left">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">🚨</span>
              </div>
              <div>
                <h3 className="feature-heading">Emergency SOS</h3>
                <p className="feature-subheading">One-click emergency with location share</p>
              </div>
            </div>
            <div className="feature-right">
              <ul className="feature-benefits">
                <li>Share GPS coordinates instantly</li>
                <li>Helpline numbers (Police, Fire, Ambulance)</li>
                <li>Emergency profile with medical info</li>
                {/* <li>Telegram notifications to contacts</li> */}
              </ul>
              <Link to="/auth" className="feature-cta">Setup profile <span>→</span></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <h2 className="testimonials-title">TECH STACK</h2>
        <div className="tech-stack-grid">
          <div className="tech-card">
            <h3>Frontend</h3>
            <ul>
              <li>React.js</li>
              <li>Leaflet.js + React-Leaflet</li>
              <li>Bootstrap 5</li>
              <li>Socket.IO Client</li>
            </ul>
          </div>

          <div className="tech-card">
            <h3>Backend</h3>
            <ul>
              <li>Node.js + Express</li>
              <li>MongoDB + Mongoose</li>
              <li>Socket.IO Server</li>
              <li>JWT Authentication</li>
            </ul>
          </div>

          <div className="tech-card">
            <h3>Features</h3>
            <ul>
              <li>Real-time WebSockets</li>
              <li>Geolocation API</li>
              <li>Image Upload</li>
              {/* <li>Telegram Bot API</li> */}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <h2 className="faq-title">HOW IT WORKS</h2>
        <div className="faq-list">
          <div className="faq-item">
            <button 
              className={`faq-question ${openFaq === 0 ? 'active' : ''}`}
              onClick={() => toggleFaq(0)}
            >
              <span>How do I report an issue?</span>
              <span className="faq-icon">{openFaq === 0 ? '−' : '+'}</span>
            </button>
            {openFaq === 0 && (
              <div className="faq-answer">
                Click anywhere on the map → select category (pothole/garbage/safety) → 
                upload photo (optional) → add description → submit. Report appears immediately.
              </div>
            )}
          </div>

          <div className="faq-item">
            <button 
              className={`faq-question ${openFaq === 1 ? 'active' : ''}`}
              onClick={() => toggleFaq(1)}
            >
              <span>What do the heat maps show?</span>
              <span className="faq-icon">{openFaq === 1 ? '−' : '+'}</span>
            </button>
            {openFaq === 1 && (
              <div className="faq-answer">
                Red = high concentration of reports. Yellow = medium. Green = low. 
                Toggle between issue heat map and crowd density map in the map view.
              </div>
            )}
          </div>

          <div className="faq-item">
            <button 
              className={`faq-question ${openFaq === 2 ? 'active' : ''}`}
              onClick={() => toggleFaq(2)}
            >
              <span>How does voting work?</span>
              <span className="faq-icon">{openFaq === 2 ? '−' : '+'}</span>
            </button>
            {openFaq === 2 && (
              <div className="faq-answer">
                Click on any report marker → click upvote button. One vote per user per issue. 
                Higher votes help authorities prioritize which issues to fix first.
              </div>
            )}
          </div>

          {/* <div className="faq-item">
            <button 
              className={`faq-question ${openFaq === 3 ? 'active' : ''}`}
              onClick={() => toggleFaq(3)}
            >
              <span>Is the emergency SOS feature live?</span>
              <span className="faq-icon">{openFaq === 3 ? '−' : '+'}</span>
            </button>
            {openFaq === 3 && (
              <div className="faq-answer">
                Yes. Set up emergency contacts in your profile (including Telegram IDs). 
                Press SOS button → your location is shared + emergency alert sent via Telegram.
              </div>
            )}
          </div> */}

          <div className="faq-item">
            <button 
              className={`faq-question ${openFaq === 4 ? 'active' : ''}`}
              onClick={() => toggleFaq(4)}
            >
              <span>Can I see who reported what?</span>
              <span className="faq-icon">{openFaq === 4 ? '−' : '+'}</span>
            </button>
            {openFaq === 4 && (
              <div className="faq-answer">
                No. Reports are anonymous by design. Only timestamps, categories, and vote counts are public.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <h2 className="final-cta-title">Built for Hackathon/Buildathon</h2>
        <p className="final-cta-subtitle">Full-stack civic reporting platform with real-time features</p>
        <Link to="/auth" className="btn-hero">
          Try the Demo
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-brand">
              <i className="bi bi-map-fill"></i> StreetSense
            </div>
            <p className="footer-tagline">Community-driven civic reporting for a better tomorrow</p>
          </div>
          <div className="footer-section">
            <h4>Platform</h4>
            <Link to="/map">Live Map</Link>
            <Link to="/auth">Sign Up</Link>
            <Link to="/auth">Login</Link>
          </div>
          <div className="footer-section">
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
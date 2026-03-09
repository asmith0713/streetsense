import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';

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
          <Link to="/signup" className="btn-hero">
            Start Reporting
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="features-title">WHAT YOU CAN DO</h2>
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
                <li>Tap anywhere on the map to report</li>
                <li>Attach photo evidence instantly</li>
                <li>11 issue categories to choose from</li>
                <li>All reports saved and tracked</li>
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
                <li>See problem hotspots at a glance</li>
                <li>Data updates in real-time</li>
                <li>Color-coded severity zones</li>
                <li>Switch between map layers</li>
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
                <li>See how many people are nearby</li>
                <li>Live position updates</li>
                <li>Find safer, well-populated areas</li>
                <li>Completely anonymous — no personal data</li>
              </ul>
              <Link to="/signup" className="feature-cta">Join map <span>→</span></Link>
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
                <li>Community-driven prioritization</li>
                <li>Most-voted issues rise to the top</li>
                <li>Helps filter out false reports</li>
              </ul>
              <Link to="/signup" className="feature-cta">Start voting <span>→</span></Link>
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
                <li>Share your GPS location instantly</li>
                <li>Quick-dial Police, Fire, Ambulance</li>
                <li>Store medical info & emergency contacts</li>
                <li>Instant Telegram alerts to your contacts</li>
              </ul>
              <Link to="/account" className="feature-cta">Setup profile <span>→</span></Link>
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
              <li>Telegram Bot API</li>
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

          <div className="faq-item">
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
          </div>

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
        <h2 className="final-cta-title">Make Your City Safer</h2>
        <p className="final-cta-subtitle">Join thousands reporting civic issues and keeping communities safe</p>
        <Link to="/signup" className="btn-hero">
          Get Started Free
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
            <Link to="/live">Live Map</Link>
            <Link to="/signup">Sign Up</Link>
            <Link to="/login">Login</Link>
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
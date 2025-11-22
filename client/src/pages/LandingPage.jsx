import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

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

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="badge">✨ Smarter Civic Engagement</div>
          <h1 className="hero-title">
            Make Your Neighborhood <br />
            <span className="text-gradient">Better, Together.</span>
          </h1>
          <p className="hero-subtitle">
            StreetSense empowers citizens to report issues, track resolutions, and visualize neighborhood safety data in real-time. Join the movement for better streets.
          </p>
          <div className="hero-actions">
            {/* Redirect to Auth instead of Map directly */}
            <Link to="/auth" className="btn-primary-lg">
              Get Started
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-num">500+</span>
              <span className="stat-label">Reports Filed</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-num">98%</span>
              <span className="stat-label">Verified</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-num">24/7</span>
              <span className="stat-label">Monitoring</span>
            </div>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="map-mockup">
            <div className="mockup-header">
              <div className="dot red"></div>
              <div className="dot yellow"></div>
              <div className="dot green"></div>
            </div>
            <div className="mockup-body">
              {/* Abstract representation of the map UI */}
              <div className="abstract-map">
                <div className="map-pin" style={{ top: '30%', left: '40%' }}>📍</div>
                <div className="map-pin" style={{ top: '60%', left: '70%' }}>🚧</div>
                <div className="map-pin" style={{ top: '50%', left: '20%' }}>💡</div>
                <div className="heat-blob"></div>
              </div>
              <div className="mockup-card">
                <div className="card-line title"></div>
                <div className="card-line desc"></div>
                <div className="card-btn"></div>
              </div>
            </div>
          </div>
          {/* Background decorative blobs */}
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <h2 className="section-title">Why StreetSense?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Interactive Mapping</h3>
            <p>Pinpoint potholes, garbage, and safety hazards with precise geolocation on our live community map.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Data Heatmaps</h3>
            <p>Visualize problem areas with intensity heatmaps to help authorities prioritize critical zones.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👍</div>
            <h3>Community Upvoting</h3>
            <p>Validate reports from your neighbors. Higher upvotes mean faster attention from city officials.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Admin Resolution</h3>
            <p>Dedicated admin tools to verify, track, and mark issues as resolved efficiently.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">StreetSense</div>
          <div className="footer-links">
            <Link to="/map">Map</Link>
            {/* <a href="#">About</a> */}
            {/* <a href="#">Privacy</a> */}
          </div>
          <div className="footer-copy">
            &copy; {new Date().getFullYear()} StreetSense Project. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
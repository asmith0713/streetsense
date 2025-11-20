import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import AdminPanel from './pages/AdminPanel';
import AuthPage from './pages/AuthPage'; 
import './index.css';
import './App.css';

function Navigation() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/auth'; 

  // Don't show the main navigation bar on the Auth page
  if (isAuth) return null; 

  // We change the header style based on whether we are on the landing page or app
  const headerStyle = isLanding 
    ? { position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', zIndex: 10 }
    : { background: '#0b5cff', color: 'white' };

  const brandStyle = isLanding ? { color: '#1a1a1a' } : { color: 'white' };
  const linkClass = isLanding ? 'nav-link-landing' : 'nav-link';

  return (
    <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', ...headerStyle }}>
      <div style={{ fontWeight: 700, fontSize: '1.2rem', ...brandStyle }}>StreetSense</div>
      <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Link to="/" className={linkClass}>Home</Link>
        <Link to="/map" className={linkClass}>Live Map</Link>
        <Link to="/admin" className={linkClass}>Admin</Link>
        {!isLanding && <Link to="/auth" className={linkClass}>Login</Link>}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <div className="app-container">
      <Navigation />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>
    </div>
  );
}
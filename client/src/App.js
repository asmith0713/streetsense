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

  if (isAuth) return null; 

  return (
    <nav className={`navbar navbar-expand-md ${isLanding ? 'navbar-dark fixed-top' : 'navbar-dark bg-primary shadow-sm'}`} 
         style={isLanding ? { backgroundColor: 'rgba(0,0,0,0.1)' } : {}}>
      <div className="container-fluid px-4">
        <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
          <i className="bi bi-map-fill me-2"></i> StreetSense
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-2">
            <li className="nav-item">
              <Link className="nav-link" to="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/map">Live Map</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/admin">Admin</Link>
            </li>
            {!isLanding && (
              <li className="nav-item ms-md-2">
                <Link to="/auth" className="btn btn-light btn-sm fw-semibold text-primary px-3">Login</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="app-container">
      <Navigation />
      <main className="flex-grow-1 d-flex flex-column position-relative overflow-hidden">
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
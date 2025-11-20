import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import AdminPanel from './pages/AdminPanel';
import AuthPage from './pages/AuthPage'; 
import './index.css';
import './App.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/auth'; 

  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('user_email');
    setIsLoggedIn(!!token);
    setUserEmail(email || '');
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    setIsLoggedIn(false);
    setUserEmail('');
    navigate('/');
  };

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
            {isLoggedIn ? (
              <>
                <li className="nav-item ms-md-2">
                  <span className="navbar-text text-white-50 small me-2">
                    <i className="bi bi-person-circle"></i> {userEmail.split('@')[0]}
                  </span>
                </li>
                <li className="nav-item">
                  <button 
                    onClick={handleLogout} 
                    className="btn btn-outline-light btn-sm fw-semibold px-3"
                  >
                    <i className="bi bi-box-arrow-right"></i> Logout
                  </button>
                </li>
              </>
            ) : !isLanding && (
              <li className="nav-item ms-md-2">
                <Link to="/auth" className="btn btn-light btn-sm fw-semibold text-primary px-3">
                  <i className="bi bi-box-arrow-in-right"></i> Login
                </Link>
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
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import AdminPanel from './pages/AdminPanel';
import AuthPage from './pages/AuthPage'; 
import ProfilePage from './pages/ProfilePage';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import './index.css';
import './App.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Check both token keys for backward compatibility
    return !!(localStorage.getItem('token') || localStorage.getItem('streetsense_token'));
  });
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('user_email') || '';
  });
  
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/auth'; 

  // Check authentication status on mount and when storage changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token') || localStorage.getItem('streetsense_token');
      const email = localStorage.getItem('user_email');
      setIsLoggedIn(!!token);
      setUserEmail(email || '');
    };

    // Check on mount
    checkAuth();

    // Listen for storage events (login/logout in other tabs)
    window.addEventListener('storage', checkAuth);
    
    // Custom event for same-tab updates
    window.addEventListener('authChange', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    // Clear all authentication tokens
    localStorage.removeItem('token');
    localStorage.removeItem('streetsense_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_picture');
    setIsLoggedIn(false);
    setUserEmail('');
    
    // Dispatch custom event for auth change
    window.dispatchEvent(new Event('authChange'));
    navigate('/');
  };

  if (isAuth) return null; 

  return (
    <nav className={`navbar navbar-expand-md ${isLanding ? 'navbar-landing fixed-top' : 'navbar-dark bg-primary shadow-sm'}`} 
         style={isLanding ? { backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } : {}}>
      <div className="container-fluid px-3 px-md-4">
        <Link className="navbar-brand fw-bold d-flex align-items-center brand-logo" to="/" 
              style={isLanding ? { color: '#111' } : {}}>
          <i className="bi bi-map-fill me-2 brand-icon"></i>
          <span className="brand-text">StreetSense</span>
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                style={isLanding ? { borderColor: '#ddd' } : {}}>
          <span className="navbar-toggler-icon" style={isLanding ? { filter: 'invert(1)' } : {}}></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-3">
            {isLanding && (
              <>
                <li className="nav-item">
                  <Link className="nav-link nav-link-landing" to="/map">Live Map</Link>
                </li>
                <li className="nav-item">
                  <Link to="/auth" className="btn-nav-signup">
                    Sign Up
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/auth" className="btn-nav-login">
                    Login
                  </Link>
                </li>
              </>
            )}
            {!isLanding && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/">Home</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/map">Live Map</Link>
                </li>
                {isLoggedIn && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/profile">
                      <i className="bi bi-person-circle me-1"></i> Profile
                    </Link>
                  </li>
                )}
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
                ) : (
                  <li className="nav-item ms-md-2">
                    <Link to="/auth" className="btn btn-light btn-sm fw-semibold text-primary px-3">
                      <i className="bi bi-box-arrow-in-right"></i> Login
                    </Link>
                  </li>
                )}
              </>
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
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <AdminPanel />
            </ProtectedAdminRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}
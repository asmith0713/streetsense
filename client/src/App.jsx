import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import AdminPanel from './pages/AdminPanel';
import AuthPage from './pages/AuthPage'; 
import ProfilePage from './pages/ProfilePage';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { getCookie, removeCookie } from './utils/cookies';
import './index.css';
import './App.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Check both token keys for backward compatibility
    return !!(getCookie('token') || localStorage.getItem('token') || localStorage.getItem('streetsense_token'));
  });
  const [userEmail, setUserEmail] = useState(() => {
    return getCookie('user_email') || localStorage.getItem('user_email') || '';
  });
  
  const isAuth = location.pathname === '/auth' || location.pathname === '/login' || location.pathname === '/signup'; 

  // Check authentication status on mount and when storage changes
  useEffect(() => {
    const checkAuth = () => {
      const token = getCookie('token') || localStorage.getItem('token') || localStorage.getItem('streetsense_token');
      const email = getCookie('user_email') || localStorage.getItem('user_email');
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
    removeCookie('token');
    removeCookie('user_id');
    removeCookie('user_email');
    
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

  // Styles for Transparent Header (All Pages)
  const navStyle = {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1030,
    border: 'none',
    boxShadow: 'none'
  };

  // Text colors - always use theme variables for dark mode compatibility
  // But user asked for black app name (in light mode context presumably)
  // We will use var(--foreground) which is black in light mode and white in dark mode
  const brandColor = 'var(--foreground)';
  const logoColor = '#8b5cf6'; // Purple as requested
  return (
    <nav className="navbar navbar-expand-md fixed-top" style={navStyle}>
      <div className="container-fluid px-3 px-md-4">
        <Link className="navbar-brand fw-bold d-flex align-items-center brand-logo" to="/" 
              style={{ color: brandColor }}>
          <i className="bi bi-map-fill me-2 brand-icon" style={{ color: logoColor }}></i>
          <span className="brand-text">StreetSense</span>
        </Link>
        
        <div className="d-flex align-items-center gap-2 order-md-last ms-auto ms-md-0">
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
        </div>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-3 me-3">
            <li className="nav-item">
              <Link className="nav-link fw-semibold" to="/live" style={{ color: 'var(--foreground)' }}>Live Map</Link>
            </li>
            {isLoggedIn ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link fw-semibold" to="/account" style={{ color: 'var(--foreground)' }}>
                    <i className="bi bi-person-circle me-1"></i> Account
                  </Link>
                </li>
                <li className="nav-item ms-md-2">
                  <span className="navbar-text small me-2" style={{ color: 'var(--muted-foreground)' }}>
                    {userEmail.split('@')[0]}
                  </span>
                </li>
                <li className="nav-item">
                  <button 
                    onClick={handleLogout} 
                    className="btn btn-sm fw-semibold px-3 btn-outline-dark"
                  >
                    <i className="bi bi-box-arrow-right"></i> Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link to="/signup" className="btn btn-primary btn-sm fw-semibold px-3 rounded-pill">
                    Sign Up
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/login" className="btn btn-outline-primary btn-sm fw-semibold px-3 rounded-pill">
                    Login
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const location = useLocation();
  const isMapPage = ['/map', '/live', '/reports'].includes(location.pathname);

  return (
    <div className="app-container">
      <Navigation />
      <main className={`flex-grow-1 d-flex flex-column position-relative ${isMapPage ? 'overflow-hidden' : 'overflow-auto'}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Authentication Routes */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          <Route path="/auth" element={<AuthPage />} /> {/* Legacy support */}
          
          {/* App Routes */}
          <Route path="/map" element={<MapPage />} />
          <Route path="/reports" element={<MapPage />} /> {/* Alias for map */}
          <Route path="/live" element={<MapPage />} /> {/* Alias for live map */}
          
          {/* User Routes */}
          <Route path="/account" element={<ProfilePage />} />
          <Route path="/account/profile" element={<ProfilePage />} />
          <Route path="/profile" element={<ProfilePage />} /> {/* Legacy support */}
          
          {/* Admin Routes - Hidden */}
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <AdminPanel />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedAdminRoute>
              <AdminPanel />
            </ProtectedAdminRoute>
          } />
          
          {/* 404 - Redirect to home */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </main>
    </div>
  );
}
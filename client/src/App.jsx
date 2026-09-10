import React, { useState, useEffect, Component } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import AdminPanel from './pages/AdminPanel';
import AuthPage from './pages/AuthPage'; 
import ProfilePage from './pages/ProfilePage';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { getCookie, removeCookie } from './utils/cookies';
import { getDeviceId } from './utils/deviceId';
import API from './api';
import './index.css';
import './App.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container d-flex flex-column align-items-center justify-content-center text-center">
          <h1 className="h3 fw-bold mb-2">Something went wrong</h1>
          <p className="text-muted mb-4" style={{ maxWidth: '32rem' }}>
            This page hit an unexpected error. Reloading usually fixes it.
          </p>
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
            <a className="btn btn-outline-secondary" href="/">Go to home</a>
          </div>
          {/* Details are for developers only - never shown to users in production. */}
          {import.meta.env.DEV && (
            <pre className="mt-4 text-start small" style={{ whiteSpace: 'pre-wrap', maxWidth: '60rem' }}>
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFound() {
  return (
    <div className="page-container d-flex flex-column align-items-center justify-content-center text-center">
      <h1 className="display-5 fw-bold mb-2">Page not found</h1>
      <p className="text-muted mb-4">That address doesn't exist on StreetSense.</p>
      <div className="d-flex gap-2">
        <Link to="/" className="btn btn-primary">Go to home</Link>
        <Link to="/live" className="btn btn-outline-secondary">Open the live map</Link>
      </div>
    </div>
  );
}

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
  const [scrolled, setScrolled] = useState(false);
  
  const isAuth = location.pathname === '/auth' || location.pathname === '/login' || location.pathname === '/signup';
  const isLanding = location.pathname === '/';

  // Scroll listener for glass navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // check initial position
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const handleLogout = async () => {
    // Deactivate all locations for this user (logout cleanup)
    try {
      await API.delete('/locations/mine', { data: { deviceId: getDeviceId() } });
    } catch (err) {
      console.error('Failed to deactivate locations on logout:', err);
    }

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

  // Styles for navbar — glass effect on scroll
  const navStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1030,
    border: 'none',
    transition: 'background 0.3s, box-shadow 0.3s, backdrop-filter 0.3s',
    ...(scrolled
      ? {
          background: 'var(--nav-glass, rgba(255,255,255,0.82))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 1px 12px rgba(0,0,0,0.08)',
        }
      : {
          background: 'transparent',
          boxShadow: 'none',
        }),
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

  // The saved theme is applied in index.html before first paint, so there is
  // nothing to do here on mount.

  return (
    <ErrorBoundary>
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
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
    </ErrorBoundary>
  );
}
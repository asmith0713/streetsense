// client/src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import API from '../api';
import { setCookie } from '../utils/cookies';
import Toast from '../components/Toast';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get('admin') === 'true';
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const showToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const validatePassword = (pwd) => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/\d/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (!isLogin && newPassword) {
      setPasswordError(validatePassword(newPassword));
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Handle admin login
    if (isAdminMode) {
      try {
        // Verify admin password
        await API.head('/reports/export', { 
          headers: { 'x-admin-password': adminPassword }
        });
        sessionStorage.setItem('streetsense_admin_pwd', adminPassword);
        showToast('Admin login successful!', 'success', 2000);
        setTimeout(() => navigate('/admin'), 600);
      } catch (err) {
        console.error('Admin auth error:', err);
        const errorMsg = err.response?.status === 401 
          ? 'Invalid admin password. Access denied.' 
          : 'Failed to verify admin credentials. Please try again.';
        showToast(errorMsg, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Handle regular user login/register
    // Validate password for registration
    if (!isLogin) {
      const validationError = validatePassword(password);
      if (validationError) {
        showToast(validationError, 'error');
        setLoading(false);
        return;
      }
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await API.post(endpoint, { email, password });
      
      // Store authentication data with consistent keys
      setCookie('token', res.data.token);
      setCookie('user_id', res.data.user.id);
      setCookie('user_email', res.data.user.email);

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('streetsense_token', res.data.token);
      localStorage.setItem('user_id', res.data.user.id);
      localStorage.setItem('user_email', res.data.user.email);
      if (res.data.user.name) localStorage.setItem('user_name', res.data.user.name);
      if (res.data.user.picture) localStorage.setItem('user_picture', res.data.user.picture);
      
      // Dispatch custom event to update navigation
      window.dispatchEvent(new Event('authChange'));
      
      // Show success toast briefly before navigating
      showToast(isLogin ? 'Login successful!' : 'Account created successfully!', 'success', 2000);
      setTimeout(() => navigate('/map'), 600);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Authentication failed. Please try again.';
      showToast(errorMsg, 'error');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const res = await API.post('/auth/google', {
        credential: credentialResponse.credential
      });

      // Store authentication data with consistent keys
      setCookie('token', res.data.token);
      setCookie('user_id', res.data.user.id);
      setCookie('user_email', res.data.user.email);

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('streetsense_token', res.data.token);
      localStorage.setItem('user_id', res.data.user.id);
      localStorage.setItem('user_email', res.data.user.email);
      if (res.data.user.name) localStorage.setItem('user_name', res.data.user.name);
      if (res.data.user.picture) localStorage.setItem('user_picture', res.data.user.picture);

      // Dispatch custom event to update navigation
      window.dispatchEvent(new Event('authChange'));

      // Show success toast briefly before navigating
      showToast('Successfully logged in with Google!', 'success', 2000);
      setTimeout(() => navigate('/map'), 600);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Google authentication failed. Please try again.';
      showToast(errorMsg, 'error');
      console.error('Google auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google Sign-In failed');
    showToast('Google Sign-In failed. Please try again.', 'error');
  };

  return (
    <>
      <div className="position-fixed start-50 translate-middle-x" style={{ top: '20px', zIndex: 9999, width: '90%', maxWidth: '500px' }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
              duration={toast.duration}
            />
          ))}
        </AnimatePresence>
      </div>
      <div className="page-container auth-page-bg d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-5"
        style={{ width: '100%', maxWidth: '450px' }}
      >
        <div className="text-center mb-4">
          <div className="auth-icon-circle d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3">
            {isAdminMode ? <Shield size={32} className="text-primary" /> : <LogIn size={32} className="text-primary" />}
          </div>
          <h2 className="fw-bold mb-1">{isAdminMode ? 'Admin Access' : (isLogin ? 'Welcome Back' : 'Create Account')}</h2>
          <p className="text-muted small">
            {isAdminMode 
              ? 'Enter secure credentials to continue' 
              : (isLogin ? 'Enter your details to access your account' : 'Join the community to start reporting')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isAdminMode ? (
            <div className="mb-4">
              <label className="form-label small fw-bold text-muted">Admin Password</label>
              <input
                type="password"
                className="input-modern"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>
          ) : (
            <>
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">Email Address</label>
                <input
                  type="email"
                  className="input-modern"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">Password</label>
                {!isLogin && (
                  <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: '0.85rem', borderRadius: '8px', backgroundColor: 'rgba(13, 110, 253, 0.1)', border: '1px solid rgba(13, 110, 253, 0.2)' }}>
                    <div className="d-flex align-items-start">
                      <span className="me-2" style={{ fontSize: '1rem' }}>ℹ️</span>
                      <div>
                        <strong className="d-block mb-1">Password Requirements:</strong>
                        <small className={`d-block ${password.length >= 8 ? 'text-success fw-bold' : 'text-muted'}`}>
                          {password.length >= 8 ? '✓' : '○'} Minimum 8 characters
                        </small>
                        <small className={`d-block ${/\d/.test(password) ? 'text-success fw-bold' : 'text-muted'}`}>
                          {/\d/.test(password) ? '✓' : '○'} At least 1 number (0-9)
                        </small>
                        <small className={`d-block ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-success fw-bold' : 'text-muted'}`}>
                          {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'} At least 1 special character (!@#$%^&*...)
                        </small>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  type="password"
                  className={`input-modern ${passwordError && !isLogin ? 'is-invalid' : ''}`}
                  placeholder={isLogin ? '••••••••' : 'Create a strong password'}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn-primary-modern w-100 mb-3"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ) : (
              <>
                {isAdminMode ? 'Access Dashboard' : (isLogin ? 'Sign In' : 'Create Account')}
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {!isAdminMode && (
            <>
              <div className="position-relative mb-4">
                <hr className="text-muted" />
                <span className="position-absolute top-50 start-50 translate-middle px-2 bg-card text-muted small">OR</span>
              </div>

              <div className="d-flex justify-content-center mb-4">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_blue"
                  shape="pill"
                  size="large"
                  width="300"
                />
              </div>

              <div className="text-center">
                <p className="text-muted small mb-0">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none fw-bold"
                    onClick={() => setIsLogin(!isLogin)}
                    style={{ color: 'var(--primary)' }}
                  >
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </div>
            </>
          )}
        </form>
        
        <div className="text-center mt-4">
          <Link to="/" className="text-muted text-decoration-none small d-inline-flex align-items-center gap-1">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
    </>
  );
}
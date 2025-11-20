// client/src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import API from '../api';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await API.post(endpoint, { email, password });
      
      // Store authentication data
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user_id', res.data.user.id);
      localStorage.setItem('user_email', res.data.user.email);
      if (res.data.user.name) localStorage.setItem('user_name', res.data.user.name);
      if (res.data.user.picture) localStorage.setItem('user_picture', res.data.user.picture);
      
      // Dispatch custom event to update navigation
      window.dispatchEvent(new Event('authChange'));
      
      // Show success message
      const action = isLogin ? 'logged in' : 'registered';
      console.log(`Successfully ${action}!`);
      
      // Navigate to map
      navigate('/map');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Authentication failed. Please try again.';
      alert(errorMsg);
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

      // Store authentication data
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user_id', res.data.user.id);
      localStorage.setItem('user_email', res.data.user.email);
      if (res.data.user.name) localStorage.setItem('user_name', res.data.user.name);
      if (res.data.user.picture) localStorage.setItem('user_picture', res.data.user.picture);

      // Dispatch custom event to update navigation
      window.dispatchEvent(new Event('authChange'));

      console.log('Successfully logged in with Google!');
      navigate('/map');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Google authentication failed. Please try again.';
      alert(errorMsg);
      console.error('Google auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google Sign-In failed');
    alert('Google Sign-In failed. Please try again.');
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="text-center mb-4">
              <h1 className="h3 fw-bold text-primary"><i className="bi bi-map-fill"></i> StreetSense</h1>
            </div>
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <h2 className="h4 mb-1">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                  <p className="text-muted small">{isLogin ? 'Sign in to continue' : 'Join to report issues'}</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Email Address</label>
                    <input 
                      type="email" 
                      className="form-control form-control-lg"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="name@example.com"
                      required 
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold">Password</label>
                    <input 
                      type="password" 
                      className="form-control form-control-lg"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      required 
                      minLength={6}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg w-100 mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <span><span className="spinner-border spinner-border-sm me-2"></span>Loading...</span>
                    ) : (
                      isLogin ? 'Sign In' : 'Create Account'
                    )}
                  </button>
                </form>

                <div className="position-relative my-4">
                  <hr className="border-secondary" />
                  <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">
                    OR
                  </span>
                </div>

                <div className="d-flex justify-content-center mb-3">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap
                    text={isLogin ? 'signin_with' : 'signup_with'}
                    shape="rectangular"
                    size="large"
                    width="100%"
                  />
                </div>

                <div className="text-center mt-3">
                  <p className="small text-muted mb-0">
                    {isLogin ? "New here? " : "Already have an account? "}
                    <button 
                      className="btn btn-link btn-sm p-0 text-decoration-none fw-bold"
                      onClick={() => setIsLogin(!isLogin)}
                    >
                      {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center mt-4">
              <Link to="/" className="text-muted text-decoration-none small"><i className="bi bi-arrow-left"></i> Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
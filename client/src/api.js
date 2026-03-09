// client/src/api.js

import axios from 'axios';
import { getCookie } from './utils/cookies';

// Use env var or auto-detect based on current URL
// In production with Nginx: API is at same domain (proxied via /api)
// In development: API is at localhost:5000
const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();
const hasExplicitBackend = envBackendUrl && envBackendUrl !== 'undefined' && envBackendUrl !== 'null';

export const BACKEND_URL = hasExplicitBackend
  ? envBackendUrl
  : (window.location.hostname === 'localhost'
      ? 'http://localhost:5000'
      : `${window.location.protocol}//${window.location.hostname}`);

const API = axios.create({ baseURL: `${BACKEND_URL}/api` });

// Add token to all requests if available
API.interceptors.request.use(
  (config) => {
    const token = getCookie('token') || localStorage.getItem('token') || localStorage.getItem('streetsense_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-clear tokens or redirect - let components handle it
      // This prevents false logouts when navigating to profile
    }
    return Promise.reject(error);
  }
);

export default API;
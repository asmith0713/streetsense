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

export const ADMIN_TOKEN_KEY = 'streetsense_admin_token';

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function setAdminToken(token) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

/** Request config that authenticates as the moderator rather than the user. */
export function adminRequest(config = {}) {
  return {
    ...config,
    headers: { ...(config.headers || {}), Authorization: `Bearer ${getAdminToken()}` }
  };
}

// Add the user token unless the caller supplied their own Authorization
// header (admin requests carry a separate, short-lived token).
API.interceptors.request.use(
  (config) => {
    if (config.headers?.Authorization) return config;

    const token = getCookie('token') || localStorage.getItem('token') || localStorage.getItem('streetsense_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;

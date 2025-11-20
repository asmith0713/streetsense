// client/src/api.js

import axios from 'axios';

// Use env var or window location logic, falling back to localhost for dev
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const API = axios.create({ baseURL: `${BACKEND_URL}/api` });

// Add token to all requests if available
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
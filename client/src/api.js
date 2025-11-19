// client/src/api.js

import axios from 'axios';

// Use env var or window location logic, falling back to localhost for dev
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const API = axios.create({ baseURL: `${BACKEND_URL}/api` });
export default API;
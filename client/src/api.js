import axios from 'axios';
export const BACKEND_URL = 'http://localhost:5000';
const API = axios.create({ baseURL: `${BACKEND_URL}/api` });
export default API;

// URL Configuration for Production-Grade Routing
// This ensures consistent URLs across the application

export const ROUTES = {
  // Public Routes
  HOME: '/',
  
  // Authentication
  LOGIN: '/login',
  SIGNUP: '/signup',
  AUTH: '/auth', // Legacy support
  
  // Main App
  LIVE_MAP: '/live',
  MAP: '/map', // Alias
  REPORTS: '/reports', // Alias
  
  // User Account
  ACCOUNT: '/account',
  ACCOUNT_PROFILE: '/account/profile',
  PROFILE: '/profile', // Legacy support
  
  // Admin (Hidden)
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
};

// Helper function to build URLs with query parameters
export const buildUrl = (path, params = {}) => {
  const url = new URL(path, window.location.origin);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.pathname + url.search;
};

// Helper for admin login
export const getAdminLoginUrl = () => buildUrl(ROUTES.AUTH, { admin: 'true' });

// Helper for tracking links
export const getTrackingUrl = (lat, lng, zoom = 15) => 
  buildUrl(ROUTES.LIVE_MAP, { lat, lng, zoom });

// Helper to check if current path matches route
export const isCurrentRoute = (route) => {
  return window.location.pathname === route;
};

// SEO-friendly page titles
export const PAGE_TITLES = {
  [ROUTES.HOME]: 'StreetSense - Civic Issue Reporting Platform',
  [ROUTES.LOGIN]: 'Login - StreetSense',
  [ROUTES.SIGNUP]: 'Sign Up - StreetSense',
  [ROUTES.LIVE_MAP]: 'Live Map - Real-time Issues - StreetSense',
  [ROUTES.MAP]: 'Live Map - Real-time Issues - StreetSense',
  [ROUTES.REPORTS]: 'Reports - StreetSense',
  [ROUTES.ACCOUNT]: 'My Account - StreetSense',
  [ROUTES.PROFILE]: 'My Profile - StreetSense',
  [ROUTES.ADMIN]: 'Admin Dashboard - StreetSense',
};

// Update document title based on route
export const updatePageTitle = (route) => {
  document.title = PAGE_TITLES[route] || 'StreetSense';
};

export default ROUTES;

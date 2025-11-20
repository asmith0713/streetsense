export const REFRESH_INTERVAL = 15000; // 15 seconds
export const USER_LOCATION_RADIUS = 100; // meters
export const MAP_DEFAULT_ZOOM = 13;
export const MAP_TRACKING_ZOOM = 15;
export const MAX_REPORTS_LIMIT = 2000;

export const CATEGORIES = [
  'safety',
  'traffic',
  'water',
  'garbage',
  'noise',
  'stray',
  'other'
];

export const TIME_FILTERS = {
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000
};
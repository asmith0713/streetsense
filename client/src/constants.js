export const REFRESH_INTERVAL = 15000; // 15 seconds
export const MAP_DEFAULT_ZOOM = 13;
export const MAP_TRACKING_ZOOM = 15;
export const MAX_REPORTS_LIMIT = 2000;

// Fallback for the "you are here" circle when the browser reports no accuracy.
export const DEFAULT_LOCATION_ACCURACY_M = 100;

// Client-side throttle for location broadcasting. watchPosition fires far more
// often than this; sending every fix drains the battery and trips the server's
// rate limit.
export const LOCATION_MIN_INTERVAL_MS = 20000;
export const LOCATION_MIN_DISTANCE_M = 25;

/**
 * Single source of truth for report categories. Anything that filters, files
 * or exports reports reads this list, so the options can no longer drift apart.
 */
export const CATEGORIES = [
  { value: 'safety', label: 'Safety Hazard', short: 'Safety', emoji: '\u{1F6E1}\uFE0F' },
  { value: 'traffic', label: 'Traffic Issue', short: 'Traffic', emoji: '\u{1F697}' },
  { value: 'water', label: 'Water / Drainage', short: 'Water', emoji: '\u{1F4A7}' },
  { value: 'garbage', label: 'Garbage / Sanitation', short: 'Garbage', emoji: '\u{1F5D1}\uFE0F' },
  { value: 'noise', label: 'Noise Pollution', short: 'Noise', emoji: '\u{1F50A}' },
  { value: 'stray', label: 'Stray Animals', short: 'Stray', emoji: '\u{1F415}' },
  { value: 'harassment', label: 'Harassment', short: 'Harassment', emoji: '\u26A0\uFE0F', safety: true },
  { value: 'eve-teasing', label: 'Eve-Teasing', short: 'Eve-Teasing', emoji: '\u{1F6A8}', safety: true },
  { value: 'assault', label: 'Assault', short: 'Assault', emoji: '\u{1F198}', safety: true },
  { value: 'stalking', label: 'Stalking', short: 'Stalking', emoji: '\u{1F441}\uFE0F', safety: true },
  { value: 'other', label: 'Other', short: 'Other', emoji: '\u{1F4CC}' }
];

export const CATEGORY_VALUES = CATEGORIES.map(c => c.value);
export const SAFETY_CATEGORIES = CATEGORIES.filter(c => c.safety).map(c => c.value);
export const CATEGORY_FILTER_OPTIONS = CATEGORIES.map(c => ({
  value: c.value,
  label: `${c.emoji} ${c.short}`
}));

export const TIME_FILTERS = {
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000
};

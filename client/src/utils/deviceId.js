/**
 * Device ID utility for tracking locations across multiple devices
 * Generates a unique identifier for each device/browser instance
 */

const DEVICE_ID_KEY = 'streetsense_device_id';

/**
 * Generate a unique device ID using browser fingerprinting
 * Combines: user agent, language, timezone, screen resolution
 */
function generateDeviceId() {
  const data = {
    ua: navigator.userAgent,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: Date.now(),
    random: Math.random().toString(36).substr(2, 9)
  };
  
  const str = JSON.stringify(data);
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `device_${Math.abs(hash).toString(16)}_${data.random}`;
}

/**
 * Get or create device ID
 * Stores in localStorage to persist across sessions
 */
export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Clear device ID (useful for testing or factory reset)
 */
export function clearDeviceId() {
  localStorage.removeItem(DEVICE_ID_KEY);
}

/**
 * Regenerate device ID (creates new unique ID)
 */
export function regenerateDeviceId() {
  const newId = generateDeviceId();
  localStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}

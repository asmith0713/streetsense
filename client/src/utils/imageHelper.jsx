import { BACKEND_URL } from '../api';

export function resolveImageUrl(photoUrl) {
  if (!photoUrl) return null;
  
  photoUrl = photoUrl.trim();
  
  // Full URL
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Server paths
  if (photoUrl.startsWith('/uploads') || photoUrl.startsWith('/api/uploads')) {
    return `${BACKEND_URL}${photoUrl}`;
  }
  
  if (photoUrl.startsWith('uploads/')) {
    return `${BACKEND_URL}/${photoUrl}`;
  }
  
  // Ignore filesystem paths
  if (photoUrl.startsWith('/mnt/') || 
      photoUrl.startsWith('/var/') ||
      photoUrl.startsWith('C:\\') || 
      photoUrl.startsWith('D:\\') ||
      /^[A-Za-z]:[\\\/]/.test(photoUrl)) {
    console.warn('Ignoring server file system path:', photoUrl);
    return null;
  }
  
  // Default
  return `${BACKEND_URL}/${photoUrl.replace(/^\//, '')}`;
}
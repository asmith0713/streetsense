import { BACKEND_URL } from '../api';

export function resolveImageUrl(photoUrl) {
  if (!photoUrl) return null;
  
  photoUrl = photoUrl.trim();
  
  // Full URL (external images like Unsplash)
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // GridFS images served via /api/images/:id
  if (photoUrl.startsWith('/api/images/')) {
    return `${BACKEND_URL}${photoUrl}`;
  }
  
  // Legacy: Server paths for old uploads (before GridFS migration)
  if (photoUrl.startsWith('/uploads')) {
    return `${BACKEND_URL}${photoUrl}`;
  }
  
  if (photoUrl.startsWith('/api/uploads')) {
    return `${BACKEND_URL}${photoUrl.replace('/api', '')}`;
  }
  
  if (photoUrl.startsWith('uploads/')) {
    return `${BACKEND_URL}/${photoUrl}`;
  }
  
  // Ignore filesystem paths
  if (photoUrl.startsWith('/mnt/') || 
      photoUrl.startsWith('/var/') ||
      photoUrl.startsWith('C:\\') || 
      photoUrl.startsWith('D:\\') ||
      /^[A-Za-z]:[\\]/.test(photoUrl)) {
    return null;
  }
  
  // Default - assume it's a relative path
  return `${BACKEND_URL}/uploads/${photoUrl.replace(/^\//, '')}`;
}
import { BACKEND_URL } from '../api';

export function resolveImageUrl(photoUrl) {
  if (!photoUrl) return null;
  
  photoUrl = photoUrl.trim();
  
  // Full URL (external images like Unsplash)
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Server paths - construct URL based on BACKEND_URL
  // In production with Nginx proxy, BACKEND_URL is https://domain (no port)
  // Images are served at /uploads by Nginx
  if (photoUrl.startsWith('/uploads')) {
    return `${BACKEND_URL}${photoUrl}`;
  }
  
  if (photoUrl.startsWith('/api/uploads')) {
    // Remove /api prefix as uploads are served directly
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
    // console.warn('Ignoring server file system path:', photoUrl);
    return null;
  }
  
  // Default - assume it's a relative path to uploads
  return `${BACKEND_URL}/uploads/${photoUrl.replace(/^\//, '')}`;
}
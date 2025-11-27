import { BACKEND_URL } from '../api';

export function resolveImageUrl(photoUrl) {
  if (!photoUrl) return null;
  
  photoUrl = photoUrl.trim();
  
  // Full URL (external images like Unsplash)
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Server paths - always prepend BACKEND_URL
  if (photoUrl.startsWith('/uploads')) {
    const resolvedUrl = `${BACKEND_URL}${photoUrl}`;
    console.log('Image URL resolved:', photoUrl, '->', resolvedUrl);
    return resolvedUrl;
  }
  
  if (photoUrl.startsWith('/api/uploads')) {
    // Remove /api prefix as backend serves /uploads directly
    const resolvedUrl = `${BACKEND_URL}${photoUrl.replace('/api', '')}`;
    console.log('Image URL resolved (removed /api):', photoUrl, '->', resolvedUrl);
    return resolvedUrl;
  }
  
  if (photoUrl.startsWith('uploads/')) {
    const resolvedUrl = `${BACKEND_URL}/${photoUrl}`;
    console.log('Image URL resolved (relative):', photoUrl, '->', resolvedUrl);
    return resolvedUrl;
  }
  
  // Ignore filesystem paths
  if (photoUrl.startsWith('/mnt/') || 
      photoUrl.startsWith('/var/') ||
      photoUrl.startsWith('C:\\') || 
      photoUrl.startsWith('D:\\') ||
      /^[A-Za-z]:[\\]/.test(photoUrl)) {
    console.warn('Ignoring server file system path:', photoUrl);
    return null;
  }
  
  // Default - assume it's a relative path to uploads
  const resolvedUrl = `${BACKEND_URL}/uploads/${photoUrl.replace(/^\//, '')}`;
  console.log('Image URL resolved (default):', photoUrl, '->', resolvedUrl);
  return resolvedUrl;
}
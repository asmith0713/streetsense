import React, { useState } from 'react';
import API, { BACKEND_URL } from '../api';

export default function ReportCard({ report, onUpdated }) {
  const [upvotes, setUpvotes] = useState(report.upvotes || 0);
  const [status, setStatus] = useState(report.status || 'open');
  const [imageError, setImageError] = useState(false);

  function resolveImageUrl(photoUrl) {
    if (!photoUrl) return null;
    
    // Remove any leading/trailing whitespace
    photoUrl = photoUrl.trim();
    
    // If it's already a full URL, use it
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    
    // If it starts with /uploads or /api/uploads, append to BACKEND_URL
    if (photoUrl.startsWith('/uploads') || photoUrl.startsWith('/api/uploads')) {
      return `${BACKEND_URL}${photoUrl}`;
    }
    
    // If it starts with 'uploads' (no slash), add the slash
    if (photoUrl.startsWith('uploads/')) {
      return `${BACKEND_URL}/${photoUrl}`;
    }
    
    // Ignore absolute disk paths (server file system paths)
    if (photoUrl.startsWith('/mnt/') || 
        photoUrl.startsWith('/var/') ||
        photoUrl.startsWith('C:\\') || 
        photoUrl.startsWith('D:\\') ||
        /^[A-Za-z]:[\\\/]/.test(photoUrl)) {
      console.warn('Ignoring server file system path:', photoUrl);
      return null;
    }
    
    // Default: assume it's a relative path and append to BACKEND_URL
    return `${BACKEND_URL}/${photoUrl.replace(/^\//, '')}`;
  }

  const imageSrc = resolveImageUrl(report.photoUrl);

  async function handleUpvote() {
    try {
      const res = await API.post(`/reports/${report._id}/upvote`);
      setUpvotes(res.data.upvotes);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Upvote failed', err);
      alert('Failed to upvote');
    }
  }

  async function changeStatus(newStatus) {
    try {
      await API.put(`/reports/${report._id}/status`, { status: newStatus });
      setStatus(newStatus);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Status update failed', err);
      alert('Failed to change status');
    }
  }

  return (
    <div style={{ minWidth: 220 }}>
      <strong>{report.title}</strong>
      <div style={{ fontSize: 13, color: '#333', margin: '6px 0' }}>{report.description}</div>
      <div style={{ fontSize: 12, color: '#666' }}>Category: {report.category}</div>
      <div style={{ fontSize: 12, color: '#666' }}>Status: {status}</div>

      {imageSrc && !imageError ? (
        <div style={{ marginTop: 8 }}>
          <img 
            src={imageSrc} 
            alt="report" 
            style={{ width: '100%', borderRadius: 6, marginTop: 6 }}
            onError={(e) => {
              console.error('Failed to load image:', imageSrc);
              console.error('Original photoUrl:', report.photoUrl);
              setImageError(true);
            }}
          />
        </div>
      ) : report.photoUrl && imageError ? (
        <div style={{ 
          marginTop: 8, 
          padding: 10, 
          background: '#f0f0f0', 
          borderRadius: 6,
          fontSize: 12,
          color: '#666'
        }}>
          📷 Image unavailable
          <div style={{ fontSize: 10, marginTop: 4 }}>
            Path: {report.photoUrl}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={handleUpvote} className="btn">Upvote ({upvotes})</button>
        <button onClick={() => changeStatus('verified')} className="btn">Mark Verified</button>
        <button onClick={() => changeStatus('resolved')} className="btn">Mark Resolved</button>
      </div>
    </div>
  );
}
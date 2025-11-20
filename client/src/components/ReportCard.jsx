import React, { useState } from 'react';
import API from '../api';
import { resolveImageUrl } from '../utils/imageHelper';

export default function ReportCard({ report, onUpdated }) {
  const [upvotes, setUpvotes] = useState(report.upvotes || 0);
  const [status, setStatus] = useState(report.status || 'open');
  const [imageError, setImageError] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  

  const imageSrc = resolveImageUrl(report.photoUrl);

  async function handleUpvote() {
    if (upvoting) return; // Prevent double-click
    setUpvoting(true);
    try {
      const res = await API.post(`/reports/${report._id}/upvote`);
      setUpvotes(res.data.upvotes);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Upvote failed', err);
      alert('Failed to upvote');
    } finally {
      setUpvoting(false);
    }
  }

  async function changeStatus(newStatus) {
    if (changingStatus) return; // Prevent double-click
    setChangingStatus(true);
    try {
      await API.put(`/reports/${report._id}/status`, { status: newStatus });
      setStatus(newStatus);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Status update failed', err);
      alert('Failed to change status');
    } finally {
      setChangingStatus(false);
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
      <button onClick={handleUpvote} className="btn" disabled={upvoting}>{upvoting ? 'Upvoting...' : `Upvote (${upvotes})`}</button>
      <button onClick={() => changeStatus('verified')} className="btn" disabled={changingStatus}>Mark Verified</button>
      <button onClick={() => changeStatus('resolved')} className="btn" disabled={changingStatus}>Mark Resolved</button>
      </div>
    </div>
  );
}
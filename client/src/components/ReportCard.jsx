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

  const getStatusBadge = () => {
    const statusColors = {
      open: 'warning',
      verified: 'info',
      resolved: 'success'
    };
    return <span className={`badge bg-${statusColors[status] || 'secondary'} text-uppercase`}>{status}</span>;
  };

  return (
    <div style={{ minWidth: 220, maxWidth: 300 }}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <strong style={{ fontSize: 15 }}>{report.title}</strong>
        {getStatusBadge()}
      </div>
      {report.description && (
        <div style={{ fontSize: 13, color: '#555', marginBottom: 8, lineHeight: 1.4 }}>{report.description}</div>
      )}
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        <i className="bi bi-tag me-1"></i>
        <span className="badge bg-light text-dark">{report.category}</span>
      </div>

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

      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          onClick={handleUpvote}
          className="btn btn-sm btn-outline-primary"
          disabled={upvoting}
          style={{ flex: '1 1 auto' }}
        >
          <i className="bi bi-hand-thumbs-up me-1"></i>
          {upvoting ? '...' : upvotes}
        </button>
        <button
          onClick={() => changeStatus('verified')}
          className="btn btn-sm btn-outline-info"
          disabled={changingStatus}
          style={{ flex: '1 1 auto' }}
        >
          Verify
        </button>
        <button
          onClick={() => changeStatus('resolved')}
          className="btn btn-sm btn-outline-success"
          disabled={changingStatus}
          style={{ flex: '1 1 auto' }}
        >
          Resolve
        </button>
      </div>
    </div>
  );
}
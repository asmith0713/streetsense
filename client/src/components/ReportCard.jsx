import React, { useState } from 'react';
import API from '../api';
import { resolveImageUrl } from '../utils/imageHelper';

export default function ReportCard({ report, onUpdated }) {
  const [upvotes, setUpvotes] = useState(report.upvotes || 0);
  const [downvotes, setDownvotes] = useState(report.downvotes || 0);
  const status = report.status || 'open';
  const [imageError, setImageError] = useState(false);
  const [voting, setVoting] = useState(false);
  const [userVote, setUserVote] = useState(null); // 'up', 'down', or null

  const imageSrc = resolveImageUrl(report.photoUrl);

  async function handleVote(voteType) {
    if (voting) return; // Prevent double-click
    
    // Validate report ID
    if (!report._id || report._id === 'undefined') {
      console.error('Invalid report ID:', report._id);
      alert('Cannot vote: Invalid report ID');
      return;
    }
    
    // If user clicks same vote, remove their vote
    if (userVote === voteType) {
      return; // Already voted this way
    }

    setVoting(true);
    try {
      const endpoint = voteType === 'up' ? 'upvote' : 'downvote';
      const res = await API.post(`/reports/${report._id}/${endpoint}`);
      setUpvotes(res.data.upvotes || 0);
      setDownvotes(res.data.downvotes || 0);
      setUserVote(voteType);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(`${voteType}vote failed`, err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Network error';
      alert(`Failed to ${voteType}vote: ${errorMsg}`);
    } finally {
      setVoting(false);
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

  const netVotes = upvotes - downvotes;

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

      <div className="d-flex align-items-center gap-2 mt-3">
        <div className="btn-group" role="group">
          <button
            onClick={() => handleVote('up')}
            className={`btn btn-sm ${userVote === 'up' ? 'btn-primary' : 'btn-outline-primary'}`}
            disabled={voting}
            title="Upvote this report"
          >
            <i className="bi bi-hand-thumbs-up-fill"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-secondary disabled"
            style={{ minWidth: '50px', fontWeight: 'bold' }}
          >
            {netVotes}
          </button>
          <button
            onClick={() => handleVote('down')}
            className={`btn btn-sm ${userVote === 'down' ? 'btn-danger' : 'btn-outline-danger'}`}
            disabled={voting}
            title="Downvote this report"
          >
            <i className="bi bi-hand-thumbs-down-fill"></i>
          </button>
        </div>
      </div>

      <div className="small text-muted mt-2">
        <i className="bi bi-clock me-1"></i>
        {new Date(report.timestamp).toLocaleDateString()}
      </div>
    </div>
  );
}
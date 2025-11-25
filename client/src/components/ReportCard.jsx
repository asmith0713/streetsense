import React, { useState } from 'react';
import API from '../api';
import { resolveImageUrl } from '../utils/imageHelper';
import { ThumbsUp, ThumbsDown, Clock, Tag, Image as ImageIcon, AlertTriangle, CheckCircle } from 'lucide-react';

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
    const color = statusColors[status] || 'secondary';
    
    return (
      <span className={`badge bg-${color} text-uppercase d-flex align-items-center gap-1`} style={{fontSize: '0.7rem'}}>
        {status === 'open' && <AlertTriangle size={10} />}
        {status === 'verified' && <CheckCircle size={10} />}
        {status}
      </span>
    );
  };

  const netVotes = upvotes - downvotes;

  return (
    <div style={{ minWidth: 240, maxWidth: 320 }}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <strong className="text-truncate pe-2" style={{ fontSize: 15 }}>{report.title}</strong>
        {getStatusBadge()}
      </div>
      
      {report.description && (
        <div className="text-muted mb-2" style={{ fontSize: 13, lineHeight: 1.4 }}>
          {report.description}
        </div>
      )}
      
      <div className="d-flex align-items-center gap-1 text-muted mb-2" style={{ fontSize: 12 }}>
        <Tag size={12} />
        <span className="badge bg-secondary text-body border fw-normal">{report.category}</span>
      </div>

      {imageSrc && !imageError ? (
        <div className="mb-3">
          <img 
            src={imageSrc} 
            alt="report" 
            className="w-100 rounded object-fit-cover"
            style={{ height: '140px' }}
            onError={(e) => {
              console.error('Failed to load image:', imageSrc);
              setImageError(true);
            }}
          />
        </div>
      ) : report.photoUrl && imageError ? (
        <div className="mb-3 p-3 bg-secondary rounded text-center text-muted small">
          <ImageIcon size={20} className="mb-1 opacity-50" />
          <div>Image unavailable</div>
        </div>
      ) : null}

      <div className="d-flex align-items-center justify-content-between mt-2">
        <div className="btn-group shadow-sm" role="group">
          <button
            onClick={() => handleVote('up')}
            className={`btn btn-sm ${userVote === 'up' ? 'btn-primary' : 'btn-outline-primary'}`}
            disabled={voting}
            title="Upvote"
            style={{padding: '0.25rem 0.5rem'}}
          >
            <ThumbsUp size={14} />
          </button>
          <button
            className="btn btn-sm btn-light border disabled text-body fw-bold"
            style={{ minWidth: '40px', padding: '0.25rem 0.5rem' }}
          >
            {netVotes}
          </button>
          <button
            onClick={() => handleVote('down')}
            className={`btn btn-sm ${userVote === 'down' ? 'btn-danger' : 'btn-outline-danger'}`}
            disabled={voting}
            title="Downvote"
            style={{padding: '0.25rem 0.5rem'}}
          >
            <ThumbsDown size={14} />
          </button>
        </div>
        
        <div className="small text-muted d-flex align-items-center gap-1">
          <Clock size={12} />
          {new Date(report.timestamp).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
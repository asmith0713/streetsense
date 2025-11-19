import React, { useState } from 'react';
import API from '../api';

import { BACKEND_URL } from '../api';

export default function ReportCard({ report, onUpdated }) {
  const [upvotes, setUpvotes] = useState(report.upvotes || 0);
  const [status, setStatus] = useState(report.status || 'open');

  function resolveImageUrl(photoUrl) {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('/uploads') || photoUrl.startsWith('/api/uploads')) {
      return `${BACKEND_URL}${photoUrl}`;
    }
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    // ignore absolute disk paths
    if (photoUrl.startsWith('/mnt/') || /^[A-Za-z]:\\\\/.test(photoUrl)) return null;
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

      {imageSrc ? (
        <div style={{ marginTop: 8 }}>
          <img src={imageSrc} alt="report" style={{ width: '100%', borderRadius: 6, marginTop: 6 }} />
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={handleUpvote} className="btn">Upvote ({upvotes})</button>
        <button onClick={() => changeStatus('verified')} className="btn">Mark Verified</button>
        <button onClick={() => changeStatus('resolved')} className="btn">Mark Resolved</button>
      </div>
    </div>
  );
}

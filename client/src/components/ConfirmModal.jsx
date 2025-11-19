// client/src/components/ConfirmModal.jsx
import React from 'react';

export default function ConfirmModal({ open, title = 'Confirm', message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="modal" style={{ zIndex: 3000 }}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <h3>{title}</h3>
        <div style={{ margin: '8px 0 12px' }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onConfirm}>Yes, proceed</button>
        </div>
      </div>
    </div>
  );
}

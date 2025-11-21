// client/src/components/ConfirmModal.jsx
import React from 'react';

export default function ConfirmModal({ open, title = 'Confirm', message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div 
      className="modal" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={(e) => {
        if (e.target.className.includes('modal')) onCancel();
      }}
    >
      <div 
        className="modal-content bg-white rounded p-4 shadow" 
        style={{ maxWidth: '500px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3">{title}</h3>
        <div className="mb-4">{message}</div>
        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Yes, Remove</button>
        </div>
      </div>
    </div>
  );
}

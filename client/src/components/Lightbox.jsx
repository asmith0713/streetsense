// client/src/components/Lightbox.jsx
import React from 'react';

export default function Lightbox({ src, alt = '', open, onClose }) {
  if (!open) return null;
  return (
    <div className="modal" onClick={onClose} style={{ zIndex: 4000 }}>
      <div className="modal-content" style={{ maxWidth: 900, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <img src={src} alt={alt} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}

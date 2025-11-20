import React from 'react';

export default function CrowdLegend({ activeUserCount }) {
  return (
    <div 
      className="position-absolute bottom-0 end-0 mb-5 me-3 bg-white rounded shadow-sm p-3 z-2"
      style={{ maxWidth: '200px' }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
          <i className="bi bi-people-fill me-2 text-success"></i>
          Safety Map
        </h6>
      </div>
      
      <div className="small text-muted mb-2">
        Real-time crowd density
      </div>

      <div className="d-flex align-items-center gap-2 mb-2">
        <div className="d-flex flex-column gap-1 flex-grow-1">
          <div className="d-flex align-items-center gap-2">
            <div 
              style={{
                width: '30px',
                height: '12px',
                background: 'linear-gradient(to right, #0000ff, #00ff00, #ffff00, #ffa500, #00ff00)',
                border: '1px solid #dee2e6',
                borderRadius: '2px'
              }}
            />
            <span className="small text-muted">More people</span>
          </div>
        </div>
      </div>

      {activeUserCount !== undefined && (
        <div className="alert alert-success py-2 px-2 mb-0 mt-2" style={{ fontSize: '0.8rem' }}>
          <i className="bi bi-shield-check me-1"></i>
          <strong>{activeUserCount}</strong> people nearby
        </div>
      )}

      <div className="text-muted mt-2" style={{ fontSize: '0.7rem' }}>
        <i className="bi bi-info-circle me-1"></i>
        Green areas = More people = Safer
      </div>
    </div>
  );
}

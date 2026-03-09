import React from 'react';
import { Users, ShieldCheck, Info } from 'lucide-react';

export default function CrowdLegend({ activeUserCount }) {
  return (
    <div 
      className="glass-panel p-3 position-absolute"
      style={{ 
        bottom: '100px', 
        right: '20px', 
        width: '220px',
        zIndex: 1000 
      }}
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <Users size={16} className="text-success" />
        <h6 className="mb-0 fw-bold text-body small">Safety Map</h6>
      </div>
      
      <div className="small text-muted mb-2" style={{fontSize: '0.75rem'}}>
        Real-time crowd density
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="w-100">
          <div 
            style={{
              height: '8px',
              background: 'linear-gradient(to right, rgba(0,0,255,0.3), rgba(0,255,0,0.5), rgba(255,255,0,0.7), rgba(255,69,0,0.9), rgba(255,0,0,1))',
              borderRadius: '4px'
            }}
          />
          <div className="d-flex justify-content-between mt-1 text-muted" style={{fontSize: '0.65rem'}}>
            <span>Few</span>
            <span>Many</span>
          </div>
        </div>
      </div>

      {activeUserCount !== undefined && activeUserCount !== null && (
        <div className="d-flex align-items-center gap-2 p-2 rounded bg-success bg-opacity-10 text-success mb-2">
          <ShieldCheck size={14} />
          <span className="fw-bold small">{activeUserCount} {activeUserCount === 1 ? 'person' : 'people'} nearby</span>
        </div>
      )}

      <div className="d-flex align-items-start gap-2 text-muted" style={{ fontSize: '0.7rem' }}>
        <Info size={12} className="mt-1 flex-shrink-0" />
        <span>Green/Yellow areas indicate more people, which may be safer.</span>
      </div>
    </div>
  );
}

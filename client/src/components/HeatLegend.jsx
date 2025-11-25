// client/src/components/HeatLegend.jsx
import React from 'react';

const GradientBar = ({ colors }) => (
  <div style={{ height: 8, width: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${colors.join(',')})` }} />
);

export default function HeatLegend({ maxLabel = 'High', minLabel = 'Low' }) {
  const colors = ['rgba(255,255,255,0.0)', 'rgba(255,200,0,0.5)', 'rgba(255,120,0,0.6)', 'rgba(220,40,40,0.8)'];
  
  return (
    <div className="glass-panel p-3 position-absolute" style={{
      right: 20,
      bottom: 100, // Moved up to avoid overlapping with bottom controls
      zIndex: 1000,
      width: 200
    }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="fw-bold small text-body">Intensity</span>
      </div>
      <GradientBar colors={colors} />
      <div className="d-flex justify-content-between mt-1 text-muted" style={{fontSize: '0.7rem'}}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

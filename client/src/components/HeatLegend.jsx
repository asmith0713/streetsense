// client/src/components/HeatLegend.jsx
import React from 'react';

const GradientBar = ({ colors }) => (
  <div style={{ height: 12, width: 160, borderRadius: 6, background: `linear-gradient(90deg, ${colors.join(',')})` }} />
);

export default function HeatLegend({ maxLabel = 'High', minLabel = 'Low' }) {
  const colors = ['rgba(255,255,255,0.0)', 'rgba(255,200,0,0.5)', 'rgba(255,120,0,0.6)', 'rgba(220,40,40,0.8)'];
  return (
    <div style={{
      position: 'absolute',
      right: 14,
      bottom: 18,
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      padding: '8px 10px',
      borderRadius: 8,
      fontSize: 12,
      zIndex: 2000,
      boxShadow: '0 6px 18px rgba(0,0,0,0.25)'
    }}>
      <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 12 }}>Heat intensity</div>
      <GradientBar colors={colors} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ opacity: 0.9 }}>{minLabel}</span>
        <span style={{ opacity: 0.9 }}>{maxLabel}</span>
      </div>
    </div>
  );
}

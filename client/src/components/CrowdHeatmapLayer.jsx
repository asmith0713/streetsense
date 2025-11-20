import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

export default function CrowdHeatmapLayer({ map, points }) {
  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // Convert points to heatmap format: [lat, lng, intensity]
    const heatData = points.map(p => [p.lat, p.lng, p.intensity || 1.0]);

    // Create heatmap layer with custom styling for safety
    const heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: '#0000ff',  // Blue - Low crowd
        0.2: '#00ff00',  // Green - Safe areas with people
        0.4: '#ffff00',  // Yellow
        0.6: '#ffa500',  // Orange
        0.8: '#ff6600',  // Dark orange
        1.0: '#00ff00'   // Bright green for highest crowd density
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

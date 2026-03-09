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
        0.2: '#00ff00',  // Green - Some people
        0.4: '#ffff00',  // Yellow - Moderate crowd
        0.6: '#ffa500',  // Orange - Busy area
        0.8: '#ff4500',  // Red-orange - Very busy
        1.0: '#ff0000'   // Red - Highest crowd density
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

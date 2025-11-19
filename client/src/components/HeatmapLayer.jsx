import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ map, points }) {
  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    const layer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';


export default function ClusterLayer({ map, reports }) {
  useEffect(() => {
    if (!map) return;

    const markers = L.markerClusterGroup(
        {showCoverageOnHover: false,}
    );

    reports.forEach(r => {
      const marker = L.marker([r.coords[1], r.coords[0]]);
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: var(--secondary); color: var(--primary); padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              ${escapeHtml(r.category)}
            </span>
          </div>
          <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: var(--foreground);">
            ${escapeHtml(r.title)}
          </h3>
          <p style="margin: 0; font-size: 13px; color: var(--muted-foreground); line-height: 1.5;">
            ${escapeHtml(r.description)}
          </p>
        </div>
      `;

      marker.bindPopup(popupContent);
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    return () => {
      markers.clearLayers();  
      map.removeLayer(markers);
    };
  }, [map, reports]);

  return null;
}

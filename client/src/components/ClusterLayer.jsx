import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';


export default function ClusterLayer({ map, reports }) {
  useEffect(() => {
    if (!map) return;

    const markers = L.markerClusterGroup();

    reports.forEach(r => {
      const marker = L.marker([r.coords[1], r.coords[0]]);
      marker.bindPopup(
        `<b>${r.title}</b><br>${r.description}<br><i>${r.category}</i>`
      );
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    return () => {
      map.removeLayer(markers);
    };
  }, [map, reports]);

  return null;
}

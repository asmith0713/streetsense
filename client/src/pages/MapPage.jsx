// client/src/pages/MapPage.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../api';
import ReportFormModal from '../components/ReportFormModal';
import ReportCard from '../components/ReportCard';
import HeatmapLayer from '../components/HeatmapLayer';
import ClusterLayer from '../components/ClusterLayer';
import HeatLegend from '../components/HeatLegend';

// Fix Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
});

function MapClick({ onClick }) {
  useMapEvents({ click(e) { onClick(e.latlng); } });
  return null;
}
function MapInstanceSetter({ setMap }) {
    const map = useMap();
    useEffect(() => { setMap(map); }, [map, setMap]);
    return null;
}

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [pos, setPos] = useState([17.447, 78.396]);
  const [formLatLng, setFormLatLng] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('pins'); 
  const [heatPoints, setHeatPoints] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);
  
  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshTimerRef = useRef(null);

  useEffect(() => { loadReports(); loadHeatmap(); return () => clearInterval(refreshTimerRef.current); }, []);
  
  useEffect(() => {
      if (autoRefresh) {
          refreshTimerRef.current = setInterval(() => { loadReports(); loadHeatmap(); }, 15000);
      } else {
          clearInterval(refreshTimerRef.current);
      }
      return () => clearInterval(refreshTimerRef.current);
  }, [autoRefresh]);

  useEffect(() => { loadReports(); loadHeatmap(); }, [categoryFilter, timeFilter]);

  async function loadReports() {
    setLoading(true);
    try {
      let query = new URLSearchParams({ 
          ...(categoryFilter !== 'all' && { categories: categoryFilter }),
          ...(timeFilter !== 'all' && { since: getTimeDate(timeFilter) })
      }).toString();
      
      const res = await API.get(`/reports?${query}`);
      const features = res.data.features || [];
      setReports(features.map(f => ({
          ...f.properties,
          coords: f.geometry?.coordinates || [78.396, 17.447]
      })));
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }

  async function loadHeatmap() {
    try {
      let query = new URLSearchParams({
          ...(categoryFilter !== 'all' && { categories: categoryFilter }),
          ...(timeFilter !== 'all' && { since: getTimeDate(timeFilter) })
      }).toString();
      const res = await API.get(`/reports/heat?${query}`);
      setHeatPoints(res.data.points || []);
    } catch (err) { console.error(err); }
  }

  function getTimeDate(filter) {
      const now = new Date();
      if (filter === '24h') return new Date(now - 24 * 3600 * 1000).toISOString();
      if (filter === '7d') return new Date(now - 7 * 24 * 3600 * 1000).toISOString();
      if (filter === '30d') return new Date(now - 30 * 24 * 3600 * 1000).toISOString();
      return null;
  }

  function handleMapClick(latlng) {
    setFormLatLng([latlng.lat, latlng.lng]);
    setShowForm(true);
  }

  async function onSubmit(data) {
    try {
      const form = new FormData();
      Object.keys(data).forEach(k => form.append(k, data[k]));
      await API.post('/reports', form);
      setShowForm(false);
      loadReports(); loadHeatmap();
    } catch (err) { alert('Failed to submit'); }
  }

  return (
    <div className="map-wrapper d-flex flex-column h-100 w-100 position-relative">
      
      {/* Mobile Responsive Controls Overlay */}
      <div className="position-absolute top-0 start-0 end-0 p-3 z-3 pointer-events-none">
         <div className="card shadow-sm border-0 pointer-events-auto mx-auto" style={{maxWidth: '800px'}}>
            <div className="card-body p-2 d-flex gap-2 flex-wrap align-items-center justify-content-between">
                <div className="d-flex gap-2 flex-grow-1">
                    <select className="form-select form-select-sm" style={{maxWidth: '130px'}} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        <option value="all">All Categories</option>
                        {['safety','traffic','water','garbage','noise'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="form-select form-select-sm" style={{maxWidth: '120px'}} value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                        <option value="24h">24 Hours</option>
                        <option value="7d">7 Days</option>
                        <option value="30d">30 Days</option>
                    </select>
                </div>
                
                <div className="btn-group btn-group-sm">
                    <button className={`btn btn-outline-primary ${mode === 'pins' ? 'active' : ''}`} onClick={() => setMode('pins')}>Pins</button>
                    <button className={`btn btn-outline-primary ${mode === 'heat' ? 'active' : ''}`} onClick={() => setMode('heat')}>Heat</button>
                </div>
            </div>
         </div>
      </div>

      {/* Floating Action Button for Mobile/Desktop */}
      <button 
        className="btn btn-primary rounded-circle shadow position-absolute z-3 d-flex align-items-center justify-content-center"
        style={{bottom: '30px', right: '20px', width: '60px', height: '60px'}}
        onClick={() => {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    const { latitude, longitude } = pos.coords;
                    setPos([latitude, longitude]);
                    setFormLatLng([latitude, longitude]);
                    setShowForm(true);
                },
                () => { setFormLatLng(pos); setShowForm(true); }
            );
        }}
      >
        <i className="bi bi-plus-lg fs-4"></i>
      </button>

      <MapContainer center={pos} zoom={15} className="flex-grow-1 h-100 w-100" zoomControl={false}>
          <MapInstanceSetter setMap={setMapInstance} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapClick onClick={handleMapClick} />
          <L.Control.Zoom position="bottomright" />

          {mode === 'pins' && reports.map(r => (
            <Marker key={r._id} position={[r.coords[1], r.coords[0]]}>
              <Popup minWidth={250}><ReportCard report={r} onUpdated={loadReports} /></Popup>
            </Marker>
          ))}

          {mode === 'cluster' && mapInstance && <ClusterLayer map={mapInstance} reports={reports} />}
          {mode === 'heat' && mapInstance && <><HeatmapLayer map={mapInstance} points={heatPoints} /><HeatLegend /></>}
      </MapContainer>

      {showForm && formLatLng && (
        <ReportFormModal lat={formLatLng[0]} lng={formLatLng[1]} onClose={() => setShowForm(false)} onSubmit={onSubmit} />
      )}
    </div>
  );
}
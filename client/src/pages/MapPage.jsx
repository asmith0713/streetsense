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

// Fix default icon paths for Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
});

function MapClick({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    }
  });
  return null;
}
function MapInstanceSetter({ setMap }) {
    const map = useMap();
    useEffect(() => {
      setMap(map);
    }, [map, setMap]);
    return null;
}
const CATEGORY_OPTIONS = [
  'all',
  'safety',
  'traffic',
  'water',
  'garbage',
  'noise',
  'stray',
  'other'
];

const TIME_OPTIONS = [
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' }
];

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [pos, setPos] = useState([17.447, 78.396]); // default center
  const [formLatLng, setFormLatLng] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('7d');
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState('pins'); // pins, cluster, heat
  const [heatPoints, setHeatPoints] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);

  // autos-refresh states
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(15); // seconds
  const [countdown, setCountdown] = useState(null);
  const refreshTimerRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    // initial load
    loadReports();
    loadHeatmap();
    // clean up timer on unmount
    return () => {
      stopAutoRefresh();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // when filters change
    loadReports();
    loadHeatmap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, timeFilter]);

  useEffect(() => {
    if (autoRefresh) startAutoRefresh();
    else stopAutoRefresh();
    return () => stopAutoRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval]);

  async function loadReports() {
    setLoading(true);
    try {
      let query = '';
      const categories = categoryFilter !== 'all' ? categoryFilter : null;
      if (categories) query += `categories=${encodeURIComponent(categories)}&`;
      if (timeFilter && timeFilter !== 'all') {
        let since;
        const now = Date.now();
        if (timeFilter === '24h') since = new Date(now - 24 * 3600 * 1000);
        if (timeFilter === '7d') since = new Date(now - 7 * 24 * 3600 * 1000);
        if (timeFilter === '30d') since = new Date(now - 30 * 24 * 3600 * 1000);
        if (since) query += `since=${encodeURIComponent(since.toISOString())}&`;
      }
      const url = `/reports${query ? '?' + query : ''}`;
      const res = await API.get(url);
      const features = res.data.features || [];
      const mapped = features.map(f => {
        const props = f.properties || {};
        return {
          _id: props._id || props.id,
          title: props.title,
          description: props.description,
          category: props.category,
          status: props.status,
          upvotes: props.upvotes || 0,
          coords: (f.geometry && f.geometry.coordinates) || (props.location && props.location.coordinates) || [78.396, 17.447],
          photoUrl: props.photoUrl || null,
          timestamp: props.timestamp
        };
      });
      setReports(mapped);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  }

  // loads heatmap points from /api/reports/heat
  async function loadHeatmap() {
    try {
      let q = '';
      if (categoryFilter !== 'all') q += `categories=${encodeURIComponent(categoryFilter)}&`;
      if (timeFilter && timeFilter !== 'all') {
        const now = Date.now();
        let since;
        if (timeFilter === '24h') since = new Date(now - 24 * 3600 * 1000);
        if (timeFilter === '7d') since = new Date(now - 7 * 24 * 3600 * 1000);
        if (timeFilter === '30d') since = new Date(now - 30 * 24 * 3600 * 1000);
        if (since) q += `since=${encodeURIComponent(since.toISOString())}&`;
      }
      const res = await API.get(`/reports/heat${q ? '?' + q : ''}`);
      setHeatPoints(res.data.points || []);
    } catch (err) {
      console.error('heat load error', err);
    }
  }

  function handleMapClick(latlng) {
    setFormLatLng([latlng.lat, latlng.lng]);
    setShowForm(true);
  }

  async function onSubmit(data) {
    try {
      const form = new FormData();
      form.append('title', data.title);
      form.append('description', data.description || '');
      form.append('category', data.category || 'other');
      form.append('lat', data.lat);
      form.append('lng', data.lng);
      if (data.photo) form.append('photo', data.photo);
      await API.post('/reports', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setTimeout(() => { loadReports(); loadHeatmap(); }, 400);
    } catch (err) {
      console.error('submit failed', err);
      alert('Failed to submit report. Check console for details.');
    }
  }

  // Auto-refresh helpers
  function startAutoRefresh() {
    stopAutoRefresh();
    setCountdown(refreshInterval);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          loadReports();
          loadHeatmap();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    refreshTimerRef.current = setInterval(() => {
      loadReports();
      loadHeatmap();
    }, refreshInterval * 1000);
  }

  function stopAutoRefresh() {
    if (refreshTimerRef.current) { clearInterval(refreshTimerRef.current); refreshTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);
  }

  const counts = useMemo(() => {
    const byCat = {};
    reports.forEach(r => {
      byCat[r.category] = (byCat[r.category] || 0) + 1;
    });
    return byCat;
  }, [reports]);

  return (
    <div className="map-page" style={{ position: 'relative' }}>
      <div className="controls" style={{ alignItems: 'center' }}>
        <div className="left-controls">
          <label>
            Category
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label>
            Time range
            <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
              {TIME_OPTIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>

          <button onClick={() => { loadReports(); loadHeatmap(); }} className="btn">Refresh</button>
        </div>

        <div className="right-controls" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13 }}>
              Auto refresh
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ marginLeft: 8 }} />
            </label>

            <label style={{ fontSize: 13 }}>
              Interval
              <select value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))} style={{ marginLeft: 8 }}>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </label>

            {countdown !== null && <div style={{ fontSize: 13, color: '#666' }}>Next refresh in: {countdown}s</div>}
          </div>

          <div className="view-toggles" style={{ display: 'inline-flex', gap: 8, marginRight: 8 }}>
            <button className={`btn ${mode === 'pins' ? 'primary' : ''}`} onClick={() => setMode('pins')}>Pins</button>
            <button className={`btn ${mode === 'cluster' ? 'primary' : ''}`} onClick={() => setMode('cluster')}>Clusters</button>
            <button className={`btn ${mode === 'heat' ? 'primary' : ''}`} onClick={() => setMode('heat')}>Heatmap</button>
          </div>

          <button className="btn primary" onClick={() => {
            setPos([17.447, 78.396]);
            setFormLatLng([17.447, 78.396]);
            setShowForm(true);
          }}>Report an issue</button>
        </div>
      </div>

      <div className="summary">
        <div>Visible reports: {reports.length} {loading && '(loading...)'}</div>
        <div className="counts">
          {Object.entries(counts).map(([k, v]) => <span key={k} className="count-pill">{k}: {v}</span>)}
        </div>
      </div>

      <div className="map-container" style={{ position: 'relative' }}>
        <MapContainer
          center={pos}
          zoom={15}
          style={{ height: '70vh' }}
        //   whenCreated={map => setMapInstance(map)}
        >
          <MapInstanceSetter setMap={setMapInstance} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClick onClick={handleMapClick} />

          {mode === 'pins' && reports.map(r => (
            <Marker key={r._id} position={[r.coords[1], r.coords[0]]}>
              <Popup>
                <ReportCard report={r} onUpdated={() => { loadReports(); loadHeatmap(); }} />
              </Popup>
            </Marker>
          ))}

          {mode === 'cluster' && mapInstance && (
            <ClusterLayer map={mapInstance} reports={reports} />
          )}

          {mode === 'heat' && mapInstance && (
            <>
              <HeatmapLayer map={mapInstance} points={heatPoints} />
              <HeatLegend />
            </>
          )}

        </MapContainer>
      </div>

      {showForm && formLatLng && (
        <ReportFormModal
          lat={formLatLng[0]}
          lng={formLatLng[1]}
          onClose={() => setShowForm(false)}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
}

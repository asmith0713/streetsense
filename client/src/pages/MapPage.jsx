import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl, Circle } from 'react-leaflet';
import L from 'leaflet';
import API from '../api'; // Ensure this path is correct

// Components
import ReportFormModal from '../components/ReportFormModal';
import ReportCard from '../components/ReportCard';
import HeatmapLayer from '../components/HeatmapLayer';
import ClusterLayer from '../components/ClusterLayer';
import HeatLegend from '../components/HeatLegend';

// CSS / Leaflet Assets
import 'leaflet/dist/leaflet.css'; // Ensure CSS is imported
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { REFRESH_INTERVAL, USER_LOCATION_RADIUS, MAP_DEFAULT_ZOOM, MAP_TRACKING_ZOOM } from '../constants';

// --- Configuration ---

// Fix Leaflet default icon issue (Webpack/React specific)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

// Custom user location icon (Blue Dot)
const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjgiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjYiIGZpbGw9IiM0Mjg1RjQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

// --- Helper Components ---

// Handle Map Clicks
function MapClick({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    }
  });
  return null;
}

// Capture Map Instance for external control
function MapInstanceSetter({ setMap }) {
  const map = useMap();
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);
  return null;
}

// Smoothly pan to user location
function RecenterMap({ position, isTracking }) {
  const map = useMap();
  
  useEffect(() => {
    if (position && isTracking) {
      map.flyTo(position, MAP_TRACKING_ZOOM, {
        animate: true,
        duration: 1.5
      });
    }
  }, [position, isTracking, map]);
  
  return null;
}

// --- Main Component ---

export default function MapPage() {
  // State
  const [reports, setReports] = useState([]);
  const [heatPoints, setHeatPoints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  // Location State
  const [pos, setPos] = useState([17.447, 78.396]); // Default center
  const [userLocation, setUserLocation] = useState(null);
  const [trackingLocation, setTrackingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // Interaction State
  const [formLatLng, setFormLatLng] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('pins'); // 'pins' | 'heat' | 'cluster'
  const [mapInstance, setMapInstance] = useState(null);
  
  // Refs
  const [autoRefresh] = useState(true); // Default to true for live apps
  const refreshTimerRef = useRef(null);
  const watchIdRef = useRef(null);

  // Helper: Get timestamp for API
  const getTimeDate = (filter) => {
    const now = new Date();
    switch(filter) {
      case '24h': return new Date(now - 24 * 3600 * 1000).toISOString();
      case '7d': return new Date(now - 7 * 24 * 3600 * 1000).toISOString();
      case '30d': return new Date(now - 30 * 24 * 3600 * 1000).toISOString();
      default: return null;
    }
  };

  // 1. Data Loading
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('categories', categoryFilter);
      if (timeFilter !== 'all') {
        const dateStr = getTimeDate(timeFilter);
        if(dateStr) params.append('since', dateStr);
      }
      
      // Fetch Reports
      const reportRes = await API.get(`/reports?${params.toString()}`);
      const features = reportRes.data.features || [];
      
      // Process GeoJSON [Lng, Lat] -> Leaflet [Lat, Lng]
      setReports(features.map(f => ({
        ...f.properties,
        _id: f._id || f.id, // Handle different ID formats
        // Ensure we handle GeoJSON [lng, lat] correctly
        coords: f.geometry?.coordinates ? f.geometry.coordinates : [78.396, 17.447]
      })));

      // Fetch Heatmap if in heat mode (optimization)
      if (mode === 'heat') {
        const heatRes = await API.get(`/reports/heat?${params.toString()}`);
        setHeatPoints(heatRes.data.points || []);
      }
      
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, timeFilter, mode]);

  // 2. Effect: Initial Load & Refresh Interval
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      refreshTimerRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    }

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchData, autoRefresh]);

  // 3. Effect: Cleanup Location Tracking on Unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Location Logic
  const getLocationErrorMessage = (code) => {
    switch (code) {
      case 1: return 'Location permission denied.';
      case 2: return 'Location unavailable (check GPS).';
      case 3: return 'Location request timed out.';
      default: return 'Unknown location error.';
    }
  };

  const handleLocationSuccess = (position) => {
    const { latitude, longitude } = position.coords;
    const newPos = [latitude, longitude];
    setUserLocation(newPos);
    setLocationError(null);
    
    // Only move map center if we aren't manually panning elsewhere
    // or if it's the first fix
    if (trackingLocation) {
      setPos(newPos);
    }
  };

  const handleLocationError = (error) => {
    console.error('Location error:', error);
    setLocationError(getLocationErrorMessage(error.code));
    setTrackingLocation(false);
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocationSuccess(pos);
        // Fly to location immediately on button click
        if(mapInstance) mapInstance.flyTo([pos.coords.latitude, pos.coords.longitude], MAP_TRACKING_ZOOM);
      }, 
      handleLocationError, 
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleTracking = () => {
    if (trackingLocation) {
      // Stop
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTrackingLocation(false);
    } else {
      // Start
      if (!navigator.geolocation) {
        setLocationError('Geolocation not supported');
        return;
      }
      setTrackingLocation(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  // Form Handlers
  const handleMapClick = (latlng) => {
    setFormLatLng([latlng.lat, latlng.lng]);
    setShowForm(true);
  };

  const onSubmitReport = async (data) => {
    try {
      const form = new FormData();
      Object.keys(data).forEach(k => {
        if (data[k] !== null && data[k] !== undefined) form.append(k, data[k]);
      });
      
      await API.post('/reports', form);
      await fetchData(); // Reload data
      setShowForm(false);
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit report. Please try again.');
    }
  };

  return (
    <div className="d-flex flex-column h-100 w-100 position-relative">
      
      {/* --- TOP CONTROLS --- */}
      <div className="position-absolute top-0 start-0 end-0 p-3 z-3 pointer-events-none">
        <div className="card shadow-sm border-0 mx-auto pointer-events-auto" style={{maxWidth: '850px'}}>
          <div className="card-body p-2 d-flex gap-2 flex-wrap align-items-center justify-content-between">
            
            {/* Filters */}
            <div className="d-flex gap-2 flex-grow-1 flex-wrap">
              <select 
                className="form-select form-select-sm shadow-none border-secondary-subtle" 
                style={{maxWidth: '140px'}} 
                value={categoryFilter} 
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="safety">Safety</option>
                <option value="traffic">Traffic</option>
                <option value="water">Water</option>
                <option value="garbage">Garbage</option>
                <option value="noise">Noise</option>
                <option value="stray">Stray Animals</option>
                <option value="other">Other</option>
              </select>
              
              <select 
                className="form-select form-select-sm shadow-none border-secondary-subtle" 
                style={{maxWidth: '120px'}} 
                value={timeFilter} 
                onChange={e => setTimeFilter(e.target.value)}
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>

              {loading && <div className="spinner-border spinner-border-sm text-primary my-auto" role="status"></div>}
            </div>

            {/* Mode Toggles */}
            <div className="btn-group btn-group-sm">
              <button className={`btn btn-outline-primary ${mode === 'pins' ? 'active' : ''}`} onClick={() => setMode('pins')}>
                <i className="bi bi-pin-map"></i> Pins
              </button>
              <button className={`btn btn-outline-primary ${mode === 'heat' ? 'active' : ''}`} onClick={() => setMode('heat')}>
                <i className="bi bi-fire"></i> Heat
              </button>
              <button className={`btn btn-outline-primary ${mode === 'cluster' ? 'active' : ''}`} onClick={() => setMode('cluster')}>
                <i className="bi bi-circle-fill"></i> Cluster
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- ERROR TOAST --- */}
      {locationError && (
        <div className="position-absolute top-0 start-50 translate-middle-x mt-5 z-3 pointer-events-auto">
          <div className="alert alert-warning alert-dismissible fade show shadow-sm py-2" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i> {locationError}
            <button type="button" className="btn-close py-2" onClick={() => setLocationError(null)}></button>
          </div>
        </div>
      )}

      {/* --- BOTTOM LEFT CONTROLS --- */}
      <div className="position-absolute bottom-0 start-0 mb-4 ms-3 z-3 d-flex flex-column gap-2 pointer-events-none">
        <div className="pointer-events-auto d-flex flex-column gap-2">
          {/* My Location */}
          <button
            className="btn btn-light rounded-circle shadow d-flex align-items-center justify-content-center border-0"
            style={{width: '48px', height: '48px'}}
            onClick={getUserLocation}
            title="Find Me"
          >
            <i className="bi bi-crosshair fs-5 text-dark"></i>
          </button>

          {/* Live Tracking */}
          <button
            className={`btn ${trackingLocation ? 'btn-primary' : 'btn-light'} rounded-circle shadow d-flex align-items-center justify-content-center border-0`}
            style={{width: '48px', height: '48px'}}
            onClick={toggleTracking}
            title={trackingLocation ? "Stop tracking" : "Start live tracking"}
          >
            <i className={`bi ${trackingLocation ? 'bi-geo-alt-fill' : 'bi-geo-alt'} fs-5`}></i>
          </button>
        </div>

        {trackingLocation && (
          <div className="badge bg-primary text-white px-2 py-1 shadow-sm align-self-start">
            Live Tracking On
          </div>
        )}
      </div>

      {/* --- ADD REPORT BUTTON (Bottom Right) --- */}
      <button
        className="btn btn-primary rounded-circle shadow position-absolute z-3 d-flex align-items-center justify-content-center border-0"
        style={{bottom: '30px', right: '20px', width: '60px', height: '60px'}}
        onClick={() => {
          // Determine best location for new report
          let reportLocation;
          if (userLocation) {
            reportLocation = userLocation;
          } else if (mapInstance) {
            const center = mapInstance.getCenter();
            reportLocation = [center.lat, center.lng];
          } else {
            reportLocation = pos;
          }
          setFormLatLng(reportLocation);
          setShowForm(true);
        }}
        title="Report an Issue"
      >
        <i className="bi bi-plus-lg fs-3"></i>
      </button>

      {/* --- MAP --- */}
      <MapContainer 
        center={pos} 
        zoom={MAP_DEFAULT_ZOOM} 
        className="flex-grow-1 h-100 w-100 z-0" 
        zoomControl={false}
      >
        <MapInstanceSetter setMap={setMapInstance} />
        <RecenterMap position={userLocation} isTracking={trackingLocation} />
        <MapClick onClick={handleMapClick} />
        
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />
        
        <ZoomControl position="bottomright" />

        {/* User Location Marker */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={1000}>
              <Popup autoPan={false}>
                <strong>You are here</strong>
              </Popup>
            </Marker>
            <Circle
              center={userLocation}
              radius={USER_LOCATION_RADIUS}
              pathOptions={{ color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.15, weight: 1 }}
            />
          </>
        )}

        {/* Data Layers */}
        {mode === 'pins' && reports.map(r => (
          // Note: GeoJSON is [Lng, Lat], Leaflet Marker wants [Lat, Lng]
          // Ensure r.coords is handled correctly based on your API response
          <Marker 
            key={r._id} 
            position={[r.coords[1], r.coords[0]]} 
          >
            <Popup minWidth={280} maxWidth={320}>
              <ReportCard report={r} onUpdated={fetchData} />
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

      {/* --- FORM MODAL --- */}
      {showForm && formLatLng && (
        <ReportFormModal 
          lat={formLatLng[0]} 
          lng={formLatLng[1]} 
          onClose={() => setShowForm(false)} 
          onSubmit={onSubmitReport} 
        />
      )}
    </div>
  );
}
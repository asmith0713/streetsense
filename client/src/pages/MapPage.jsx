import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl, Circle } from 'react-leaflet';
import L from 'leaflet';
import API from '../api';
import ReportFormModal from '../components/ReportFormModal';
import ReportCard from '../components/ReportCard';
import HeatmapLayer from '../components/HeatmapLayer';
import ClusterLayer from '../components/ClusterLayer';
import HeatLegend from '../components/HeatLegend';

// Import Leaflet marker images
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { REFRESH_INTERVAL, USER_LOCATION_RADIUS, MAP_DEFAULT_ZOOM, MAP_TRACKING_ZOOM } from '../constants';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

// Custom user location icon (blue dot like Google Maps)
const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjgiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjYiIGZpbGw9IiM0Mjg1RjQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
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

// Component to recenter map when user location changes
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, MAP_TRACKING_ZOOM, {
        duration: 1.5
      });
    }
  }, [position, map]);
  return null;
}

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [pos, setPos] = useState([17.447, 78.396]);
  const [userLocation, setUserLocation] = useState(null);
  const [trackingLocation, setTrackingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [formLatLng, setFormLatLng] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('pins'); 
  const [heatPoints, setHeatPoints] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshTimerRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => { 
    loadReports(); 
    loadHeatmap(); 
    // Try to get user location on mount
    getUserLocation();
    return () => {
      clearInterval(refreshTimerRef.current);
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    // Clear any existing interval first
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => { 
        loadReports(); 
        loadHeatmap(); 
      }, REFRESH_INTERVAL);
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, loadReports, loadHeatmap]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('categories', categoryFilter);
      if (timeFilter !== 'all') params.append('since', getTimeDate(timeFilter));
      
      const res = await API.get(`/reports?${params.toString()}`);
      const features = res.data.features || [];
      setReports(features.map(f => ({
        ...f.properties,
        coords: f.geometry?.coordinates || [78.396, 17.447]
      })));
    } catch (err) { 
      console.error('Load reports error:', err); 
    } finally { 
      setLoading(false); 
    }
  }, [categoryFilter, timeFilter]);

  const loadHeatmap = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('categories', categoryFilter);
      if (timeFilter !== 'all') params.append('since', getTimeDate(timeFilter));
      
      const res = await API.get(`/reports/heat?${params.toString()}`);
      setHeatPoints(res.data.points || []);
    } catch (err) { 
      console.error('Load heatmap error:', err); 
    }
  }, [categoryFilter, timeFilter]);

  useEffect(() => { 
    loadReports(); 
    loadHeatmap(); 
  }, [categoryFilter, timeFilter, loadReports, loadHeatmap]);

  // Get user's current location
  function getUserLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];
        setUserLocation(newPos);
        setPos(newPos);
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError(getLocationErrorMessage(error.code));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  // Start continuous location tracking
  function startLocationTracking() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setTrackingLocation(true);
    setLocationError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];
        setUserLocation(newPos);
        setPos(newPos);
      },
      (error) => {
        console.error('Location tracking error:', error);
        setLocationError(getLocationErrorMessage(error.code));
        setTrackingLocation(false);
        if(watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  // Stop location tracking
  function stopLocationTracking() {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingLocation(false);
  }

  function getLocationErrorMessage(code) {
    switch (code) {
      case 1:
        return 'Location access denied. Please enable location permissions.';
      case 2:
        return 'Location unavailable. Please check your GPS settings.';
      case 3:
        return 'Location request timed out. Please try again.';
      default:
        return 'Unable to get your location.';
    }
  }

  // Removed duplicate loadReports function

  // Removed duplicate loadHeatmap function

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
      Object.keys(data).forEach(k => {
        if (data[k] !== null && data[k] !== undefined) {
          form.append(k, data[k]);
        }
      });
      await API.post('/reports', form);
      
      // Wait for data to reload before closing
      await Promise.all([loadReports(), loadHeatmap()]);
      setShowForm(false);
    } catch (err) { 
      console.error('Submit error:', err);
      alert('Failed to submit report'); 
    }
  }

  return (
    <div className="map-page-container">
      <div className='map-wrapper d-flex flex-column h-100 w-100 position-relative'>
      {/* Top Controls */}
      <div className="position-absolute top-0 start-0 end-0 p-3 z-3" style={{pointerEvents: 'none'}}>
        <div className="card shadow-sm border-0 mx-auto" style={{maxWidth: '800px', pointerEvents: 'auto'}}>
          <div className="card-body p-2 d-flex gap-2 flex-wrap align-items-center justify-content-between">
            <div className="d-flex gap-2 flex-grow-1 flex-wrap">
              <select className="form-select form-select-sm" style={{maxWidth: '130px'}} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                <option value="safety">Safety</option>
                <option value="traffic">Traffic</option>
                <option value="water">Water</option>
                <option value="garbage">Garbage</option>
                <option value="noise">Noise</option>
                <option value="stray">Stray</option>
                <option value="other">Other</option>
              </select>
              <select className="form-select form-select-sm" style={{maxWidth: '120px'}} value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
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

      {/* Location Error Toast */}
      {locationError && (
        <div className="position-absolute top-0 start-50 translate-middle-x mt-5 z-3" style={{pointerEvents: 'auto'}}>
          <div className="alert alert-warning alert-dismissible fade show shadow-sm" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {locationError}
            <button type="button" className="btn-close" onClick={() => setLocationError(null)}></button>
          </div>
        </div>
      )}

      {/* Location Controls - Bottom Left */}
      <div className="position-absolute bottom-0 start-0 mb-3 ms-3 z-3 d-flex flex-column gap-2" style={{pointerEvents: 'none'}}>
        {/* My Location Button */}
        <button 
          className="btn btn-light rounded-circle shadow d-flex align-items-center justify-content-center"
          style={{width: '48px', height: '48px', pointerEvents: 'auto'}}
          onClick={getUserLocation}
          title="Get my location"
        >
          <i className="bi bi-crosshair fs-5"></i>
        </button>

        {/* Live Tracking Toggle */}
        <button 
          className={`btn ${trackingLocation ? 'btn-primary' : 'btn-light'} rounded-circle shadow d-flex align-items-center justify-content-center`}
          style={{width: '48px', height: '48px', pointerEvents: 'auto'}}
          onClick={() => trackingLocation ? stopLocationTracking() : startLocationTracking()}
          title={trackingLocation ? "Stop tracking" : "Start live tracking"}
        >
          <i className={`bi ${trackingLocation ? 'bi-geo-alt-fill' : 'bi-geo-alt'} fs-5`}></i>
        </button>

        {trackingLocation && (
          <div className="badge bg-primary text-white px-2 py-1 shadow-sm" style={{pointerEvents: 'auto', fontSize: '0.7rem'}}>
            <i className="bi bi-circle-fill text-success me-1" style={{fontSize: '0.5rem'}}></i>
            Live Tracking
          </div>
        )}
      </div>

      {/* Add Report Button - Bottom Right */}
      <button 
        className="btn btn-primary rounded-circle shadow position-absolute z-3 d-flex align-items-center justify-content-center"
        style={{bottom: '30px', right: '20px', width: '60px', height: '60px'}}
        onClick={() => {
          let reportLocation;
          if (userLocation) {
            reportLocation = userLocation;
          } else if (mapInstance) {
          // Use map center if location not available
          const center = mapInstance.getCenter();
          reportLocation = [center.lat, center.lng];
          } else {
          reportLocation = pos; // Fallback to default
          }
  
          setFormLatLng(reportLocation);
          setShowForm(true);
        }}
        title="Report an issue"
      >
        <i className="bi bi-plus-lg fs-4"></i>
      </button>

      <MapContainer 
        center={pos} 
        zoom={MAP_DEFAULT_ZOOM} 
        className="flex-grow-1 h-100 w-100" 
        zoomControl={false}
        whenReady={() => console.log('Map ready')}
      >
        <MapInstanceSetter setMap={setMapInstance} />
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapClick onClick={handleMapClick} />
        <ZoomControl position="bottomright" />
        <RecenterMap position={trackingLocation ? userLocation : null} />

        {/* User Location Marker */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup>
                <div className="text-center">
                  <strong>Your Location</strong>
                  <br />
                  <small className="text-muted">
                    {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                  </small>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={userLocation}
              radius={USER_LOCATION_RADIUS}
              pathOptions={{
                color: '#4285F4',
                fillColor: '#4285F4',
                fillOpacity: 0.1,
                weight: 2
              }}
            />
          </>
        )}

        {/* Report Markers */}
        {mode === 'pins' && reports.map(r => (
          <Marker key={r._id} position={[r.coords[1], r.coords[0]]}>
            <Popup minWidth={250}>
              <ReportCard report={r} onUpdated={loadReports} />
            </Popup>
          </Marker>
        ))}

        {mode === 'cluster' && mapInstance && <ClusterLayer map={mapInstance} reports={reports} />}
        {mode === 'heat' && mapInstance && (
          <>
            <HeatmapLayer map={mapInstance} points={heatPoints} />
            <HeatLegend />
          </>
        )}
      </MapContainer>

      {showForm && formLatLng && (
        <ReportFormModal 
          lat={formLatLng[0]} 
          lng={formLatLng[1]} 
          onClose={() => setShowForm(false)} 
          onSubmit={onSubmit} 
        />
      )}
      </div>
    </div>
  );
}
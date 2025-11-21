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
import CrowdHeatmapLayer from '../components/CrowdHeatmapLayer';
import CrowdLegend from '../components/CrowdLegend';
import EmergencyButton from '../components/EmergencyButton';

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
  const prevPositionRef = useRef(null);
  
  useEffect(() => {
    if (position && isTracking) {
      const currentPos = JSON.stringify(position);
      // Only fly if position actually changed to avoid jitter
      if (prevPositionRef.current !== currentPos) {
        map.flyTo(position, MAP_TRACKING_ZOOM, {
          animate: true,
          duration: 1
        });
        prevPositionRef.current = currentPos;
      }
    }
  }, [position, isTracking, map]);
  
  return null;
}

// --- Main Component ---

export default function MapPage() {
  // State
  const [reports, setReports] = useState([]);
  const [heatPoints, setHeatPoints] = useState([]);
  const [crowdPoints, setCrowdPoints] = useState([]);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showCrowdHeatmap, setShowCrowdHeatmap] = useState(
    localStorage.getItem('streetsense_crowd_heatmap') === 'true'
  );
  const [shareLocationEnabled, setShareLocationEnabled] = useState(
    localStorage.getItem('streetsense_share_location') !== 'false' // Default to true
  );
  
  // Location State
  const [pos, setPos] = useState([17.447, 78.396]); // Default center
  const [userLocation, setUserLocation] = useState(null);
  const [trackingLocation, setTrackingLocation] = useState(
    localStorage.getItem('streetsense_tracking') === 'true'
  );
  const [locationError, setLocationError] = useState(null);
  
  // Interaction State
  const [formLatLng, setFormLatLng] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('pins'); // 'pins' | 'heat' | 'cluster'
  const [mapInstance, setMapInstance] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);
  
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

  // Fetch crowd heatmap data
  const fetchCrowdData = useCallback(async () => {
    if (!showCrowdHeatmap) return;
    
    try {
      const res = await API.get('/locations/heatmap');
      setCrowdPoints(res.data.points || []);
      setActiveUserCount(res.data.count || 0);
    } catch (err) {
      console.error('Crowd data fetch error:', err);
    }
  }, [showCrowdHeatmap]);

  // Update user's location to server (for crowd heatmap)
  const updateUserLocation = useCallback(async (lat, lng, accuracy = 100) => {
    if (!shareLocationEnabled) return;
    
    try {
      await API.post('/locations', { lat, lng, accuracy });
    } catch (err) {
      console.error('Location update error:', err);
    }
  }, [shareLocationEnabled]);

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

  // 2b. Effect: Handle shared location from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat'));
    const lng = parseFloat(params.get('lng'));
    const zoom = parseInt(params.get('zoom')) || MAP_TRACKING_ZOOM;

    if (!isNaN(lat) && !isNaN(lng)) {
      const sharedLocation = [lat, lng];
      setPos(sharedLocation);
      
      if (mapInstance) {
        setTimeout(() => {
          mapInstance.flyTo(sharedLocation, zoom, {
            animate: true,
            duration: 2
          });
        }, 500);
      }
    }
  }, [mapInstance]);

  // 2c. Effect: Fetch crowd data when crowd heatmap is enabled
  useEffect(() => {
    if (showCrowdHeatmap) {
      fetchCrowdData();
      const crowdInterval = setInterval(fetchCrowdData, 10000); // Update every 10 seconds
      return () => clearInterval(crowdInterval);
    }
  }, [showCrowdHeatmap, fetchCrowdData]);

  // 2d. Effect: Update user location to server when tracking and sharing enabled
  useEffect(() => {
    if (userLocation && shareLocationEnabled) {
      const [lat, lng] = userLocation;
      updateUserLocation(lat, lng);
    }
  }, [userLocation, shareLocationEnabled, updateUserLocation]);

  // 2e. Effect: Auto-start location tracking on mount for persistent safety tracking
  useEffect(() => {
    // Always enable location sharing by default for women's safety
    if (!shareLocationEnabled) {
      setShareLocationEnabled(true);
      localStorage.setItem('streetsense_share_location', 'true');
    }

    // Auto-request location immediately on app load
    if (!userLocation && !watchIdRef.current) {
      const timer = setTimeout(() => {
        requestInitialLocation();
      }, 500); // Small delay to ensure component is mounted
      return () => clearTimeout(timer);
    }

    // Auto-start tracking if it was previously enabled
    if (trackingLocation && !watchIdRef.current && userLocation) {
      const timer = setTimeout(() => {
        startTracking();
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - intentionally ignoring deps for initialization

  const requestInitialLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];
        setUserLocation(newPos);
        setPos(newPos);
        console.log('Initial location acquired:', newPos);
        
        // Optionally start tracking automatically
        if (localStorage.getItem('streetsense_tracking') === 'true') {
          startTracking();
        }
      },
      (error) => {
        console.warn('Initial location request failed:', error.message);
        // Don't show error to user, just silently fail
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  };

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

  const handleLocationSuccess = useCallback((position) => {
    const { latitude, longitude, accuracy } = position.coords;
    const newPos = [latitude, longitude];
    
    setUserLocation(newPos);
    setLocationError(null);
    
    console.log(`Location updated: [${latitude.toFixed(6)}, ${longitude.toFixed(6)}] (accuracy: ${accuracy.toFixed(0)}m)`);
    
    // Update center position if tracking is active
    if (trackingLocation) {
      setPos(newPos);
    }
  }, [trackingLocation]);

  const handleLocationError = useCallback((error) => {
    console.error('Location error:', error);
    const errorMsg = getLocationErrorMessage(error.code);
    setLocationError(errorMsg);
    
    // Stop tracking on error
    if (trackingLocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTrackingLocation(false);
    }
  }, [trackingLocation]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser');
      return;
    }
    
    // Clear any previous errors
    setLocationError(null);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];
        setUserLocation(newPos);
        setLocationError(null);
        
        // Fly to location immediately on button click
        if (mapInstance) {
          mapInstance.flyTo(newPos, MAP_TRACKING_ZOOM, {
            animate: true,
            duration: 1.5
          });
        }
      }, 
      handleLocationError, 
      { 
        enableHighAccuracy: true, 
        timeout: 10000,
        maximumAge: 5000 // Use cached position if less than 5 seconds old
      }
    );
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser');
      return;
    }
    
    // Clear any previous errors
    setLocationError(null);
    
    // Get initial position first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];
        setUserLocation(newPos);
        setTrackingLocation(true);
        localStorage.setItem('streetsense_tracking', 'true');
        
        // Fly to location
        if (mapInstance) {
          mapInstance.flyTo(newPos, MAP_TRACKING_ZOOM, {
            animate: true,
            duration: 1.5
          });
        }
        
        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleLocationSuccess,
          handleLocationError,
          { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
          }
        );
        
        console.log('Live tracking started (persistent)');
      },
      handleLocationError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [mapInstance, handleLocationSuccess, handleLocationError]);

  const toggleTracking = () => {
    if (trackingLocation) {
      // Stop tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTrackingLocation(false);
      localStorage.setItem('streetsense_tracking', 'false');
      console.log('Live tracking stopped');
    } else {
      // Start tracking
      startTracking();
    }
  };

  // Share Location
  const shareLocation = async () => {
    if (!userLocation) {
      alert('Please enable location first by clicking "Find Me" or "Live Tracking"');
      return;
    }

    const [lat, lng] = userLocation;
    const shareUrl = `${window.location.origin}/map?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&zoom=${MAP_TRACKING_ZOOM}`;
    
    try {
      // Try to use native share API if available (mobile)
      if (navigator.share) {
        await navigator.share({
          title: 'My Location on StreetSense',
          text: `Check out my location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          url: shareUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback if clipboard fails
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      } catch {
        alert(`Share link: ${shareUrl}`);
      }
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
            <div className="d-flex gap-2 align-items-center flex-wrap">
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
              
              {/* Safety Crowd Heatmap Toggle */}
              <button 
                className={`btn btn-sm ${showCrowdHeatmap ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => {
                  const newValue = !showCrowdHeatmap;
                  setShowCrowdHeatmap(newValue);
                  localStorage.setItem('streetsense_crowd_heatmap', newValue.toString());
                }}
                title="Show crowd density heatmap - see where more people are for safety awareness"
              >
                <i className="bi bi-people-fill"></i> {showCrowdHeatmap ? 'Hide' : 'Show'} Safety Map
              </button>
              
              {/* Share Location Broadcasting - Sends location to crowd map */}
              <button 
                className={`btn btn-sm ${shareLocationEnabled ? 'btn-info' : 'btn-outline-info'} position-relative`}
                onClick={() => {
                  const newValue = !shareLocationEnabled;
                  setShareLocationEnabled(newValue);
                  localStorage.setItem('streetsense_share_location', newValue.toString());
                  
                  if (newValue && userLocation) {
                    // Immediately update location when enabling
                    const [lat, lng] = userLocation;
                    updateUserLocation(lat, lng);
                  }
                }}
                title={shareLocationEnabled 
                  ? "Your location is being shared on the safety map - helping others see safe crowded areas" 
                  : "Click to share your location on the safety map - helps create safer community awareness"}
              >
                <i className={`bi ${shareLocationEnabled ? 'bi-broadcast' : 'bi-broadcast-pin'}`}></i>
                {' '}{shareLocationEnabled ? 'Broadcasting' : 'Start Broadcasting'}
                {shareLocationEnabled && (
                  <span className="position-absolute top-0 start-100 translate-middle p-1">
                    <span className="position-relative d-flex h-100 w-100">
                      <span className="animate-ping position-absolute d-inline-flex h-100 w-100 rounded-circle bg-success opacity-75"></span>
                      <span className="position-relative d-inline-flex rounded-circle h-100 w-100 bg-success" style={{width: '8px', height: '8px'}}></span>
                    </span>
                  </span>
                )}
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

      {/* --- LOCATION BROADCASTING INFO --- */}
      {shareLocationEnabled && userLocation && (
        <div className="position-fixed bottom-0 start-0 m-3 z-3 pointer-events-auto" style={{maxWidth: '320px'}}>
          <div className="alert alert-success alert-dismissible fade show shadow-sm mb-0 py-2 px-3" role="alert">
            <button type="button" className="btn-close" onClick={() => {
              setShareLocationEnabled(false);
              localStorage.setItem('streetsense_share_location', 'false');
            }}></button>
            <div className="d-flex align-items-start">
              <i className="bi bi-broadcast-pin me-2 fs-5 mt-1"></i>
              <div className="small">
                <strong>Broadcasting Location</strong>
                <br />
                <small className="text-muted">Your location is visible on the Safety Map, helping others identify safer, more populated areas.</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SHARE LINK SUCCESS TOAST --- */}
      {showShareToast && (
        <div className="position-absolute top-0 start-50 translate-middle-x mt-5 z-3 pointer-events-auto">
          <div className="alert alert-success alert-dismissible fade show shadow-sm py-2" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i> Location link copied! Share it with others.
            <button type="button" className="btn-close py-2" onClick={() => setShowShareToast(false)}></button>
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

          {/* Share Location Link */}
          {userLocation && (
            <button
              className="btn btn-light rounded-circle shadow d-flex align-items-center justify-content-center border-0"
              style={{width: '48px', height: '48px'}}
              onClick={shareLocation}
              title="Share location link - copy URL to share with others"
            >
              <i className="bi bi-share fs-5 text-dark"></i>
            </button>
          )}
        </div>

        {trackingLocation && (
          <div className="badge bg-primary text-white px-3 py-2 shadow-sm align-self-start">
            <i className="bi bi-geo-alt-fill me-1"></i> Live Tracking Active
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

        {/* Crowd Safety Heatmap Layer */}
        {showCrowdHeatmap && mapInstance && (
          <CrowdHeatmapLayer map={mapInstance} points={crowdPoints} />
        )}
      </MapContainer>

      {/* Crowd Safety Legend */}
      {showCrowdHeatmap && <CrowdLegend activeUserCount={activeUserCount} />}

      {/* Emergency SOS Button */}
      <EmergencyButton 
        userLocation={userLocation} 
        onEmergencyCreated={(data) => {
          console.log('Emergency created:', data);
          // Optionally refetch data or show notification
        }}
        onLocationRequest={(newLocation) => {
          console.log('Location requested from emergency:', newLocation);
          setUserLocation(newLocation);
          if (mapInstance) {
            mapInstance.flyTo(newLocation, MAP_TRACKING_ZOOM, {
              animate: true,
              duration: 1.5
            });
          }
        }}
      />

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
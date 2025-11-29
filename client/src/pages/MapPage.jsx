import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl, Circle } from 'react-leaflet';
// import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import API from '../api';
import { 
  MapPin, Flame, Layers, Users, Share2, Crosshair, Navigation,
  Filter, Clock, AlertTriangle, CheckCircle, Copy, MessageCircle, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import ReportFormModal from '../components/ReportFormModal';
import ReportCard from '../components/ReportCard';
import HeatmapLayer from '../components/HeatmapLayer';
import ClusterLayer from '../components/ClusterLayer';
import HeatLegend from '../components/HeatLegend';
import CrowdHeatmapLayer from '../components/CrowdHeatmapLayer';
import CrowdLegend from '../components/CrowdLegend';
import EmergencyButton from '../components/EmergencyButton';
import LocationPermissionGuide from '../components/LocationPermissionGuide';

// CSS / Leaflet Assets
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { REFRESH_INTERVAL, USER_LOCATION_RADIUS, MAP_DEFAULT_ZOOM, MAP_TRACKING_ZOOM } from '../constants';

// --- Configuration ---

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjgiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjYiIGZpbGw9IiM0Mjg1RjQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const sharedLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAzMiA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTYgNDhDMTYgNDggMzIgMjguOCAzMiAxNkMzMiA3LjE2MzQ0IDI0LjgzNjYgMCAxNiAwQzcuMTYzNDQgMCAwIDcuMTYzNDQgMCAxNkMwIDI4LjggMTYgNDggMTYgNDhaIiBmaWxsPSIjRkY1NzIyIi8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iOCIgZmlsbD0id2hpdGUiLz4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI1IiBmaWxsPSIjRkY1NzIyIi8+Cjwvc3ZnPg==',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48]
});

// --- Helper Components ---

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

function RecenterMap({ position, isTracking }) {
  const map = useMap();
  const prevPositionRef = useRef(null);
  
  useEffect(() => {
    if (position && isTracking) {
      const currentPos = JSON.stringify(position);
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
  // const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [heatPoints, setHeatPoints] = useState([]);
  const [crowdPoints, setCrowdPoints] = useState([]);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showCrowdHeatmap, setShowCrowdHeatmap] = useState(
    localStorage.getItem('streetsense_crowd_heatmap') === 'true'
  );
  const [shareLocationEnabled, setShareLocationEnabled] = useState(
    localStorage.getItem('streetsense_share_location') !== 'false'
  );
  
  const [pos, setPos] = useState([17.447, 78.396]);
  const [userLocation, setUserLocation] = useState(null);
  const [sharedLocation, setSharedLocation] = useState(null);
  const [trackingLocation, setTrackingLocation] = useState(
    localStorage.getItem('streetsense_tracking') === 'true'
  );
  const [locationError, setLocationError] = useState(null);
  const [showLocationGuide, setShowLocationGuide] = useState(false);
  
  const [formLatLng, setFormLatLng] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('pins');
  const [mapInstance, setMapInstance] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [autoRefresh] = useState(true);
  const refreshTimerRef = useRef(null);
  const watchIdRef = useRef(null);
  const shareMenuRef = useRef(null);

  const getTimeDate = (filter) => {
    const now = new Date();
    switch(filter) {
      case '24h': return new Date(now - 24 * 3600 * 1000).toISOString();
      case '7d': return new Date(now - 7 * 24 * 3600 * 1000).toISOString();
      case '30d': return new Date(now - 30 * 24 * 3600 * 1000).toISOString();
      default: return null;
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('categories', categoryFilter);
      if (timeFilter !== 'all') {
        const dateStr = getTimeDate(timeFilter);
        if(dateStr) params.append('since', dateStr);
      }
      
      const reportRes = await API.get(`/reports?${params.toString()}`);
      const features = reportRes.data.features || [];
      
      setReports(features.map(f => ({
        ...f.properties,
        _id: f._id || f.properties?._id || f.id,
        coords: f.geometry?.coordinates ? f.geometry.coordinates : [78.396, 17.447]
      })));

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

  const updateUserLocation = useCallback(async (lat, lng, accuracy = 100) => {
    if (!shareLocationEnabled) return;
    try {
      await API.post('/locations', { lat, lng, accuracy });
    } catch (err) {
      console.error('Location update error:', err);
    }
  }, [shareLocationEnabled]);

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchData, autoRefresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat'));
    const lng = parseFloat(params.get('lng'));
    const zoom = parseInt(params.get('zoom')) || MAP_TRACKING_ZOOM;

    if (!isNaN(lat) && !isNaN(lng)) {
      const sharedLocation = [lat, lng];
      setPos(sharedLocation);
      setSharedLocation(sharedLocation);
      
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

  useEffect(() => {
    if (showCrowdHeatmap) {
      fetchCrowdData();
      const crowdInterval = setInterval(fetchCrowdData, 10000);
      return () => clearInterval(crowdInterval);
    }
  }, [showCrowdHeatmap, fetchCrowdData]);

  useEffect(() => {
    if (userLocation && shareLocationEnabled) {
      const [lat, lng] = userLocation;
      updateUserLocation(lat, lng);
    }
  }, [userLocation, shareLocationEnabled, updateUserLocation]);

  useEffect(() => {
    if (!shareLocationEnabled) {
      setShareLocationEnabled(true);
      localStorage.setItem('streetsense_share_location', 'true');
    }

    if (!userLocation && !watchIdRef.current) {
      const timer = setTimeout(() => {
        requestInitialLocation();
      }, 500);
      return () => clearTimeout(timer);
    }

    if (trackingLocation && !watchIdRef.current && userLocation) {
      const timer = setTimeout(() => {
        startTracking();
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestInitialLocation = () => {
    if (!navigator.geolocation) {
      // console.warn('Geolocation not supported');
      setLocationError('Geolocation not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];
        setUserLocation(newPos);
        setPos(newPos);
        
        if (localStorage.getItem('streetsense_tracking') === 'true') {
          startTracking();
        }
      },
      (error) => {
        // console.warn('Initial location request failed:', error.message);
        handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu]);

  const getLocationErrorMessage = (code) => {
    switch (code) {
      case 1: return 'Location permission denied. Click "Help" button for instructions.';
      case 2: return 'Location unavailable. Check if GPS/Location Services are enabled on your device.';
      case 3: return 'Location request timed out. Try again with better signal.';
      default: return 'Unknown location error. Check browser permissions.';
    }
  };

  const handleLocationSuccess = useCallback((position) => {
    const { latitude, longitude } = position.coords;
    const newPos = [latitude, longitude];
    
    setUserLocation(newPos);
    setLocationError(null);
    
    if (trackingLocation) {
      setPos(newPos);
    }
  }, [trackingLocation]);

  const handleLocationError = useCallback((error) => {
    console.error('Location error:', error);
    const errorMsg = getLocationErrorMessage(error.code);
    setLocationError(errorMsg);
    
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
    
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setLocationError('Geolocation requires HTTPS connection on mobile devices');
      return;
    }
    
    setLocationError(null);
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: isMobile ? 10000 : 5000
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];
        setUserLocation(newPos);
        setLocationError(null);
        
        if (mapInstance) {
          mapInstance.flyTo(newPos, MAP_TRACKING_ZOOM, {
            animate: true,
            duration: 1.5
          });
        }
      }, 
      handleLocationError, 
      geoOptions
    );
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser');
      return;
    }
    
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setLocationError('Geolocation requires HTTPS connection on mobile devices');
      return;
    }
    
    setLocationError(null);
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: isMobile ? 5000 : 0
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];
        setUserLocation(newPos);
        setTrackingLocation(true);
        localStorage.setItem('streetsense_tracking', 'true');
        
        if (mapInstance) {
          mapInstance.flyTo(newPos, MAP_TRACKING_ZOOM, {
            animate: true,
            duration: 1.5
          });
        }
        
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleLocationSuccess,
          handleLocationError,
          geoOptions
        );
      },
      handleLocationError,
      geoOptions
    );
  }, [mapInstance, handleLocationSuccess, handleLocationError]);

  const toggleTracking = () => {
    if (trackingLocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTrackingLocation(false);
      localStorage.setItem('streetsense_tracking', 'false');
    } else {
      startTracking();
    }
  };

  const copyToClipboard = async (shareUrl) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      setShowShareMenu(false);
      setTimeout(() => setShowShareToast(false), 3000);
      return true;
    } catch (err) {
      // Fallback
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setShowShareToast(true);
          setShowShareMenu(false);
          setTimeout(() => setShowShareToast(false), 3000);
          return true;
        }
        return false;
      } catch (err2) {
        return false;
      }
    }
  };

  const shareViaWhatsApp = (shareUrl, lat, lng) => {
    const message = `📍 Check out my location on StreetSense!\n\nCoordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n\n${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const shareViaSMS = (shareUrl, lat, lng) => {
    const message = `Check out my location on StreetSense: ${lat.toFixed(6)}, ${lng.toFixed(6)} - ${shareUrl}`;
    const smsUrl = `sms:?&body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    setShowShareMenu(false);
  };

  const shareLocation = async () => {
    if (!userLocation) {
      alert('Please enable location first by clicking "Find Me" or "Live Tracking"');
      return;
    }

    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      const [lat, lng] = userLocation;
      const shareUrl = `${window.location.origin}/map?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&zoom=${MAP_TRACKING_ZOOM}`;
      
      try {
        await navigator.share({
          title: 'My Location on StreetSense',
          text: `Check out my location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          url: shareUrl
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Native share failed:', err);
        }
      }
    }
    
    setShowShareMenu(!showShareMenu);
  };

  const shareUrl = useMemo(() => {
    if (!userLocation) return null;
    const [lat, lng] = userLocation;
    return `${window.location.origin}/map?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&zoom=${MAP_TRACKING_ZOOM}`;
  }, [userLocation]);

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
      
      await API.post('/reports', form, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // console.log('Report submitted successfully');
      await fetchData();
      setShowForm(false);
      alert('Report submitted successfully!');
    } catch (err) {
      console.error('Submit error:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit report. Please try again.';
      alert(errorMsg);
    }
  };

  return (
    <div className="d-flex flex-column h-100 w-100 position-relative overflow-hidden">
      
      {/* --- TOP CONTROLS --- */}
      <div
        className="position-absolute top-0 start-0 end-0 px-3 pt-3 z-3 pointer-events-none"
        style={{ marginTop: '60px' }}
      >
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-panel mx-auto pointer-events-auto p-2 d-flex gap-2 flex-wrap align-items-center justify-content-between shadow-lg position-relative"
          style={{ maxWidth: '900px', width: '100%' }}
        >
          {/* Mobile Toggle for Filters */}
          <div className="d-flex gap-2">
            <button 
              className="btn btn-light d-md-none"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
            </button>
          </div>

          {/* Filters */}
          <div
            className={`gap-2 flex-grow-1 flex-wrap align-items-center ${
              showFilters
                ? 'd-flex flex-column flex-sm-row w-100 mt-2 order-last'
                : 'd-none d-md-flex'
            }`}
          >
            <div className="input-group input-group-sm" style={{maxWidth: '180px'}}>
              <span className="input-group-text input-group-bg border-end-0"><Filter size={14} /></span>
              <select 
                className="form-select border-start-0 shadow-none" 
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
            </div>
            
            <div className="input-group input-group-sm" style={{maxWidth: '150px'}}>
              <span className="input-group-text input-group-bg border-end-0"><Clock size={14} /></span>
              <select 
                className="form-select border-start-0 shadow-none"  
                value={timeFilter} 
                onChange={e => setTimeFilter(e.target.value)}
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {loading && <div className="spinner-border spinner-border-sm text-primary" role="status"></div>}
          </div>

          {/* Mode Toggles */}
          <div className="d-flex gap-2 align-items-center flex-wrap ms-auto">
            <div className="btn-group btn-group-sm shadow-sm">
              <button className={`btn ${mode === 'pins' ? 'btn-primary' : 'btn-light'}`} onClick={() => setMode('pins')}>
                <MapPin size={14} className="me-1" /> Pins
              </button>
              <button className={`btn ${mode === 'heat' ? 'btn-primary' : 'btn-light'}`} onClick={() => setMode('heat')}>
                <Flame size={14} className="me-1" /> Heat
              </button>
              <button className={`btn ${mode === 'cluster' ? 'btn-primary' : 'btn-light'}`} onClick={() => setMode('cluster')}>
                <Layers size={14} className="me-1" /> Cluster
              </button>
            </div>
            
            <button 
              className={`btn btn-sm d-flex align-items-center gap-1 ${showCrowdHeatmap ? 'btn-success text-white' : 'btn-outline-success'}`}
              onClick={() => {
                const newValue = !showCrowdHeatmap;
                setShowCrowdHeatmap(newValue);
                localStorage.setItem('streetsense_crowd_heatmap', newValue.toString());
              }}
            >
              <Users size={14} />
              <span className="d-none d-sm-inline">{showCrowdHeatmap ? 'Hide' : 'Show'} Crowd</span>
            </button>
            
            <button 
              className={`btn btn-sm d-flex align-items-center gap-1 position-relative ${shareLocationEnabled ? 'btn-info text-white' : 'btn-outline-info'}`}
              onClick={() => {
                const newValue = !shareLocationEnabled;
                setShareLocationEnabled(newValue);
                localStorage.setItem('streetsense_share_location', newValue.toString());
                if (newValue && userLocation) {
                  const [lat, lng] = userLocation;
                  updateUserLocation(lat, lng);
                }
              }}
            >
              <Share2 size={14} />
              <span className="d-none d-sm-inline">{shareLocationEnabled ? 'Broadcasting' : 'Broadcast'}</span>
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
        </motion.div>
      </div>

      {/* --- ERROR TOAST --- */}
      <AnimatePresence>
        {locationError && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="position-absolute top-0 start-50 translate-middle-x mt-5 z-3 pointer-events-auto"
          >
            <div className="glass-panel p-3 d-flex align-items-center gap-3 text-danger border-danger bg-danger bg-opacity-10">
              <AlertTriangle size={20} />
              <span className="small fw-bold">{locationError}</span>
              <button className="btn btn-sm btn-light ms-2" onClick={() => setShowLocationGuide(true)}>Help</button>
              <button className="btn-close small" onClick={() => setLocationError(null)}></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LocationPermissionGuide show={showLocationGuide} onClose={() => setShowLocationGuide(false)} />

      {/* --- LOCATION BROADCASTING INFO --- */}
      <AnimatePresence>
        {shareLocationEnabled && userLocation && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="position-fixed bottom-0 start-0 m-3 z-3 pointer-events-auto" 
            style={{maxWidth: '300px'}}
          >
            <div className="glass-panel p-3 border-success bg-success bg-opacity-10 position-relative">
              <button className="btn-close position-absolute top-0 end-0 m-2 small" onClick={() => {
                setShareLocationEnabled(false);
                localStorage.setItem('streetsense_share_location', 'false');
              }}></button>
              <div className="d-flex align-items-start gap-2">
                <div className="bg-success text-white rounded-circle p-1 mt-1">
                  <Share2 size={14} />
                </div>
                <div>
                  <div className="fw-bold text-success small">Broadcasting Location</div>
                  <div className="text-muted small" style={{fontSize: '0.75rem'}}>
                    Your location is visible on the Safety Map to help others.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- SHARE LINK SUCCESS TOAST --- */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="position-absolute top-0 start-50 translate-middle-x mt-5 z-3 pointer-events-auto"
          >
            <div className="glass-panel p-3 d-flex align-items-center gap-2 text-success border-success bg-success bg-opacity-10">
              <CheckCircle size={18} />
              <span className="fw-bold small">Link copied to clipboard!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- BOTTOM LEFT CONTROLS --- */}
      <div className="position-absolute bottom-0 start-0 mb-4 ms-3 z-3 d-flex flex-column gap-2 pointer-events-none">
        <div className="pointer-events-auto d-flex flex-column gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn glass-panel p-0 rounded-circle d-flex align-items-center justify-content-center text-primary"
            style={{width: '48px', height: '48px'}}
            onClick={getUserLocation}
            title="Find Me"
          >
            <Crosshair size={24} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`btn glass-panel p-0 rounded-circle d-flex align-items-center justify-content-center ${trackingLocation ? 'bg-primary text-white border-primary' : 'text-primary'}`}
            style={{width: '48px', height: '48px'}}
            onClick={toggleTracking}
            title={trackingLocation ? "Stop tracking" : "Start live tracking"}
          >
            <Navigation size={24} className={trackingLocation ? 'fill-current' : ''} />
          </motion.button>

          {userLocation && (
            <div className="position-relative" ref={shareMenuRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn glass-panel p-0 rounded-circle d-flex align-items-center justify-content-center text-body"
                style={{width: '48px', height: '48px'}}
                onClick={shareLocation}
                title="Share location"
              >
                <Share2 size={20} />
              </motion.button>

              <AnimatePresence>
                {showShareMenu && shareUrl && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, originY: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="position-absolute start-100 bottom-0 ms-2 glass-panel p-2"
                    style={{ minWidth: '200px', zIndex: 1050 }}
                  >
                    <div className="text-muted small fw-bold px-2 py-1 mb-1 text-uppercase">Share Location</div>
                    
                    <button className="btn btn-sm btn-light w-100 text-start d-flex align-items-center gap-2 mb-1" onClick={() => copyToClipboard(shareUrl)}>
                      <Copy size={14} className="text-primary" /> Copy Link
                    </button>

                    <button className="btn btn-sm btn-light w-100 text-start d-flex align-items-center gap-2 mb-1" onClick={() => { const [lat, lng] = userLocation; shareViaWhatsApp(shareUrl, lat, lng); }}>
                      <MessageCircle size={14} className="text-success" /> WhatsApp
                    </button>

                    <button className="btn btn-sm btn-light w-100 text-start d-flex align-items-center gap-2" onClick={() => { const [lat, lng] = userLocation; shareViaSMS(shareUrl, lat, lng); }}>
                      <Smartphone size={14} className="text-info" /> SMS
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {trackingLocation && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel px-3 py-2 d-flex align-items-center gap-2 text-primary fw-bold small"
          >
            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
            Live Tracking
          </motion.div>
        )}
      </div>

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

        {sharedLocation && (
          <Marker position={sharedLocation} icon={sharedLocationIcon} zIndexOffset={999}>
            <Popup autoPan={false}>
              <div>
                <strong className="text-primary">📍 Shared Location</strong>
                <p className="mb-1 mt-2 small text-muted">Someone shared this location with you</p>
                <div className="small">
                  <strong>Coordinates:</strong><br />
                  {sharedLocation[0].toFixed(6)}, {sharedLocation[1].toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {userLocation && (
          <>
            <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={1000}>
              <Popup autoPan={false}><strong>You are here</strong></Popup>
            </Marker>
            <Circle
              center={userLocation}
              radius={USER_LOCATION_RADIUS}
              pathOptions={{ color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.15, weight: 1 }}
            />
          </>
        )}

        {mode === 'pins' && reports.map(r => (
          <Marker key={r._id} position={[r.coords[1], r.coords[0]]}>
            <Popup minWidth={280} maxWidth={320} className="glass-popup">
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

        {showCrowdHeatmap && mapInstance && (
          <CrowdHeatmapLayer map={mapInstance} points={crowdPoints} />
        )}
      </MapContainer>

      {showCrowdHeatmap && <CrowdLegend activeUserCount={activeUserCount} />}

      <EmergencyButton 
        userLocation={userLocation} 
        onLocationRequest={(newLocation) => {
          setUserLocation(newLocation);
          if (mapInstance) {
            mapInstance.flyTo(newLocation, MAP_TRACKING_ZOOM, { animate: true, duration: 1.5 });
          }
        }}
        onEmergencyCreated={(data) => {
          // console.log('Emergency created:', data);
        }}
      />

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
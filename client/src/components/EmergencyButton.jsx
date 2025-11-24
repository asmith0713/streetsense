import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import API from '../api';

export default function EmergencyButton({ userLocation, onEmergencyCreated, onLocationRequest }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(userLocation);

  // Update location when prop changes
  useEffect(() => {
    setCurrentLocation(userLocation);
  }, [userLocation]);

  const handleShow = () => {
    setShow(true);
    setError(null);
    setSuccess(false);
    
    // Auto-request location if not available
    if (!userLocation && !fetchingLocation) {
      requestLocation();
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }

    // Check if HTTPS or localhost (critical for mobile)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setError('Geolocation requires HTTPS. Please access via https:// or use desktop.');
      return;
    }

    setFetchingLocation(true);
    setError(null);

    // Mobile-optimized settings
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // Longer timeout for mobile
      maximumAge: isMobile ? 10000 : 30000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = [latitude, longitude];
        setCurrentLocation(newLocation);
        setFetchingLocation(false);
        
        // Notify parent component to update location
        if (onLocationRequest) {
          onLocationRequest(newLocation);
        }
      },
      (err) => {
        console.error('Location error:', err);
        let errorMsg = 'Failed to get location. ';
        switch (err.code) {
          case 1:
            errorMsg += 'Please allow location access in your browser/device settings.';
            if (isMobile) {
              errorMsg += ' On mobile: Settings → Browser → Location → Allow';
            }
            break;
          case 2:
            errorMsg += 'Location unavailable. Check if GPS/Location Services are enabled on your device.';
            break;
          case 3:
            errorMsg += 'Location request timed out. Try again with better signal.';
            break;
          default:
            errorMsg += 'Unknown error.';
        }
        setError(errorMsg);
        setFetchingLocation(false);
      },
      geoOptions
    );
  };

  const handleClose = () => {
    setShow(false);
    setError(null);
    setSuccess(false);
  };

  const createEmergency = async (type, severity = 'high') => {
    const locationToUse = currentLocation || userLocation;
    
    if (!locationToUse) {
      setError('Fetching location... Please wait and try again.');
      requestLocation();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [lat, lng] = locationToUse;
      
      const response = await API.post('/emergency', {
        type,
        lat,
        lng,
        severity,
        description: `Emergency alert: ${type}`
      });

      setEmergencyContacts(response.data.emergencyContacts);
      setSuccess(true);
      
      if (onEmergencyCreated) {
        onEmergencyCreated(response.data);
      }

      // Auto-close after showing contacts
      setTimeout(() => {
        handleClose();
      }, 8000);

    } catch (err) {
      console.error('Emergency creation failed:', err);
      setError(err.response?.data?.error || 'Failed to create emergency alert');
    } finally {
      setLoading(false);
    }
  };

  const makePhoneCall = (number) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <>
      {/* Floating SOS Button */}
      <Button
        variant="danger"
        onClick={handleShow}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          fontSize: '20px',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(220, 53, 69, 0.5)',
          border: '3px solid white'
        }}
        className="d-flex align-items-center justify-content-center"
      >
        SOS
      </Button>

      {/* Emergency Modal */}
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#dc3545', color: 'white' }}>
          <Modal.Title>
            <i className="bi bi-shield-exclamation me-2"></i>
            Emergency Assistance
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          {fetchingLocation && (
            <Alert variant="info">
              <div className="d-flex align-items-center">
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <span>Requesting location access...</span>
              </div>
            </Alert>
          )}
          
          {success && emergencyContacts ? (
            <div>
              <Alert variant="success">
                <strong>Emergency Alert Created!</strong>
                <br />
                Your emergency has been logged and authorities have been notified.
              </Alert>
              
              <h6 className="mb-3">Emergency Contact Numbers:</h6>
              <div className="d-grid gap-2">
                <Button
                  variant="outline-danger"
                  onClick={() => makePhoneCall(emergencyContacts.police)}
                  className="text-start"
                >
                  <i className="bi bi-telephone-fill me-2"></i>
                  Police: {emergencyContacts.police}
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={() => makePhoneCall(emergencyContacts.womenHelpline)}
                  className="text-start"
                >
                  <i className="bi bi-telephone-fill me-2"></i>
                  Women Helpline: {emergencyContacts.womenHelpline}
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={() => makePhoneCall(emergencyContacts.ambulance)}
                  className="text-start"
                >
                  <i className="bi bi-telephone-fill me-2"></i>
                  Ambulance: {emergencyContacts.ambulance}
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={() => makePhoneCall(emergencyContacts.nationalEmergency)}
                  className="text-start"
                >
                  <i className="bi bi-telephone-fill me-2"></i>
                  National Emergency: {emergencyContacts.nationalEmergency}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {!currentLocation && !userLocation && !fetchingLocation && (
                <Alert variant="info" className="mb-3">
                  <i className="bi bi-info-circle me-2"></i>
                  We'll request your location when you select an emergency type.
                </Alert>
              )}
              
              {(currentLocation || userLocation) && (
                <Alert variant="success" className="mb-3">
                  <i className="bi bi-check-circle me-2"></i>
                  Location acquired. Ready to send emergency alert.
                </Alert>
              )}
              
              <Alert variant="warning">
                <strong>⚠️ Use only in genuine emergencies</strong>
                <br />
                This will alert authorities and log your location.
              </Alert>

              <h6 className="mb-3">Select Emergency Type:</h6>
              <div className="d-grid gap-2">
                <Button
                  variant="danger"
                  onClick={() => createEmergency('harassment', 'critical')}
                  disabled={loading || fetchingLocation}
                  size="lg"
                >
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Harassment / Eve-Teasing
                </Button>
                
                <Button
                  variant="danger"
                  onClick={() => createEmergency('assault', 'critical')}
                  disabled={loading || fetchingLocation}
                  size="lg"
                >
                  <i className="bi bi-shield-exclamation me-2"></i>
                  Physical Assault
                </Button>
                
                <Button
                  variant="danger"
                  onClick={() => createEmergency('stalking', 'high')}
                  disabled={loading || fetchingLocation}
                  size="lg"
                >
                  <i className="bi bi-eye-fill me-2"></i>
                  Stalking / Following
                </Button>
                
                <Button
                  variant="warning"
                  onClick={() => createEmergency('medical', 'high')}
                  disabled={loading || fetchingLocation}
                >
                  <i className="bi bi-heart-pulse-fill me-2"></i>
                  Medical Emergency
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => createEmergency('general', 'medium')}
                  disabled={loading || fetchingLocation}
                >
                  <i className="bi bi-exclamation-circle-fill me-2"></i>
                  Other Emergency
                </Button>
              </div>

              {(loading || fetchingLocation) && (
                <div className="text-center mt-3">
                  <div className="spinner-border text-danger" role="status">
                    <span className="visually-hidden">{fetchingLocation ? 'Getting location...' : 'Creating alert...'}</span>
                  </div>
                  <p className="mt-2 text-muted">{fetchingLocation ? 'Getting your location...' : 'Creating emergency alert...'}</p>
                </div>
              )}

              <hr />
              <div className="text-muted small">
                <strong>Quick Dial (No Alert):</strong>
                <div className="d-flex gap-2 mt-2 flex-wrap">
                  <Button size="sm" variant="outline-secondary" onClick={() => makePhoneCall('100')}>
                    Police 100
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => makePhoneCall('1091')}>
                    Women 1091
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => makePhoneCall('108')}>
                    Ambulance 108
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => makePhoneCall('112')}>
                    Emergency 112
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

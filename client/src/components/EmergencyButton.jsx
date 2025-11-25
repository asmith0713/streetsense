import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone, ShieldAlert, HeartPulse, Eye, X, MapPin, Loader2 } from 'lucide-react';
import API from '../api';

export default function EmergencyButton({ userLocation, onEmergencyCreated, onLocationRequest }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);
  const [personalContacts, setPersonalContacts] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(userLocation);

  useEffect(() => {
    setCurrentLocation(userLocation);
  }, [userLocation]);

  const handleShow = () => {
    setShow(true);
    setError(null);
    setSuccess(false);
    if (!userLocation && !fetchingLocation) {
      requestLocation();
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setFetchingLocation(true);
    setError(null);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: isMobile ? 10000 : 30000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = [latitude, longitude];
        setCurrentLocation(newLocation);
        setFetchingLocation(false);
        if (onLocationRequest) onLocationRequest(newLocation);
      },
      (err) => {
        console.error('Location error:', err);
        setError('Failed to get location. Please enable GPS.');
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
      setError('Fetching location... Please wait.');
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
      setPersonalContacts(response.data.personalContacts || []);
      setSuccess(true);
      if (onEmergencyCreated) onEmergencyCreated(response.data);
      
      // Auto-close after showing contacts for a while
      // setTimeout(handleClose, 15000); 
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
      <motion.button
        whileHover={{ scale: 1.1 }}
        onClick={handleShow}
        className="position-fixed rounded-circle d-flex align-items-center justify-content-center border-0 shadow-lg emergency-sos-btn"
        style={{
          bottom: '30px',
          right: '30px',
          width: '64px',
          height: '64px',
          zIndex: 1050
        }}
      >
        <span className="fw-bold fs-5">SOS</span>
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {show && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1060 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="modal-backdrop-dark position-absolute top-0 start-0 w-100 h-100"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel p-4 rounded-4 shadow-2xl position-relative mx-3"
              style={{ width: '100%', maxWidth: '450px', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <button 
                onClick={handleClose}
                className="btn btn-link text-muted position-absolute top-0 end-0 p-3 text-decoration-none"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-4">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10 p-3 mb-3">
                  <ShieldAlert size={32} className="text-danger" />
                </div>
                <h3 className="fw-bold mb-1">Emergency Assistance</h3>
                <p className="text-muted small">Only use in genuine emergencies</p>
              </div>

              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 p-2 small mb-3">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {fetchingLocation && (
                <div className="alert alert-info d-flex align-items-center gap-2 p-2 small mb-3">
                  <Loader2 size={16} className="animate-spin" />
                  Acquiring precise location...
                </div>
              )}

              {success && emergencyContacts ? (
                <div className="text-center">
                  <div className="alert alert-success p-3 mb-4">
                    <div className="fw-bold mb-1">Alert Sent Successfully</div>
                    <div className="small">Authorities have been notified of your location.</div>
                  </div>
                  
                  {personalContacts && personalContacts.length > 0 && (
                    <>
                      <h6 className="text-start text-muted text-uppercase small fw-bold mb-3">My Contacts</h6>
                      <div className="d-grid gap-2 mb-4">
                        {personalContacts.map((contact, idx) => (
                          <button key={idx} onClick={() => makePhoneCall(contact.phone)} className="btn btn-outline-primary d-flex align-items-center justify-content-between p-3">
                            <span className="d-flex align-items-center gap-2">
                              <Phone size={18} /> 
                              <span className="text-truncate" style={{maxWidth: '120px'}}>{contact.name}</span>
                              {contact.relationship && <span className="badge bg-secondary text-body border">{contact.relationship}</span>}
                            </span>
                            <span className="fw-bold">{contact.phone}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <h6 className="text-start text-muted text-uppercase small fw-bold mb-3">Emergency Contacts</h6>
                  <div className="d-grid gap-2">
                    <button onClick={() => makePhoneCall(emergencyContacts.police)} className="btn btn-outline-danger d-flex align-items-center justify-content-between p-3">
                      <span className="d-flex align-items-center gap-2"><Phone size={18} /> Police</span>
                      <span className="fw-bold">{emergencyContacts.police}</span>
                    </button>
                    <button onClick={() => makePhoneCall(emergencyContacts.womenHelpline)} className="btn btn-outline-danger d-flex align-items-center justify-content-between p-3">
                      <span className="d-flex align-items-center gap-2"><Phone size={18} /> Women Helpline</span>
                      <span className="fw-bold">{emergencyContacts.womenHelpline}</span>
                    </button>
                    <button onClick={() => makePhoneCall(emergencyContacts.ambulance)} className="btn btn-outline-danger d-flex align-items-center justify-content-between p-3">
                      <span className="d-flex align-items-center gap-2"><Phone size={18} /> Ambulance</span>
                      <span className="fw-bold">{emergencyContacts.ambulance}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="d-grid gap-3">
                  <button
                    onClick={() => createEmergency('harassment', 'critical')}
                    disabled={loading || fetchingLocation}
                    className="btn btn-danger p-3 d-flex align-items-center gap-3 text-start shadow-sm hover-scale"
                  >
                    <ShieldAlert size={24} />
                    <div>
                      <div className="fw-bold">Harassment / Threat</div>
                      <div className="small opacity-75">Immediate police assistance</div>
                    </div>
                  </button>

                  <button
                    onClick={() => createEmergency('assault', 'critical')}
                    disabled={loading || fetchingLocation}
                    className="btn btn-danger p-3 d-flex align-items-center gap-3 text-start shadow-sm hover-scale"
                  >
                    <AlertTriangle size={24} />
                    <div>
                      <div className="fw-bold">Physical Assault</div>
                      <div className="small opacity-75">Critical emergency response</div>
                    </div>
                  </button>

                  <button
                    onClick={() => createEmergency('stalking', 'high')}
                    disabled={loading || fetchingLocation}
                    className="btn btn-warning p-3 d-flex align-items-center gap-3 text-start shadow-sm hover-scale"
                  >
                    <Eye size={24} />
                    <div>
                      <div className="fw-bold">Stalking / Following</div>
                      <div className="small opacity-75">Report suspicious activity</div>
                    </div>
                  </button>

                  <button
                    onClick={() => createEmergency('medical', 'high')}
                    disabled={loading || fetchingLocation}
                    className="btn btn-info text-white p-3 d-flex align-items-center gap-3 text-start shadow-sm hover-scale"
                  >
                    <HeartPulse size={24} />
                    <div>
                      <div className="fw-bold">Medical Emergency</div>
                      <div className="small opacity-75">Ambulance required</div>
                    </div>
                  </button>
                </div>
              )}

              {!success && (
                <div className="mt-4 pt-3 border-top">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small fw-bold">Quick Dial</span>
                  </div>
                  <div className="d-flex gap-2 justify-content-between">
                    <button onClick={() => makePhoneCall('100')} className="btn btn-sm btn-light flex-grow-1">Police 100</button>
                    <button onClick={() => makePhoneCall('1091')} className="btn btn-sm btn-light flex-grow-1">Women 1091</button>
                    <button onClick={() => makePhoneCall('108')} className="btn btn-sm btn-light flex-grow-1">Amb 108</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

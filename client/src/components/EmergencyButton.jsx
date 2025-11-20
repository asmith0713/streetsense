import React, { useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import API from '../api';

export default function EmergencyButton({ userLocation, onEmergencyCreated }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleShow = () => {
    setShow(true);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    setShow(false);
    setError(null);
    setSuccess(false);
  };

  const createEmergency = async (type, severity = 'high') => {
    if (!userLocation) {
      setError('Location required. Please enable location services.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [lat, lng] = userLocation;
      
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
                  disabled={loading}
                  size="lg"
                >
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Harassment / Eve-Teasing
                </Button>
                
                <Button
                  variant="danger"
                  onClick={() => createEmergency('assault', 'critical')}
                  disabled={loading}
                  size="lg"
                >
                  <i className="bi bi-shield-exclamation me-2"></i>
                  Physical Assault
                </Button>
                
                <Button
                  variant="danger"
                  onClick={() => createEmergency('stalking', 'high')}
                  disabled={loading}
                  size="lg"
                >
                  <i className="bi bi-eye-fill me-2"></i>
                  Stalking / Following
                </Button>
                
                <Button
                  variant="warning"
                  onClick={() => createEmergency('medical', 'high')}
                  disabled={loading}
                >
                  <i className="bi bi-heart-pulse-fill me-2"></i>
                  Medical Emergency
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => createEmergency('general', 'medium')}
                  disabled={loading}
                >
                  <i className="bi bi-exclamation-circle-fill me-2"></i>
                  Other Emergency
                </Button>
              </div>

              {loading && (
                <div className="text-center mt-3">
                  <div className="spinner-border text-danger" role="status">
                    <span className="visually-hidden">Creating alert...</span>
                  </div>
                  <p className="mt-2 text-muted">Creating emergency alert...</p>
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

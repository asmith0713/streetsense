import React from 'react';
import { Modal, Button } from 'react-bootstrap';

export default function LocationPermissionGuide({ show, onClose }) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-geo-alt-fill text-primary me-2"></i>
          Enable Location Access
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <strong>Location access is required for:</strong>
          <ul className="mt-2">
            <li>Reporting issues at your location</li>
            <li>Emergency SOS features</li>
            <li>Real-time tracking on map</li>
          </ul>
        </div>

        {isIOS && (
          <div className="alert alert-info">
            <strong>iOS Safari:</strong>
            <ol className="mb-0 mt-2">
              <li>Go to <strong>Settings</strong> → <strong>Safari</strong></li>
              <li>Scroll to <strong>Location</strong></li>
              <li>Select <strong>Ask</strong> or <strong>Allow</strong></li>
              <li>Refresh this page and allow location when prompted</li>
            </ol>
          </div>
        )}

        {isAndroid && isChrome && (
          <div className="alert alert-info">
            <strong>Android Chrome:</strong>
            <ol className="mb-0 mt-2">
              <li>Tap the lock icon or (i) in the address bar</li>
              <li>Tap <strong>Permissions</strong></li>
              <li>Enable <strong>Location</strong></li>
              <li>Refresh this page</li>
            </ol>
            <p className="mt-2 mb-0 small">
              Or: Settings → Apps → Chrome → Permissions → Location → Allow
            </p>
          </div>
        )}

        {!isIOS && !isAndroid && (
          <div className="alert alert-info">
            <strong>Desktop Browser:</strong>
            <ol className="mb-0 mt-2">
              <li>Click the lock icon in the address bar</li>
              <li>Find "Location" permission</li>
              <li>Change to "Allow"</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        )}

        <div className="alert alert-warning mt-3">
          <strong>⚠️ Important:</strong> This site requires <strong>HTTPS</strong> for geolocation to work on mobile devices.
          {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
            <div className="mt-2">
              <strong>Current:</strong> {window.location.protocol}{'//'}
              <br />
              Please access via: <code>https://{window.location.host}</code>
            </div>
          )}
        </div>

        <div className="text-muted small">
          <strong>Still not working?</strong>
          <ul className="mb-0 mt-1">
            <li>Ensure GPS/Location Services are enabled on your device</li>
            <li>Check you have a good internet connection</li>
            <li>Try restarting your browser</li>
          </ul>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          Got it
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Smartphone, Globe, Lock, X, AlertTriangle } from 'lucide-react';

export default function LocationPermissionGuide({ show, onClose }) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);

  return (
    <AnimatePresence>
      {show && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 10000 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="modal-backdrop-dark position-absolute top-0 start-0 w-100 h-100"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-panel p-0 rounded-4 shadow-2xl position-relative mx-3 d-flex flex-column"
            style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div className="p-4 border-bottom border-light d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-primary bg-opacity-10 p-2 rounded-circle text-primary">
                  <MapPin size={20} />
                </div>
                <h5 className="fw-bold mb-0">Enable Location Access</h5>
              </div>
              <button onClick={onClose} className="btn btn-link text-muted p-0 text-decoration-none">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 overflow-auto custom-scrollbar">
              <div className="mb-4">
                <p className="text-muted small mb-3">Location access is required for:</p>
                <div className="d-flex gap-2 flex-wrap">
                  <span className="badge bg-secondary text-body border fw-normal p-2">📍 Reporting issues</span>
                  <span className="badge bg-secondary text-body border fw-normal p-2">🆘 Emergency SOS</span>
                  <span className="badge bg-secondary text-body border fw-normal p-2">🗺️ Live tracking</span>
                </div>
              </div>

              {isIOS && (
                <div className="alert alert-info border-0 bg-info bg-opacity-10 text-body mb-3">
                  <div className="d-flex align-items-center gap-2 fw-bold mb-2">
                    <Smartphone size={18} /> iOS Safari
                  </div>
                  <ol className="mb-0 ps-3 small">
                    <li className="mb-1">Go to <strong>Settings</strong> → <strong>Safari</strong></li>
                    <li className="mb-1">Scroll to <strong>Location</strong></li>
                    <li className="mb-1">Select <strong>Ask</strong> or <strong>Allow</strong></li>
                    <li>Refresh this page and allow location</li>
                  </ol>
                </div>
              )}

              {isAndroid && isChrome && (
                <div className="alert alert-info border-0 bg-info bg-opacity-10 text-body mb-3">
                  <div className="d-flex align-items-center gap-2 fw-bold mb-2">
                    <Smartphone size={18} /> Android Chrome
                  </div>
                  <ol className="mb-0 ps-3 small">
                    <li className="mb-1">Tap the lock icon <Lock size={12} /> in address bar</li>
                    <li className="mb-1">Tap <strong>Permissions</strong></li>
                    <li className="mb-1">Enable <strong>Location</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              )}

              {!isIOS && !isAndroid && (
                <div className="alert alert-info border-0 bg-info bg-opacity-10 text-body mb-3">
                  <div className="d-flex align-items-center gap-2 fw-bold mb-2">
                    <Globe size={18} /> Desktop Browser
                  </div>
                  <ol className="mb-0 ps-3 small">
                    <li className="mb-1">Click the lock icon <Lock size={12} /> in address bar</li>
                    <li className="mb-1">Find "Location" permission</li>
                    <li className="mb-1">Change to "Allow"</li>
                    <li>Refresh the page</li>
                  </ol>
                </div>
              )}

              <div className="alert alert-warning border-0 bg-warning bg-opacity-10 text-body d-flex gap-2 align-items-start">
                <AlertTriangle size={18} className="mt-1 flex-shrink-0" />
                <div className="small">
                  <strong>HTTPS Required:</strong> Geolocation only works on secure (https) connections or localhost.
                </div>
              </div>
            </div>

            <div className="p-4 border-top rounded-bottom-4" style={{backgroundColor: 'var(--secondary)'}}>
              <button onClick={onClose} className="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

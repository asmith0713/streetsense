import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ open, title = 'Confirm', message, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="modal-backdrop-dark position-absolute top-0 start-0 w-100 h-100"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-panel p-4 rounded-4 shadow-2xl position-relative mx-3"
            style={{ width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div className="d-flex flex-column align-items-center text-center mb-4">
              <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-warning bg-opacity-10 p-3 mb-3">
                <AlertTriangle size={32} className="text-warning" />
              </div>
              <h4 className="fw-bold mb-2">{title}</h4>
              <p className="text-muted mb-0">{message}</p>
            </div>

            <div className="d-flex gap-2">
              <button 
                className="btn btn-light border flex-grow-1 py-2 fw-bold" 
                onClick={onCancel}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger flex-grow-1 py-2 fw-bold shadow-sm" 
                onClick={onConfirm}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// client/src/components/Lightbox.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Lightbox({ src, alt = '', open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="lightbox-backdrop position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-50"
          style={{ zIndex: 9999 }}
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="position-relative p-2"
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="btn btn-dark rounded-circle position-absolute top-0 end-0 m-3 d-flex align-items-center justify-content-center"
              style={{ width: '40px', height: '40px', zIndex: 10 }}
              onClick={onClose}
            >
              <X size={24} />
            </button>
            <img 
              src={src} 
              alt={alt} 
              className="img-fluid rounded shadow-lg"
              style={{ maxHeight: '90vh', maxWidth: '95vw' }} 
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

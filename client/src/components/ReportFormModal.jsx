import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, AlertTriangle, Image as ImageIcon, Send } from 'lucide-react';

export default function ReportFormModal({ lat, lng, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('safety');
  const [photo, setPhoto] = useState(null);

  function submit(e) {
    e.preventDefault();
    
    if (!title || title.trim().length === 0) return alert('Title is required');
    if (title.length > 200) return alert('Title must be less than 200 characters');
    if (description.length > 2000) return alert('Description must be less than 2000 characters');
    if (isNaN(lat) || isNaN(lng)) return alert('Invalid location coordinates');
    if (photo && photo.size > 5 * 1024 * 1024) return alert('Image must be less than 5MB');
    
    onSubmit({ title, description, category, lat, lng, photo });
  }

  return (
    <AnimatePresence>
      <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999 }}>
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
          style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <div className="p-4 border-bottom border-light">
            <div className="d-flex justify-content-between align-items-center">
              <h4 className="fw-bold mb-0">New Report</h4>
              <button onClick={onClose} className="btn btn-link text-muted p-0 text-decoration-none">
                <X size={24} />
              </button>
            </div>
            <div className="d-flex align-items-center gap-2 text-muted small mt-2">
              <MapPin size={14} />
              <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
            </div>
          </div>

          <div className="p-4 overflow-auto custom-scrollbar">
            <form id="report-form" onSubmit={submit}>
              <div className="mb-4">
                <label className="form-label fw-bold small text-uppercase text-muted">Title</label>
                <input 
                  className="form-control input-modern" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required 
                  placeholder="What's the issue?" 
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold small text-uppercase text-muted">Category</label>
                <select 
                  className="form-select input-modern" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="safety">Safety Hazard</option>
                  <option value="traffic">Traffic Issue</option>
                  <option value="water">Water / Drainage</option>
                  <option value="garbage">Garbage / Sanitation</option>
                  <option value="noise">Noise Pollution</option>
                  <option value="stray">Stray Animals</option>
                  <optgroup label="Women's Safety">
                    <option value="harassment">Harassment</option>
                    <option value="eve-teasing">Eve-Teasing</option>
                    <option value="assault">Assault</option>
                    <option value="stalking">Stalking</option>
                  </optgroup>
                  <option value="other">Other</option>
                </select>
                
                {['harassment', 'eve-teasing', 'assault', 'stalking'].includes(category) && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mt-2 p-2 small">
                    <AlertTriangle size={16} />
                    For immediate emergencies, please use the SOS button.
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold small text-uppercase text-muted">Description</label>
                <textarea 
                  className="form-control input-modern" 
                  rows="4" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the situation in detail..."
                ></textarea>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold small text-uppercase text-muted">Photo Evidence</label>
                <div className="input-group">
                  <span className="input-group-text input-group-bg border-end-0">
                    <ImageIcon size={18} className="text-muted" />
                  </span>
                  <input 
                    type="file" 
                    className="form-control input-modern border-start-0 ps-0" 
                    accept="image/*" 
                    onChange={e => setPhoto(e.target.files[0])} 
                  />
                </div>
                <div className="form-text small">Max size: 5MB</div>
              </div>
            </form>
          </div>

          <div className="p-4 border-top rounded-bottom-4 d-flex justify-content-end gap-2" style={{backgroundColor: 'var(--secondary)'}}>
            <button type="button" className="btn btn-light border" onClick={onClose}>Cancel</button>
            <button type="submit" form="report-form" className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
              <Send size={16} />
              Submit Report
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
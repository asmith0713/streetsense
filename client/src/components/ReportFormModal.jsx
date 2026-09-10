import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, AlertTriangle, Image as ImageIcon, Send } from 'lucide-react';
import { CATEGORIES, SAFETY_CATEGORIES } from '../constants';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export default function ReportFormModal({ lat, lng, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('safety');
  const [photo, setPhoto] = useState(null);
  const [formError, setFormError] = useState('');

  // Check the photo here so the user finds out immediately, instead of after
  // waiting through an upload the server will reject.
  function handlePhotoChange(e) {
    const file = e.target.files[0];
    setFormError('');

    if (!file) {
      setPhoto(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFormError('That image type is not supported. Use JPEG, PNG, GIF or WEBP.');
      e.target.value = '';
      setPhoto(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFormError(`That photo is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${MAX_PHOTO_BYTES / 1024 / 1024}MB.`);
      e.target.value = '';
      setPhoto(null);
      return;
    }
    setPhoto(file);
  }

  function submit(e) {
    e.preventDefault();
    setFormError('');

    if (!title || title.trim().length === 0) return setFormError('Please add a title.');
    if (title.length > 200) return setFormError('Title must be under 200 characters.');
    if (description.length > 2000) return setFormError('Description must be under 2000 characters.');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return setFormError('Invalid location coordinates.');

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
              {formError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 p-2 small">
                  <AlertTriangle size={16} /> {formError}
                </div>
              )}
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
                  {CATEGORIES.filter(c => !c.safety && c.value !== 'other').map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                  <optgroup label="Women's Safety">
                    {CATEGORIES.filter(c => c.safety).map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </optgroup>
                  <option value="other">Other</option>
                </select>
                
                {SAFETY_CATEGORIES.includes(category) && (
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
                    onChange={handlePhotoChange} 
                  />
                </div>
                <div className="form-text small">JPEG, PNG, GIF or WEBP, up to 8MB. Location data is removed before upload.</div>
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
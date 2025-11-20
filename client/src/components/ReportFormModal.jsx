import React, { useState } from 'react';

export default function ReportFormModal({ lat, lng, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('safety');
  const [photo, setPhoto] = useState(null);

  function submit(e) {
    e.preventDefault();
    
    // Validate title
    if (!title || title.trim().length === 0) {
      return alert('Title is required');
    }
    
    if (title.length > 200) {
      return alert('Title must be less than 200 characters');
    }
    
    // Validate description
    if (description.length > 2000) {
      return alert('Description must be less than 2000 characters');
    }
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return alert('Invalid location coordinates');
    }
    
    // Validate photo size
    if (photo && photo.size > 5 * 1024 * 1024) {
      return alert('Image must be less than 5MB');
    }
    
    onSubmit({ title, description, category, lat, lng, photo });
  }

  return (
    <>
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }} tabIndex="-1"
        onClick={(e)=>{
          if(e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ margin: '1rem' }}>
          <div className="modal-content" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="modal-header">
              <h5 className="modal-title">New Report</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="mb-3">
                    <small className="text-muted"><i className="bi bi-geo-alt"></i> {lat.toFixed(5)}, {lng.toFixed(5)}</small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Pothole on Main St" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="safety">Safety</option>
                    <option value="traffic">Traffic</option>
                    <option value="water">Water</option>
                    <option value="garbage">Garbage</option>
                    <option value="noise">Noise</option>
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
                    <small className="text-danger mt-1 d-block">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      For immediate emergencies, use the SOS button instead
                    </small>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows="2" value={description} onChange={e => setDescription(e.target.value)}></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label">Photo</label>
                  <input type="file" className="form-control" accept="image/*" onChange={e => setPhoto(e.target.files[0])} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show"></div>
    </>
  );
}
import React, { useState } from 'react';

export default function ReportFormModal({ lat, lng, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('safety');
  const [photo, setPhoto] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (!title) return alert('Title is required');
    onSubmit({ title, description, category, lat, lng, photo });
  }

  return (
    <>
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
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
                    {['safety','traffic','water','garbage','noise','stray','other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
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
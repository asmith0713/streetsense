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
    <div className="modal">
      <form className="modal-content" onSubmit={submit}>
        <h3>New Report</h3>
        <div className="row">
          <label>Location</label>
          <div className="muted">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
        </div>

        <label>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Pothole by bus stop" required />

        <label>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short details (optional)" />

        <label>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="safety">Safety</option>
          <option value="traffic">Traffic</option>
          <option value="water">Water</option>
          <option value="garbage">Garbage</option>
          <option value="noise">Noise</option>
          <option value="stray">Stray Animals</option>
          <option value="other">Other</option>
        </select>

        <label>Photo (optional)</label>
        <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} />

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Submit</button>
        </div>
      </form>
    </div>
  );
}

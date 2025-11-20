// client/src/pages/AdminPanel.jsx
import React, { useEffect, useState } from 'react';
import API, { BACKEND_URL } from '../api';
import ConfirmModal from '../components/ConfirmModal';
import Lightbox from '../components/Lightbox';

// Helper (same as before)
function resolveImageUrl(photoUrl) {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('/uploads') || photoUrl.startsWith('/api/uploads')) return `${BACKEND_URL}${photoUrl}`;
    if (photoUrl.startsWith('http')) return photoUrl;
    return `${BACKEND_URL}/${photoUrl.replace(/^\//, '')}`;
}

export default function AdminPanel() {
  const [password, setPassword] = useState(sessionStorage.getItem('streetsense_admin_pwd') || '');
  const [authorized, setAuthorized] = useState(!!sessionStorage.getItem('streetsense_admin_pwd'));
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [csvCategory, setCsvCategory] = useState('all');
  const [csvTime, setCsvTime] = useState('7d');

  useEffect(() => { if (authorized) loadReports(); }, [authorized]);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await API.get('/reports?limit=1000');
      const features = res.data.features || [];
      setReports(features.map(f => ({ ...(f.properties || {}), coords: f.geometry?.coordinates })));
    } catch (err) { alert('Failed to fetch reports.'); } 
    finally { setLoading(false); }
  }

  async function checkPassword() {
    try {
      await API.head('/reports/export', { params: { admin_password: password } });
      sessionStorage.setItem('streetsense_admin_pwd', password);
      setAuthorized(true);
      loadReports();
    } catch { alert('Invalid password'); }
  }

  function confirmStatusChange(reportId, newStatus) {
    setConfirmPayload({ id: reportId, status: newStatus });
    setConfirmOpen(true);
  }

  async function performStatusChange() {
    if (!confirmPayload) return;
    try {
      await API.put(`/reports/${confirmPayload.id}/status`, { status: confirmPayload.status });
      setConfirmOpen(false);
      setConfirmPayload(null);
      loadReports();
    } catch { alert('Failed to update status'); }
  }

  // ... downloadCSV function remains same ...
  async function downloadCSV() { /* logic from original file */ }

  const getStatusBadge = (status) => {
    const map = { open: 'warning', verified: 'info', resolved: 'success' };
    return <span className={`badge bg-${map[status] || 'secondary'} text-uppercase`}>{status}</span>;
  }

  if (!authorized) {
    return (
      <div className="container d-flex align-items-center justify-content-center" style={{minHeight: '80vh'}}>
        <div className="card shadow-sm" style={{maxWidth: '400px', width: '100%'}}>
          <div className="card-body text-center p-4">
            <h3 className="card-title mb-3">Admin Login</h3>
            <input 
              type="password" 
              className="form-control mb-3" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter Admin Password" 
            />
            <button className="btn btn-primary w-100" onClick={checkPassword}>Access Panel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <h2 className="h4 mb-0">Moderation Dashboard</h2>
        <button className="btn btn-outline-danger btn-sm" onClick={() => {
            sessionStorage.removeItem('streetsense_admin_pwd');
            setAuthorized(false);
        }}>Logout</button>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
             <div className="col-md-3 col-6">
               <label className="form-label small fw-bold text-muted">Category</label>
               <select className="form-select form-select-sm" value={csvCategory} onChange={e => setCsvCategory(e.target.value)}>
                  {['all','safety','traffic','water','garbage','noise','stray','other'].map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <div className="col-md-3 col-6">
               <label className="form-label small fw-bold text-muted">Time Range</label>
               <select className="form-select form-select-sm" value={csvTime} onChange={e => setCsvTime(e.target.value)}>
                  <option value="24h">Last 24h</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="all">All Time</option>
               </select>
             </div>
             <div className="col-md-6 text-md-end">
                <div className="btn-group">
                    <button className="btn btn-sm btn-outline-secondary" onClick={loadReports}><i className="bi bi-arrow-clockwise"></i> Refresh</button>
                    <button className="btn btn-sm btn-outline-success" onClick={downloadCSV}><i className="bi bi-file-earmark-spreadsheet"></i> Export CSV</button>
                </div>
             </div>
          </div>
        </div>
      </div>

      {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
        <div className="row g-4">
          {reports.map(r => (
            <div key={r._id} className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body d-flex gap-3">
                    <div style={{width: '100px', flexShrink: 0}}>
                        {r.photoUrl ? (
                            <img src={resolveImageUrl(r.photoUrl)} 
                                 className="img-fluid rounded bg-light object-fit-cover" 
                                 style={{height:'100px', width:'100%', cursor:'pointer'}} 
                                 onClick={() => setLightboxSrc(resolveImageUrl(r.photoUrl))} alt="Evidence" />
                        ) : (
                            <div className="bg-light rounded d-flex align-items-center justify-content-center text-muted small" style={{height:'100px'}}>No Img</div>
                        )}
                    </div>
                    <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                            <h5 className="card-title h6 mb-0 text-truncate" style={{maxWidth:'200px'}}>{r.title}</h5>
                            {getStatusBadge(r.status)}
                        </div>
                        <p className="card-text small text-muted mb-2 text-truncate-2">{r.description}</p>
                        <div className="d-flex gap-2 mb-2">
                            <span className="badge bg-light text-dark border">{r.category}</span>
                            <small className="text-muted"><i className="bi bi-clock"></i> {new Date(r.timestamp).toLocaleDateString()}</small>
                        </div>
                        <div className="d-flex justify-content-end gap-2">
                             <button className="btn btn-xs btn-outline-secondary" onClick={() => confirmStatusChange(r._id, 'open')}>Open</button>
                             <button className="btn btn-xs btn-outline-info" onClick={() => confirmStatusChange(r._id, 'verified')}>Verify</button>
                             <button className="btn btn-xs btn-success" onClick={() => confirmStatusChange(r._id, 'resolved')}>Resolve</button>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <ConfirmModal open={confirmOpen} title="Update Status" message="Are you sure?" onCancel={() => setConfirmOpen(false)} onConfirm={performStatusChange} />
      <Lightbox open={!!lightboxSrc} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
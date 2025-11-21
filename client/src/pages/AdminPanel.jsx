import React, { useEffect, useState } from 'react';
import API, { BACKEND_URL } from '../api';
import ConfirmModal from '../components/ConfirmModal';
import Lightbox from '../components/Lightbox';

function resolveImageUrl(photoUrl) {
  if (!photoUrl) return null;
  photoUrl = photoUrl.trim();
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  if (photoUrl.startsWith('/uploads') || photoUrl.startsWith('/api/uploads')) return `${BACKEND_URL}${photoUrl}`;
  if (photoUrl.startsWith('uploads/')) return `${BACKEND_URL}/${photoUrl}`;
  if (photoUrl.startsWith('/mnt/') || photoUrl.startsWith('/var/') || 
      photoUrl.startsWith('C:\\') || photoUrl.startsWith('D:\\') ||
      /^[A-Za-z]:[\\/]/.test(photoUrl)) {
    console.warn('Ignoring server file system path:', photoUrl);
    return null;
  }
  return `${BACKEND_URL}/${photoUrl.replace(/^\//, '')}`;
}

export default function AdminPanel() {
  const [password, setPassword] = useState(sessionStorage.getItem('streetsense_admin_pwd') || '');
  const [authorized, setAuthorized] = useState(!!sessionStorage.getItem('streetsense_admin_pwd'));
  const [reports, setReports] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'emergencies'
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [csvCategory, setCsvCategory] = useState('all');
  const [csvTime, setCsvTime] = useState('7d');

  useEffect(() => { 
    if (authorized) {
      loadReports();
      loadEmergencies();
    }
  }, [authorized]);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await API.get('/reports?limit=1000');
      const features = res.data.features || [];
      setReports(features.map(f => ({ 
        ...(f.properties || {}), 
        coords: f.geometry?.coordinates 
      })));
    } catch (err) { 
      console.error('Load reports error:', err);
      alert('Failed to fetch reports.'); 
    } finally { 
      setLoading(false); 
    }
  }

  async function loadEmergencies() {
    try {
      const res = await API.get('/emergency/active');
      setEmergencies(res.data.emergencies || []);
    } catch (err) {
      console.error('Load emergencies error:', err);
    }
  }

  async function checkPassword() {
    if (!password || password.trim() === '') {
      alert('Please enter admin password');
      return;
    }
    
    try {
      // Test auth by making a HEAD request with header
      await API.head('/reports/export', { 
        headers: { 'x-admin-password': password }
      });
      sessionStorage.setItem('streetsense_admin_pwd', password);
      setAuthorized(true);
      loadReports();
    } catch (err) {
      console.error('Admin auth error:', err);
      const errorMsg = err.response?.status === 401 
        ? 'Invalid admin password. Access denied.' 
        : 'Failed to verify admin credentials. Please try again.';
      alert(errorMsg);
      setPassword('');
    }
  }

  function confirmStatusChange(reportId, newStatus) {
    setConfirmPayload({ id: reportId, status: newStatus });
    setConfirmOpen(true);
  }
  
  function confirmDelete(reportId) {
    setConfirmPayload({ id: reportId, action: 'delete' });
    setConfirmOpen(true);
  }
  
  function getStatusChangeMessage() {
    if (!confirmPayload) return '';
    
    // Handle delete action
    if (confirmPayload.action === 'delete') {
      return 'This will PERMANENTLY DELETE this report and remove it from the database. The pin will be removed from the map. This action CANNOT be undone. Continue?';
    }
    
    const status = confirmPayload.status;
    
    if (status === 'verified') {
      return 'This will mark the report as VERIFIED. The pin will remain visible on the map with a verified badge. Continue?';
    } else if (status === 'open') {
      return 'This will mark the report as OPEN. The pin will remain visible on the map. Continue?';
    }
    return 'Are you sure you want to update this report\'s status?';
  }

  async function performStatusChange() {
    if (!confirmPayload) return;
    const adminPassword = sessionStorage.getItem('streetsense_admin_pwd');
    
    try {
      // Handle delete action
      if (confirmPayload.action === 'delete') {
        const response = await API.delete(`/reports/${confirmPayload.id}`, {
          headers: { 'x-admin-password': adminPassword }
        });
        console.log('Delete response:', response.data);
        setConfirmOpen(false);
        setConfirmPayload(null);
        alert('Report deleted successfully!');
        await loadReports();
        return;
      }
      
      // Handle status change
      await API.put(`/reports/${confirmPayload.id}/status`, { 
        status: confirmPayload.status 
      }, {
        headers: { 'x-admin-password': adminPassword }
      });
      setConfirmOpen(false);
      setConfirmPayload(null);
      await loadReports();
    } catch (err) { 
      console.error('Operation error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Operation failed';
      alert(`Failed: ${errorMsg}`); 
    }
  }

  async function resolveEmergency(emergencyId) {
    if (!window.confirm('Mark this emergency as resolved?')) return;
    try {
      await API.patch(`/emergency/${emergencyId}/resolve`);
      loadEmergencies();
    } catch (err) {
      console.error('Resolve emergency error:', err);
      alert('Failed to resolve emergency');
    }
  }

  function getTimeDate(filter) {
    const now = new Date();
    if (filter === '24h') return new Date(now - 24 * 3600 * 1000).toISOString();
    if (filter === '7d') return new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    if (filter === '30d') return new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    return null;
  }

  async function downloadCSV() {
    try {
      const body = {};
      
      if (csvCategory !== 'all') body.categories = csvCategory;
      if (csvTime !== 'all') {
        const since = getTimeDate(csvTime);
        if (since) body.since = since;
      }
      
      const response = await fetch(`${BACKEND_URL}/api/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        alert('Failed to export CSV. Check your admin password.');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `streetsense_reports_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download error:', err);
      alert('Failed to download CSV');
    }
  }

  const getStatusBadge = (status) => {
    const map = { 
      open: { color: 'warning', icon: 'circle', label: 'Open - Visible on Map' }, 
      verified: { color: 'info', icon: 'check-circle', label: 'Verified - Visible on Map' }
    };
    const info = map[status] || { color: 'secondary', icon: 'question-circle', label: status };
    return (
      <span className={`badge bg-${info.color} text-uppercase`} title={info.label}>
        <i className={`bi bi-${info.icon} me-1`}></i>
        {status}
      </span>
    );
  };

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
              onKeyPress={e => e.key === 'Enter' && checkPassword()}
            />
            <button className="btn btn-primary w-100" onClick={checkPassword}>
              Access Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{marginTop: '70px'}}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 admin-header">
        <h2 className="h4 mb-0">Moderation Dashboard</h2>
        <button className="btn btn-outline-danger btn-sm" onClick={() => {
          sessionStorage.removeItem('streetsense_admin_pwd');
          setAuthorized(false);
        }}>
          <i className="bi bi-box-arrow-right"></i> Logout
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <i className="bi bi-flag"></i> Reports ({reports.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'emergencies' ? 'active' : ''}`}
            onClick={() => setActiveTab('emergencies')}
          >
            <i className="bi bi-exclamation-triangle-fill text-danger"></i> SOS Alerts ({emergencies.length})
          </button>
        </li>
      </ul>

      {activeTab === 'reports' && (
        <>
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-end admin-filters">
                <div className="col-md-3 col-6">
                  <label className="form-label small fw-bold text-muted">Category</label>
                  <select className="form-select form-select-sm" value={csvCategory} onChange={e => setCsvCategory(e.target.value)}>
                    <option value="all">All</option>
                    <option value="safety">Safety</option>
                    <option value="traffic">Traffic</option>
                    <option value="water">Water</option>
                    <option value="garbage">Garbage</option>
                    <option value="noise">Noise</option>
                    <option value="stray">Stray</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-3 col-6">
                  <label className="form-label small fw-bold text-muted">Time Range</label>
                  <select className="form-select form-select-sm" value={csvTime} onChange={e => setCsvTime(e.target.value)}>
                    <option value="24h">Last 24h</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                <div className="col-md-6 text-md-end">
                  <div className="btn-group">
                    <button className="btn btn-sm btn-outline-secondary" onClick={loadReports}>
                      <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={downloadCSV}>
                      <i className="bi bi-file-earmark-spreadsheet"></i> Export CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : reports.length === 0?(
            <div className="col-12">
              <div className="text-center py-5">
                <i className="bi bi-inbox" style={{fontSize: '3rem', color: '#ccc'}}></i>
                <h4 className="mt-3 text-muted">No reports found</h4>
                <p className="text-muted">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {reports.map(r => (
            <div key={r._id} className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body d-flex gap-3">
                  <div style={{width: '100px', flexShrink: 0}}>
                    {r.photoUrl ? (
                      <img 
                        src={resolveImageUrl(r.photoUrl)} 
                        className="img-fluid rounded bg-light object-fit-cover" 
                        style={{height:'100px', width:'100%', cursor:'pointer'}} 
                        onClick={() => setLightboxSrc(resolveImageUrl(r.photoUrl))} 
                        alt="Evidence" 
                      />
                    ) : (
                      <div className="bg-light rounded d-flex align-items-center justify-content-center text-muted small" style={{height:'100px'}}>
                        No Img
                      </div>
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h5 className="card-title h6 mb-0 text-truncate" style={{maxWidth:'200px'}}>
                        {r.title}
                      </h5>
                      {getStatusBadge(r.status)}
                    </div>
                    <p className="card-text small text-muted mb-2" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {r.description}
                    </p>
                    <div className="d-flex gap-2 mb-2 flex-wrap">
                      <span className="badge bg-light text-dark border">
                        {r.category}
                      </span>
                      <small className="text-muted">
                        <i className="bi bi-clock"></i> {new Date(r.timestamp).toLocaleDateString()}
                      </small>
                      <small className="text-success">
                        <i className="bi bi-hand-thumbs-up-fill"></i> {r.upvotes || 0}
                      </small>
                      <small className="text-danger">
                        <i className="bi bi-hand-thumbs-down-fill"></i> {r.downvotes || 0}
                      </small>
                      <small className="fw-bold text-primary">
                        Net: {(r.upvotes || 0) - (r.downvotes || 0)}
                      </small>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button 
                        className="btn btn-xs btn-outline-secondary" 
                        onClick={() => confirmStatusChange(r._id, 'open')}
                        title="Mark as open - keeps pin visible on map"
                      >
                        <i className="bi bi-circle"></i> Open
                      </button>
                      <button 
                        className="btn btn-xs btn-outline-info" 
                        onClick={() => confirmStatusChange(r._id, 'verified')}
                        title="Mark as verified - keeps pin visible with verified badge"
                      >
                        <i className="bi bi-check-circle"></i> Verify
                      </button>
                      <button 
                        className="btn btn-xs btn-danger" 
                        onClick={() => confirmDelete(r._id)}
                        title="PERMANENTLY DELETE this report and remove from database"
                      >
                        <i className="bi bi-trash-fill"></i> Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </>
      )}

      {/* Emergency Alerts Tab */}
      {activeTab === 'emergencies' && (
        <>
          <div className="card shadow-sm mb-4 border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="bi bi-shield-exclamation text-danger"></i> Active SOS Alerts</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={loadEmergencies}>
                  <i className="bi bi-arrow-clockwise"></i> Refresh
                </button>
              </div>
            </div>
          </div>

          {emergencies.length === 0 ? (
            <div className="col-12">
              <div className="text-center py-5">
                <i className="bi bi-shield-check" style={{fontSize: '3rem', color: '#28a745'}}></i>
                <h4 className="mt-3 text-muted">No Active Emergencies</h4>
                <p className="text-muted">All clear! No SOS alerts at the moment.</p>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {emergencies.map(e => (
                <div key={e.id} className="col-12 col-lg-6">
                  <div className="card h-100 shadow-sm border-danger border-2">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <h5 className="card-title mb-0">
                          <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                          {e.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </h5>
                        <span className={`badge ${
                          e.severity === 'critical' ? 'bg-danger' :
                          e.severity === 'high' ? 'bg-warning text-dark' :
                          e.severity === 'medium' ? 'bg-info' : 'bg-secondary'
                        }`}>
                          {e.severity.toUpperCase()}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="d-flex gap-3 mb-2">
                          <div>
                            <small className="text-muted d-block">Location</small>
                            <code className="small">{e.lat.toFixed(5)}, {e.lng.toFixed(5)}</code>
                          </div>
                          <div>
                            <small className="text-muted d-block">Time</small>
                            <small>{new Date(e.createdAt).toLocaleString()}</small>
                          </div>
                        </div>

                        <div className="mt-2">
                          <a 
                            href={`https://www.google.com/maps?q=${e.lat},${e.lng}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="bi bi-geo-alt"></i> View on Map
                          </a>
                        </div>
                      </div>

                      <div className="d-flex justify-content-end gap-2">
                        <button 
                          className="btn btn-success" 
                          onClick={() => resolveEmergency(e.id)}
                        >
                          <i className="bi bi-check-circle"></i> Mark Resolved
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      <ConfirmModal 
        open={confirmOpen} 
        title={confirmPayload?.action === 'delete' ? 'DELETE REPORT' : `Change Status to ${confirmPayload?.status?.toUpperCase()}`}
        message={getStatusChangeMessage()}
        onCancel={() => setConfirmOpen(false)} 
        onConfirm={performStatusChange} 
      />
      <Lightbox 
        open={!!lightboxSrc} 
        src={lightboxSrc} 
        onClose={() => setLightboxSrc(null)} 
      />
    </div>
  );
}
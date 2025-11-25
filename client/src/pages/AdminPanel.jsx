import React, { useEffect, useState } from 'react';
import API, { BACKEND_URL } from '../api';
import ConfirmModal from '../components/ConfirmModal';
import Lightbox from '../components/Lightbox';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Flag, AlertTriangle, LogOut, Filter, Download, 
  RefreshCw, Trash2, CheckCircle, MapPin, Clock, ThumbsUp, ThumbsDown,
  Search, Archive, Image as ImageIcon
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('reports');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [csvCategory, setCsvCategory] = useState('all');
  const [csvTime, setCsvTime] = useState('7d');
  const [showDeletedReports, setShowDeletedReports] = useState(false);

  useEffect(() => { 
    if (authorized) {
      loadReports();
      loadEmergencies();
    }
  }, [authorized, showDeletedReports]);

  async function loadReports() {
    setLoading(true);
    try {
      const adminPassword = sessionStorage.getItem('streetsense_admin_pwd');
      const res = await API.get('/reports/admin/all?limit=5000', {
        headers: { 'x-admin-password': adminPassword }
      });
      const features = res.data.features || [];
      let allReports = features.map(f => ({ 
        ...(f.properties || {}), 
        coords: f.geometry?.coordinates 
      }));
      
      // Filter based on showDeletedReports toggle
      if (!showDeletedReports) {
        allReports = allReports.filter(r => r.status !== 'deleted');
      }
      
      setReports(allReports);
    } catch (err) { 
      console.error('Load reports error:', err);
      const errorMsg = err.response?.status === 401 
        ? 'Admin authentication failed. Please logout and login again.' 
        : 'Failed to fetch reports.';
      alert(errorMsg); 
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

  function confirmDelete(reportId) {
    setConfirmPayload({ id: reportId, action: 'delete' });
    setConfirmOpen(true);
  }

  async function performDelete() {
    if (!confirmPayload) return;
    const adminPassword = sessionStorage.getItem('streetsense_admin_pwd');
    
    console.log('Attempting to delete report:', confirmPayload.id);
    console.log('Admin password present:', !!adminPassword);
    
    try {
      const response = await API.delete(`/reports/${confirmPayload.id}`, {
        headers: { 'x-admin-password': adminPassword }
      });
      console.log('Delete response:', response.data);
      setConfirmOpen(false);
      setConfirmPayload(null);
      alert('Report removed from map! (Archived for CSV export)');
      await loadReports();
    } catch (err) { 
      console.error('Delete error:', err);
      console.error('Error response:', err.response);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Delete failed';
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
      open: { color: 'warning', icon: 'circle', label: 'Open' }, 
      verified: { color: 'info', icon: 'check-circle', label: 'Verified' },
      deleted: { color: 'danger', icon: 'trash', label: 'Deleted' }
    };
    const info = map[status] || { color: 'secondary', icon: 'help-circle', label: status };
    return (
      <span className={`badge bg-${info.color} text-uppercase d-inline-flex align-items-center gap-1`} title={info.label}>
        {status === 'open' && <AlertTriangle size={12} />}
        {status === 'verified' && <CheckCircle size={12} />}
        {status === 'deleted' && <Trash2 size={12} />}
        {status}
      </span>
    );
  };

  if (!authorized) {
    return (
      <div className="page-container d-flex align-items-center justify-content-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-5" 
          style={{maxWidth: '400px', width: '100%'}}
        >
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3 bg-primary bg-opacity-10">
              <LayoutDashboard size={32} className="text-primary" />
            </div>
            <h3 className="fw-bold">Admin Login</h3>
            <p className="text-muted small">Secure access required</p>
          </div>
          <input 
            type="password" 
            className="input-modern mb-3" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="Enter Admin Password"
            onKeyPress={e => e.key === 'Enter' && checkPassword()}
          />
          <button className="btn-primary-modern w-100" onClick={checkPassword}>
            Access Panel
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="h3 fw-bold mb-1 d-flex align-items-center gap-2">
            <LayoutDashboard className="text-primary" />
            Moderation Dashboard
          </h2>
          <p className="text-muted mb-0">Manage reports and emergency alerts</p>
        </div>
        <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={() => {
          sessionStorage.removeItem('streetsense_admin_pwd');
          setAuthorized(false);
        }}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Stats Overview */}
      <div className="row g-4 mb-5">
        <div className="col-md-6 col-lg-3">
          <div className="glass-panel p-4 h-100 d-flex align-items-center gap-3">
            <div className="p-3 rounded-circle bg-primary bg-opacity-10 text-primary">
              <Flag size={24} />
            </div>
            <div>
              <h3 className="h2 fw-bold mb-0">{reports.length}</h3>
              <p className="text-muted small mb-0">Total Reports</p>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="glass-panel p-4 h-100 d-flex align-items-center gap-3">
            <div className="p-3 rounded-circle bg-danger bg-opacity-10 text-danger">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="h2 fw-bold mb-0">{emergencies.length}</h3>
              <p className="text-muted small mb-0">Active SOS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 mb-4 border-bottom pb-2">
        <button 
          className={`btn ${activeTab === 'reports' ? 'btn-primary-modern' : 'btn-outline-modern border-0'}`}
          onClick={() => setActiveTab('reports')}
        >
          <Flag size={18} className="me-2" /> Reports
        </button>
        <button 
          className={`btn ${activeTab === 'emergencies' ? 'btn-primary-modern bg-danger border-danger' : 'btn-outline-modern border-0'}`}
          onClick={() => setActiveTab('emergencies')}
        >
          <AlertTriangle size={18} className="me-2" /> SOS Alerts
          {emergencies.length > 0 && <span className="badge bg-light text-danger ms-2">{emergencies.length}</span>}

        </button>
      </div>

      {activeTab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="glass-panel p-4 mb-4">
            <div className="row g-3 align-items-end">
              <div className="col-md-3 col-6">
                <label className="form-label small fw-bold text-muted">Category</label>
                <div className="input-group">
                  <span className="input-group-text input-group-bg border-end-0"><Filter size={16} className="text-muted"/></span>
                  <select className="form-select input-modern border-start-0 ps-0" value={csvCategory} onChange={e => setCsvCategory(e.target.value)}>
                    <option value="all">All Categories</option>
                    <option value="safety">Safety</option>
                    <option value="traffic">Traffic</option>
                    <option value="water">Water</option>
                    <option value="garbage">Garbage</option>
                    <option value="noise">Noise</option>
                    <option value="stray">Stray</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="col-md-3 col-6">
                <label className="form-label small fw-bold text-muted">Time Range</label>
                <div className="input-group">
                  <span className="input-group-text input-group-bg border-end-0"><Clock size={16} className="text-muted"/></span>
                  <select className="form-select input-modern border-start-0 ps-0" value={csvTime} onChange={e => setCsvTime(e.target.value)}>
                    <option value="24h">Last 24h</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
              <div className="col-md-6 text-md-end">
                <div className="d-flex gap-2 flex-wrap align-items-center justify-content-md-end">
                  <div className="form-check me-3">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="showDeleted"
                      checked={showDeletedReports}
                      onChange={(e) => setShowDeletedReports(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="showDeleted">
                      Show Deleted
                    </label>
                  </div>
                  <button className="btn btn-outline-modern btn-sm" onClick={loadReports}>
                    <RefreshCw size={16} className="me-1" /> Refresh
                  </button>
                  <button className="btn btn-outline-modern btn-sm text-success border-success" onClick={downloadCSV}>
                    <Download size={16} className="me-1" /> Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-5 glass-panel">
              <div className="mb-3 text-muted opacity-50">
                <Search size={48} />
              </div>
              <h4 className="text-muted">No reports found</h4>
              <p className="text-muted small">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="row g-4">
              {reports.map(r => (
                <div key={r._id} className="col-12 col-lg-6">
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className={`glass-card h-100 p-0 overflow-hidden ${r.status === 'deleted' ? 'border-danger border-opacity-25' : ''}`}
                  >
                    <div className="d-flex h-100">
                      <div style={{width: '120px', flexShrink: 0}} className="bg-secondary border-end">
                        {r.photoUrl ? (
                          <img 
                            src={resolveImageUrl(r.photoUrl)} 
                            className="w-100 h-100 object-fit-cover" 
                            style={{cursor:'pointer'}} 
                            onClick={() => setLightboxSrc(resolveImageUrl(r.photoUrl))} 
                            alt="Evidence" 
                          />
                        ) : (
                          <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted small p-2 text-center">
                            <ImageIcon size={24} className="mb-1 opacity-50" />
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-grow-1 p-3 d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h5 className="card-title h6 mb-0 text-truncate fw-bold" style={{maxWidth:'200px'}}>
                            {r.title}
                          </h5>
                          {getStatusBadge(r.status)}
                        </div>
                        <p className="card-text small text-muted mb-3 flex-grow-1" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {r.description}
                        </p>
                        <div className="d-flex gap-3 mb-3 flex-wrap small text-muted">
                          <span className="badge bg-secondary text-body border fw-normal">
                            {r.category}
                          </span>
                          <span className="d-flex align-items-center gap-1">
                            <Clock size={12} /> {new Date(r.timestamp).toLocaleDateString()}
                          </span>
                          <span className="d-flex align-items-center gap-1 text-success">
                            <ThumbsUp size={12} /> {r.upvotes || 0}
                          </span>
                          <span className="d-flex align-items-center gap-1 text-danger">
                            <ThumbsDown size={12} /> {r.downvotes || 0}
                          </span>
                        </div>
                        <div className="d-flex justify-content-end border-top pt-2 mt-auto">
                          {r.status !== 'deleted' ? (
                            <button 
                              className="btn btn-sm btn-outline-danger border-0 d-flex align-items-center gap-1" 
                              onClick={() => confirmDelete(r._id)}
                              title="Remove from map"
                            >
                              <Trash2 size={14} /> Remove from Map
                            </button>
                          ) : (
                            <span className="badge bg-secondary bg-opacity-10 text-secondary d-flex align-items-center gap-1">
                              <Archive size={12} /> Archived
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Emergency Alerts Tab */}
      {activeTab === 'emergencies' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="glass-panel p-4 mb-4 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 d-flex align-items-center gap-2 text-danger fw-bold">
              <AlertTriangle size={20} /> Active SOS Alerts
            </h5>
            <button className="btn btn-sm btn-outline-modern" onClick={loadEmergencies}>
              <RefreshCw size={16} className="me-1" /> Refresh
            </button>
          </div>

          {emergencies.length === 0 ? (
            <div className="text-center py-5 glass-panel">
              <div className="mb-3 text-success opacity-50">
                <CheckCircle size={48} />
              </div>
              <h4 className="text-muted">No Active Emergencies</h4>
              <p className="text-muted small">All clear! No SOS alerts at the moment.</p>
            </div>
          ) : (
            <div className="row g-4">
              {emergencies.map(e => (
                <div key={e.id} className="col-12 col-lg-6">
                  <div className="glass-card h-100 border-danger border-2 shadow-sm">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h5 className="card-title mb-0 d-flex align-items-center gap-2 fw-bold">
                        <AlertTriangle className="text-danger" />
                        {e.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </h5>
                      <span className={`badge ${
                        e.severity === 'critical' ? 'bg-danger' :
                        e.severity === 'high' ? 'bg-warning' :
                        e.severity === 'medium' ? 'bg-info' : 'bg-secondary'
                      }`}>
                        {e.severity.toUpperCase()}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="d-flex gap-4 mb-3">
                        <div>
                          <small className="text-muted d-block mb-1">Location</small>
                          <code className="small bg-secondary px-2 py-1 rounded d-flex align-items-center gap-1">
                            <MapPin size={12} /> {e.lat.toFixed(5)}, {e.lng.toFixed(5)}
                          </code>
                        </div>
                        <div>
                          <small className="text-muted d-block mb-1">Time</small>
                          <small className="d-flex align-items-center gap-1">
                            <Clock size={12} /> {new Date(e.createdAt).toLocaleString()}
                          </small>
                        </div>
                      </div>

                      <a 
                        href={`https://www.google.com/maps?q=${e.lat},${e.lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary w-100"
                      >
                        <MapPin size={14} className="me-1" /> View on Google Maps
                      </a>
                    </div>

                    <div className="d-flex justify-content-end border-top pt-3">
                      <button 
                        className="btn btn-success w-100" 
                        onClick={() => resolveEmergency(e.id)}
                      >
                        <CheckCircle size={16} className="me-2" /> Mark Resolved
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
      
      <ConfirmModal 
        open={confirmOpen} 
        title="REMOVE REPORT FROM MAP"
        message="This will remove the pin from the map but keep the report archived in the database for CSV export logs. The report data will still be accessible for historical records. Continue?"
        onCancel={() => setConfirmOpen(false)} 
        onConfirm={performDelete} 
      />
      <Lightbox 
        open={!!lightboxSrc} 
        src={lightboxSrc} 
        onClose={() => setLightboxSrc(null)} 
      />
    </div>
  );
}
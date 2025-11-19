// client/src/pages/AdminPanel.jsx
import React, { useEffect, useState } from 'react';
import API, { BACKEND_URL } from '../api';
import ConfirmModal from '../components/ConfirmModal';
import Lightbox from '../components/Lightbox';

function resolveImageUrl(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('/uploads') || photoUrl.startsWith('/api/uploads')) {
    return `${BACKEND_URL}${photoUrl}`;
  }
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

  // CSV filters
  const [csvCategory, setCsvCategory] = useState('all');
  const [csvTime, setCsvTime] = useState('7d');

  useEffect(() => {
    if (authorized) loadReports();
  }, [authorized]);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await API.get('/reports?limit=1000');
      const features = res.data.features || [];
      const mapped = features.map(f => ({ ...(f.properties || {}), coords: f.geometry && f.geometry.coordinates }));
      setReports(mapped);
    } catch (err) {
      console.error('Failed to load reports', err);
      alert('Failed to fetch reports.');
    } finally {
      setLoading(false);
    }
  }

  function checkPassword() {
    if (!password) return alert('Enter admin password');
    // try to verify by hitting HEAD export endpoint (server supports HEAD)
    fetch(`/api/reports/export?admin_password=${encodeURIComponent(password)}`, { method: 'HEAD' })
      .then(resp => {
        if (resp.ok) {
          sessionStorage.setItem('streetsense_admin_pwd', password);
          setAuthorized(true);
          loadReports();
        } else {
          alert('Invalid password');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Failed to verify password');
      });
  }

  function logout() {
    sessionStorage.removeItem('streetsense_admin_pwd');
    setPassword('');
    setAuthorized(false);
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
    } catch (err) {
      console.error('Status update failed', err);
      alert('Failed to update status');
    }
  }

  async function downloadCSV() {
    if (!authorized) return alert('Authorize first');
    try {
      let q = `admin_password=${encodeURIComponent(password)}`;
      if (csvCategory && csvCategory !== 'all') q += `&categories=${encodeURIComponent(csvCategory)}`;
      if (csvTime && csvTime !== 'all') {
        const now = Date.now();
        let since;
        if (csvTime === '24h') since = new Date(now - 24*3600*1000);
        if (csvTime === '7d') since = new Date(now - 7*24*3600*1000);
        if (csvTime === '30d') since = new Date(now - 30*24*3600*1000);
        if (since) q += `&since=${encodeURIComponent(since.toISOString())}`;
      }
      const url = `/api/reports/export?${q}`;
      const res = await fetch(url);
      if (!res.ok) return alert('Export failed or unauthorized');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `streetsense_reports_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed');
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin Panel</h2>
      {!authorized ? (
        <div style={{ maxWidth: 560 }}>
          <p>Enter admin password to access moderation tools.</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" />
          <div style={{ marginTop: 8 }}>
            <button className="btn primary" onClick={checkPassword}>Unlock</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <small>Quick test image path you can seed from workspace:</small>
            <pre style={{ background: '#fafafa', padding: 8, borderRadius: 6, fontSize: 12 }}>
{`/mnt/data/WhatsApp Image 2025-11-19 at 19.37.10_c1189b1f.jpg`}
            </pre>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <button className="btn" onClick={loadReports}>Refresh list</button>
            <button className="btn" onClick={logout}>Logout</button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <label>
                Category
                <select value={csvCategory} onChange={e => setCsvCategory(e.target.value)}>
                  <option value="all">all</option>
                  <option value="safety">safety</option>
                  <option value="traffic">traffic</option>
                  <option value="water">water</option>
                  <option value="garbage">garbage</option>
                  <option value="noise">noise</option>
                  <option value="stray">stray</option>
                  <option value="other">other</option>
                </select>
              </label>

              <label>
                Time
                <select value={csvTime} onChange={e => setCsvTime(e.target.value)}>
                  <option value="7d">Last 7 days</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All</option>
                </select>
              </label>

              <button className="btn" onClick={downloadCSV}>Download filtered CSV</button>
            </div>
          </div>

          <div>
            {loading && <div>Loading...</div>}
            {reports.map(r => (
              <div key={r._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', gap: 12 }}>
                <div style={{ width: 120 }}>
                  {r.photoUrl ? (
                    <img
                      src={resolveImageUrl(r.photoUrl)}
                      alt={r.title}
                      style={{ width: 110, height: 80, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
                      onClick={() => setLightboxSrc(resolveImageUrl(r.photoUrl))}
                    />
                  ) : (
                    <div style={{ width: 110, height: 80, background: '#f3f3f3', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>No image</div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <strong>{r.title}</strong> &nbsp; <small style={{ color: '#666' }}>{r.category}</small>
                  <div style={{ fontSize: 13 }}>{r.description}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>Coords: {r.coords ? `${r.coords[1].toFixed(5)}, ${r.coords[0].toFixed(5)}` : 'n/a'}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 13 }}>Status: <strong>{r.status}</strong></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn" onClick={() => confirmStatusChange(r._id, 'open')}>Open</button>
                    <button className="btn" onClick={() => confirmStatusChange(r._id, 'verified')}>Verify</button>
                    <button className="btn" onClick={() => confirmStatusChange(r._id, 'resolved')}>Resolve</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Confirm status change"
        message={`Change status to "${confirmPayload?.status}"?`}
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

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Phone, MapPin, Heart, Trash2, Plus, Save, ArrowLeft, ShieldAlert, Send
} from 'lucide-react';
import API from '../api';
import { getCookie } from '../utils/cookies';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    address: '',
    bloodType: '',
    allergies: '',
    medicalConditions: '',
    emergencyContacts: [
      { _key: 'initial', name: '', phone: '', relationship: 'family', isPrimary: true }
    ]
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      // Check for token in cookies or storage
      const token = getCookie('token') || localStorage.getItem('streetsense_token') || localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      const res = await API.get('/auth/me');
      const user = res.data.user;
      
      setProfile({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        bloodType: user.bloodType || '',
        allergies: user.allergies || '',
        medicalConditions: user.medicalConditions || '',
        emergencyContacts: user.emergencyContacts && user.emergencyContacts.length > 0
          ? user.emergencyContacts
          : [{ name: '', phone: '', relationship: 'family', isPrimary: true }]
      });
    } catch (err) {
      console.error('Load profile error:', err.response?.status, err.response?.data?.message || err.message);
      
      if (err.response?.status === 401) {
        // Clear invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('streetsense_token');
        window.dispatchEvent(new Event('authChange'));
        navigate('/auth');
      } else {
        setMessage({ 
          type: 'danger', 
          text: err.response?.data?.message || 'Failed to load profile. Please try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate emergency contacts
      const validContacts = profile.emergencyContacts.filter(c => c.name && c.phone);
      if (validContacts.length === 0) {
        setMessage({ type: 'warning', text: 'Please add at least one emergency contact.' });
        setSaving(false);
        return;
      }

      await API.put('/auth/profile', {
        ...profile,
        emergencyContacts: validContacts
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Save profile error:', err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const addEmergencyContact = () => {
    setProfile({
      ...profile,
      emergencyContacts: [
        ...profile.emergencyContacts,
        { _key: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name: '', phone: '', relationship: 'friend', isPrimary: false }
      ]
    });
  };

  const removeEmergencyContact = (index) => {
    const contacts = [...profile.emergencyContacts];
    contacts.splice(index, 1);
    setProfile({ ...profile, emergencyContacts: contacts });
  };

  const updateEmergencyContact = (index, field, value) => {
    const contacts = [...profile.emergencyContacts];
    contacts[index][field] = value;
    
    // If setting as primary, unset others
    if (field === 'isPrimary' && value) {
      contacts.forEach((c, i) => {
        if (i !== index) c.isPrimary = false;
      });
    }
    
    setProfile({ ...profile, emergencyContacts: contacts });
  };

  if (loading) {
    return (
      <div className="page-container d-flex justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto"
        style={{ maxWidth: '800px' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h3 fw-bold mb-0 d-flex align-items-center gap-2">
            <User className="text-primary" />
            My Profile
          </h2>
          <button className="btn btn-outline-modern" onClick={() => navigate('/map')}>
            <ArrowLeft size={18} className="me-2" />
            Back to Map
          </button>
        </div>

        {message.text && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`alert alert-${message.type} alert-dismissible fade show mb-4`} 
            role="alert"
          >
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
          </motion.div>
        )}

        <form onSubmit={handleSave}>
          {/* Personal Information */}
          <div className="glass-panel p-4 mb-4">
            <h5 className="mb-4 d-flex align-items-center gap-2 text-primary fw-bold">
              <User size={20} />
              Personal Information
            </h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">Full Name *</label>
                <div className="input-group">
                  <span className="input-group-text input-group-bg border-end-0"><User size={18} className="text-muted"/></span>
                  <input
                    type="text"
                    className="form-control input-modern border-start-0 ps-0"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">Phone Number *</label>
                <div className="input-group">
                  <span className="input-group-text input-group-bg border-end-0"><Phone size={18} className="text-muted"/></span>
                  <input
                    type="tel"
                    className="form-control input-modern border-start-0 ps-0"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="col-12">
                <label className="form-label small fw-bold text-muted">Address</label>
                <div className="input-group">
                  <span className="input-group-text input-group-bg border-end-0"><MapPin size={18} className="text-muted"/></span>
                  <textarea
                    className="form-control input-modern border-start-0 ps-0"
                    rows="2"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Full address including city and pincode"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="glass-panel p-4 mb-4">
            <h5 className="mb-4 d-flex align-items-center gap-2 text-danger fw-bold">
              <Heart size={20} />
              Medical Information
            </h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">Blood Type</label>
                <select
                  className="form-select input-modern"
                  value={profile.bloodType}
                  onChange={(e) => setProfile({ ...profile, bloodType: e.target.value })}
                >
                  <option value="">Select Blood Type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">Allergies</label>
                <input
                  type="text"
                  className="form-control input-modern"
                  value={profile.allergies}
                  onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                  placeholder="e.g., Penicillin, Peanuts"
                />
              </div>
              <div className="col-12">
                <label className="form-label small fw-bold text-muted">Medical Conditions</label>
                <textarea
                  className="form-control input-modern"
                  rows="2"
                  value={profile.medicalConditions}
                  onChange={(e) => setProfile({ ...profile, medicalConditions: e.target.value })}
                  placeholder="List any chronic conditions, medications, or important medical information"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="glass-panel p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0 d-flex align-items-center gap-2 text-warning fw-bold">
                <ShieldAlert size={20} />
                Emergency Contacts
              </h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-modern"
                onClick={addEmergencyContact}
              >
                <Plus size={16} className="me-1" />
                Add Contact
              </button>
            </div>
            
            {profile.emergencyContacts.map((contact, index) => (
              <motion.div 
                key={contact._key || contact._id || `contact-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-3 mb-3 position-relative"
              >
                {profile.emergencyContacts.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger position-absolute top-0 end-0 m-2"
                    onClick={() => removeEmergencyContact(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Name *</label>
                    <input
                      type="text"
                      className="form-control input-modern"
                      value={contact.name}
                      onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Phone *</label>
                    <input
                      type="tel"
                      className="form-control input-modern"
                      value={contact.phone}
                      onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">
                      Telegram ID 
                      <Send size={14} className="text-primary ms-1" />
                    </label>
                    <input
                      type="text"
                      className="form-control input-modern"
                      value={contact.telegramId || ''}
                      onChange={(e) => updateEmergencyContact(index, 'telegramId', e.target.value)}
                      placeholder="e.g., 123456789 or @username"
                    />
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                      For instant emergency alerts
                    </small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Relationship</label>
                    <select
                      className="form-select input-modern"
                      value={contact.relationship}
                      onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                    >
                      <option value="family">Family</option>
                      <option value="mother">Mother</option>
                      <option value="father">Father</option>
                      <option value="brother">Brother</option>
                      <option value="sister">Sister</option>
                      <option value="cousin">Cousin</option>
                      <option value="relative">Relative</option>
                      <option value="friend">Friend</option>
                      <option value="colleague">Colleague</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check mt-4">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={contact.isPrimary}
                        onChange={(e) => updateEmergencyContact(index, 'isPrimary', e.target.checked)}
                        id={`primary-${index}`}
                      />
                      <label className="form-check-label small fw-bold" htmlFor={`primary-${index}`}>
                        Primary Contact
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            <div className="alert alert-info mt-3 d-flex gap-3 align-items-start">
              <Send size={20} className="mt-1 flex-shrink-0" />
              <div>
                <strong>How to get your Telegram ID:</strong>
                <ol className="mb-0 mt-2 small ps-3">
                  <li>Open Telegram and search for <code>@userinfobot</code></li>
                  <li>Start a chat and send <code>/start</code></li>
                  <li>The bot will reply with your Telegram ID (a number)</li>
                  <li>Enter that ID here to receive emergency alerts</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="d-grid gap-2 mb-5">
            <button
              type="submit"
              className="btn-primary-modern py-3"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} className="me-2" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

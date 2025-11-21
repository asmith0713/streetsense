import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

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
      { name: '', phone: '', relationship: 'family', isPrimary: true }
    ]
  });

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Check for token in both locations
      const token = localStorage.getItem('streetsense_token') || localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found, redirecting to auth');
        navigate('/auth');
        return;
      }

      console.log('Loading profile for authenticated user...');
      const res = await API.get('/auth/me');
      const user = res.data.user;
      
      console.log('Profile loaded successfully:', user.email);
      
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
      console.error('Load profile error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response?.status === 401) {
        console.warn('Authentication failed (401), redirecting to auth');
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
  };

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
        { name: '', phone: '', relationship: 'friend', isPrimary: false }
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
      <div className="container py-5" style={{ marginTop: '70px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ marginTop: '70px', maxWidth: '800px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4 mb-0">
          <i className="bi bi-person-circle me-2"></i>
          My Profile
        </h2>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/map')}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Map
        </button>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Personal Information */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0"><i className="bi bi-person-badge me-2"></i>Personal Information</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  className="form-control"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label">Address</label>
                <textarea
                  className="form-control"
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
        <div className="card mb-4">
          <div className="card-header bg-danger text-white">
            <h5 className="mb-0"><i className="bi bi-heart-pulse me-2"></i>Medical Information</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Blood Type</label>
                <select
                  className="form-select"
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
                <label className="form-label">Allergies</label>
                <input
                  type="text"
                  className="form-control"
                  value={profile.allergies}
                  onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                  placeholder="e.g., Penicillin, Peanuts"
                />
              </div>
              <div className="col-12">
                <label className="form-label">Medical Conditions</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={profile.medicalConditions}
                  onChange={(e) => setProfile({ ...profile, medicalConditions: e.target.value })}
                  placeholder="List any chronic conditions, medications, or important medical information"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="card mb-4">
          <div className="card-header bg-warning">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="bi bi-telephone-fill me-2"></i>Emergency Contacts</h5>
              <button
                type="button"
                className="btn btn-sm btn-dark"
                onClick={addEmergencyContact}
              >
                <i className="bi bi-plus-circle me-1"></i>
                Add Contact
              </button>
            </div>
          </div>
          <div className="card-body">
            {profile.emergencyContacts.map((contact, index) => (
              <div key={index} className="border rounded p-3 mb-3 position-relative">
                {profile.emergencyContacts.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
                    onClick={() => removeEmergencyContact(index)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                )}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={contact.name}
                      onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone *</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={contact.phone}
                      onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Relationship</label>
                    <select
                      className="form-select"
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
                      <label className="form-check-label" htmlFor={`primary-${index}`}>
                        Primary Contact
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              These contacts will be notified in case of an emergency
            </small>
          </div>
        </div>

        {/* Save Button */}
        <div className="d-grid gap-2">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

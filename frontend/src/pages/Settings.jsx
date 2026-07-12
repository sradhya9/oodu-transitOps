import { useState, useEffect } from 'react';
import api from '../services/api';
import { getSystemSettings, updateSystemSettings } from '../services/settingsService';
import { Key, CheckCircle, XCircle, Settings as SettingsIcon, Save } from 'lucide-react';
import '../styles/dashboard.css';

const Settings = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvedCode, setApprovedCode] = useState(null);
  
  const [sysSettings, setSysSettings] = useState({});
  const [sysSettingsLoading, setSysSettingsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchResetRequests();
    fetchSystemSettings();
  }, []);

  const fetchResetRequests = async () => {
    try {
      const response = await api.get('/api/auth/reset-requests');
      setRequests(response.data);
    } catch (err) {
      setError('Failed to fetch password reset requests.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const data = await getSystemSettings();
      setSysSettings(data);
    } catch (err) {
      console.error('Failed to fetch system settings:', err);
    } finally {
      setSysSettingsLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSysSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
    setSaveSuccess(false);
  };

  const handleSaveSettings = async () => {
    try {
      const payload = {};
      Object.keys(sysSettings).forEach(key => {
        payload[key] = sysSettings[key].value;
      });
      await updateSystemSettings(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update system settings:', err);
    }
  };

  const handleApprove = async (id, email) => {
    try {
      const response = await api.post(`/api/auth/approve-reset/${id}`);
      setApprovedCode({
        email: email,
        special: response.data.special_access_code,
        emailed: response.data.emailed_code
      });
      // Remove from list
      setRequests(requests.filter(req => req.id !== id));
    } catch (err) {
      setError('Failed to approve request.');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="dashboard-content-grid" style={{ gridTemplateColumns: '1fr', marginTop: '24px' }}>
        <div className="recent-trips-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Key size={24} color="var(--c-kimchi)" />
            <h2 className="section-title" style={{ margin: 0 }}>Pending Password Resets</h2>
          </div>

          {error && (
            <div style={{ backgroundColor: 'rgba(255, 91, 4, 0.1)', color: 'var(--c-kimchi)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(255, 91, 4, 0.2)' }}>
              {error}
            </div>
          )}

          {approvedCode && (
            <div style={{ backgroundColor: 'rgba(7, 80, 86, 0.05)', border: '1px solid var(--c-deep-sea)', padding: '20px', borderRadius: '12px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ color: 'var(--c-deep-sea)', marginTop: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <CheckCircle size={22} /> Request Approved
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                You have approved the reset for <strong style={{ color: 'var(--text-primary)' }}>{approvedCode.email}</strong>.
                Please securely provide them with this <strong>Special Access Code</strong>.
                (The emailed code would be sent automatically in production).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>Special Access Code (Give to user)</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '1.4rem', letterSpacing: '2px', color: 'var(--c-midnight-blue)' }}>{approvedCode.special}</strong>
                </div>
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>Emailed Code (Simulation)</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '1.4rem', letterSpacing: '2px', color: 'var(--c-midnight-blue)' }}>{approvedCode.emailed}</strong>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <p>Loading requests...</p>
          ) : (
            <table className="trips-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Requested At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length > 0 ? requests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: '500' }}>{req.name}</td>
                    <td>{req.email}</td>
                    <td><span className="status-badge drafted">{req.role}</span></td>
                    <td>{new Date(req.requested_at).toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() => handleApprove(req.id, req.email)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      >
                        Approve & Generate Code
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      No pending password reset requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* System Settings Section */}
        <div className="recent-trips-section" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SettingsIcon size={24} color="var(--c-midnight-blue)" />
              <h2 className="section-title" style={{ margin: 0 }}>System Configuration</h2>
            </div>
            <button 
              className="btn-primary" 
              onClick={handleSaveSettings}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
            >
              <Save size={18} /> Save Settings
            </button>
          </div>

          {saveSuccess && (
            <div style={{ backgroundColor: 'rgba(7, 80, 86, 0.1)', color: 'var(--c-deep-sea)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(7, 80, 86, 0.2)' }}>
              Settings saved successfully!
            </div>
          )}

          {sysSettingsLoading ? (
            <p>Loading settings...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {Object.keys(sysSettings).map((key) => (
                <div key={key} style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-dark)', marginBottom: '8px' }}>
                    {sysSettings[key].description || key}
                  </label>
                  <input 
                    type="text" 
                    value={sysSettings[key].value} 
                    onChange={(e) => handleSettingChange(key, e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '6px', 
                      border: '1px solid var(--border-color)',
                      fontSize: '1rem',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'monospace' }}>Key: {key}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

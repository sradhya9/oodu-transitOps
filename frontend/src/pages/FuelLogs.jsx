import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Edit2, Trash2, Plus } from 'lucide-react';
import {
  getFuelLogs,
  createFuelLog,
  updateFuelLog,
  deleteFuelLog
} from '../services/fuelService';
import Expenses from './Expenses';
import '../styles/dashboard.css';
import '../styles/maintenance.css';

const FuelLogs = () => {
  const [activeTab, setActiveTab] = useState('fuel');
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useContext(AuthContext);
  const role = user?.role || '';
  const canAdd = role === 'Financial Analyst';
  const canEdit = role === 'Financial Analyst';

  // Search state for fuel logs
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLogId, setCurrentLogId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    vehicle_id: '',
    trip_id: '',
    liters: '',
    fuel_cost: '',
    fuel_date: '',
    odometer: '',
    created_by: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [formSubmitError, setFormSubmitError] = useState(null);

  // Fetch fuel logs on page load
  const fetchFuelLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFuelLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch fuel logs:', err);
      setError('Failed to load fuel records. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'fuel') {
      fetchFuelLogs();
    }
  }, [activeTab]);

  // Form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Open modal for add
  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentLogId(null);
    setFormErrors({});
    setFormSubmitError(null);

    const today = new Date().toISOString().split('T')[0];
    setFormData({
      vehicle_id: '',
      trip_id: '',
      liters: '',
      fuel_cost: '',
      fuel_date: today,
      odometer: '',
      created_by: ''
    });
    setShowModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (log) => {
    setIsEditing(true);
    setCurrentLogId(log.id);
    setFormErrors({});
    setFormSubmitError(null);
    setFormData({
      vehicle_id: log.vehicle_id || '',
      trip_id: log.trip_id !== null ? log.trip_id.toString() : '',
      liters: log.liters !== null ? log.liters.toString() : '',
      fuel_cost: log.fuel_cost !== null ? log.fuel_cost.toString() : '',
      fuel_date: log.fuel_date || '',
      odometer: log.odometer !== null ? log.odometer.toString() : '',
      created_by: log.created_by !== null ? log.created_by.toString() : ''
    });
    setShowModal(true);
  };

  // Form validations
  const validateForm = () => {
    const errors = {};

    if (!formData.vehicle_id || formData.vehicle_id.toString().trim() === '') {
      errors.vehicle_id = 'Vehicle ID is required';
    } else if (isNaN(Number(formData.vehicle_id)) || !Number.isInteger(Number(formData.vehicle_id))) {
      errors.vehicle_id = 'Vehicle ID must be an integer';
    }

    if (!formData.liters || formData.liters.toString().trim() === '') {
      errors.liters = 'Liters is required';
    } else if (isNaN(Number(formData.liters)) || Number(formData.liters) <= 0) {
      errors.liters = 'Liters must be a numeric value greater than 0';
    }

    if (!formData.fuel_cost || formData.fuel_cost.toString().trim() === '') {
      errors.fuel_cost = 'Fuel cost is required';
    } else if (isNaN(Number(formData.fuel_cost)) || Number(formData.fuel_cost) < 0) {
      errors.fuel_cost = 'Fuel cost must be a positive numeric value';
    }

    if (!formData.fuel_date || formData.fuel_date.trim() === '') {
      errors.fuel_date = 'Fuel date is required';
    }

    if (formData.odometer && formData.odometer.toString().trim() !== '') {
      if (isNaN(Number(formData.odometer)) || Number(formData.odometer) < 0) {
        errors.odometer = 'Odometer must be a positive numeric value';
      }
    }

    if (formData.trip_id && formData.trip_id.toString().trim() !== '') {
      if (isNaN(Number(formData.trip_id)) || !Number.isInteger(Number(formData.trip_id))) {
        errors.trip_id = 'Trip ID must be an integer';
      }
    }

    if (formData.created_by && formData.created_by.toString().trim() !== '') {
      if (isNaN(Number(formData.created_by)) || !Number.isInteger(Number(formData.created_by))) {
        errors.created_by = 'Created By must be an integer';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormSubmitError(null);

    const payload = {
      vehicle_id: parseInt(formData.vehicle_id, 10),
      trip_id: formData.trip_id !== '' ? parseInt(formData.trip_id, 10) : null,
      liters: parseFloat(formData.liters),
      fuel_cost: parseFloat(formData.fuel_cost),
      fuel_date: formData.fuel_date,
      odometer: formData.odometer !== '' ? parseFloat(formData.odometer) : null,
      created_by: formData.created_by !== '' ? parseInt(formData.created_by, 10) : null
    };

    try {
      if (isEditing) {
        // According to requirements, PUT updates liters, fuel_cost, fuel_date, odometer, trip_id
        await updateFuelLog(currentLogId, payload);
      } else {
        await createFuelLog(payload);
      }
      setShowModal(false);
      fetchFuelLogs();
    } catch (err) {
      console.error('Form submission failed:', err);
      if (err.response && err.response.data && err.response.data.errors) {
        setFormErrors(err.response.data.errors);
      } else if (err.response && err.response.data && err.response.data.error) {
        setFormSubmitError(err.response.data.error);
      } else {
        setFormSubmitError('Failed to save fuel log. Please verify input values.');
      }
    }
  };

  // Handle delete
  const handleDeleteLog = async (id) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete fuel log record #${id}?`);
    if (!confirmDelete) return;

    try {
      await deleteFuelLog(id);
      fetchFuelLogs();
    } catch (err) {
      console.error('Failed to delete fuel log:', err);
      alert(err.response?.data?.error || 'Failed to delete the fuel log record.');
    }
  };

  // Filter & Search logic for fuel logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.vehicle_id && log.vehicle_id.toString().includes(searchQuery)) ||
      (log.trip_id && log.trip_id.toString().includes(searchQuery));
    return matchesSearch;
  });

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Fuel & Expenses</h1>
      </div>

      {/* Tabs Row */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'fuel' ? 'active' : ''}`}
          onClick={() => setActiveTab('fuel')}
        >
          Fuel Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses
        </button>
      </div>

      {/* Fuel Logs Tab View */}
      {activeTab === 'fuel' && (
        <div>
          {/* Search and Filters */}
          <div className="filters-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div className="filter-group">
              <span className="filter-label">Search</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search vehicle or trip ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {canAdd && (
              <button className="btn-primary" onClick={handleOpenAdd} style={{ alignSelf: 'flex-end' }}>
                <Plus size={18} strokeWidth={2.5} /> Log Fuel
              </button>
            )}
          </div>

          {error && <div className="error-alert">{error}</div>}

          {/* Main Table */}
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner">Loading fuel logs...</div>
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="recent-trips-section">
              <table className="trips-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Vehicle ID</th>
                    <th>Trip ID</th>
                    <th>Liters</th>
                    <th>Fuel Cost</th>
                    <th>Fuel Date</th>
                    <th>Odometer</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>#{log.id}</td>
                      <td>{log.vehicle_id}</td>
                      <td>{log.trip_id !== null ? log.trip_id : <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                      <td>{log.liters.toFixed(2)} L</td>
                      <td>₹{log.fuel_cost.toFixed(2)}</td>
                      <td>{log.fuel_date}</td>
                      <td>{log.odometer !== null ? `${log.odometer.toLocaleString()} km` : <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                      {canEdit && (
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-edit btn-icon-only" title="Edit Fuel Log" onClick={() => handleOpenEdit(log)}><Edit2 size={16} /></button>
                          <button className="btn-danger btn-icon-only" title="Delete Fuel Log" onClick={() => handleDeleteLog(log.id)}><Trash2 size={16} /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No Fuel Logs Found</h3>
              <p>Try refining your search query or log a new fuel purchase to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Expenses Tab View */}
      {activeTab === 'expenses' && <Expenses />}

      {/* Fuel Log Modal Dialog Form */}
      {showModal && activeTab === 'fuel' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{isEditing ? `Edit Fuel Log #${currentLogId}` : 'Log Fuel Purchase'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            {formSubmitError && <div className="error-alert">{formSubmitError}</div>}

            <form onSubmit={handleFormSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Vehicle ID *</label>
                  <input
                    type="text"
                    name="vehicle_id"
                    className="form-input"
                    placeholder="e.g. 5"
                    value={formData.vehicle_id}
                    onChange={handleInputChange}
                    disabled={isEditing} // Vehicle ID shouldn't be mutable on edits
                  />
                  {formErrors.vehicle_id && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.vehicle_id}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Trip ID</label>
                  <input
                    type="text"
                    name="trip_id"
                    className="form-input"
                    placeholder="e.g. 12 (optional)"
                    value={formData.trip_id}
                    onChange={handleInputChange}
                  />
                  {formErrors.trip_id && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.trip_id}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Liters *</label>
                  <input
                    type="text"
                    name="liters"
                    className="form-input"
                    placeholder="e.g. 45.5"
                    value={formData.liters}
                    onChange={handleInputChange}
                  />
                  {formErrors.liters && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.liters}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Fuel Cost (₹) *</label>
                  <input
                    type="text"
                    name="fuel_cost"
                    className="form-input"
                    placeholder="e.g. 62.10"
                    value={formData.fuel_cost}
                    onChange={handleInputChange}
                  />
                  {formErrors.fuel_cost && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.fuel_cost}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fuel Date *</label>
                  <input
                    type="date"
                    name="fuel_date"
                    className="form-input"
                    value={formData.fuel_date}
                    onChange={handleInputChange}
                  />
                  {formErrors.fuel_date && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.fuel_date}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Odometer (km)</label>
                  <input
                    type="text"
                    name="odometer"
                    className="form-input"
                    placeholder="e.g. 154320"
                    value={formData.odometer}
                    onChange={handleInputChange}
                  />
                  {formErrors.odometer && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.odometer}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Created By</label>
                <input
                  type="text"
                  name="created_by"
                  className="form-input"
                  placeholder="e.g. 1 (optional)"
                  value={formData.created_by}
                  onChange={handleInputChange}
                />
                {formErrors.created_by && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.created_by}</span>}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{isEditing ? 'Save Changes' : 'Log Fuel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelLogs;

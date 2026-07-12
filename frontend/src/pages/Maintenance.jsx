import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Edit2, Trash2, Plus } from 'lucide-react';
import {
  getMaintenanceLogs,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance
} from '../services/maintenanceService';
import { vehicleService } from '../services/vehicleService';
import '../styles/dashboard.css';
import '../styles/maintenance.css';

const Maintenance = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { user } = useContext(AuthContext);
  const role = user?.role || '';
  const canEdit = role === 'Fleet Manager';
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Vehicles for dropdown
  const [allVehicles, setAllVehicles] = useState([]);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLogId, setCurrentLogId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    vehicle_id: '',
    maintenance_type: '',
    workshop: '',
    description: '',
    maintenance_cost: '',
    start_date: '',
    end_date: '',
    status: 'Open'
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitError, setFormSubmitError] = useState(null);

  // Load records on page load
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMaintenanceLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch maintenance logs:", err);
      setError("Failed to fetch maintenance records. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await vehicleService.getVehicles({ limit: 1000 });
      if (res.success) {
        setAllVehicles(res.data.items || res.data);
      }
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchVehicles();
  }, []);

  // Form input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for field
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
    
    // Default start date to today's local date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    setFormData({
      vehicle_id: '',
      maintenance_type: '',
      workshop: '',
      description: '',
      maintenance_cost: '',
      start_date: today,
      end_date: '',
      status: 'Open'
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
      maintenance_type: log.maintenance_type || '',
      workshop: log.workshop || '',
      description: log.description || '',
      maintenance_cost: log.maintenance_cost !== null ? log.maintenance_cost.toString() : '',
      start_date: log.start_date || '',
      end_date: log.end_date || '',
      status: log.status || 'Open'
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
    
    if (!formData.maintenance_type || formData.maintenance_type.trim() === '') {
      errors.maintenance_type = 'Maintenance type is required';
    }
    
    if (!formData.start_date || formData.start_date.trim() === '') {
      errors.start_date = 'Start date is required';
    }
    
    if (formData.maintenance_cost && formData.maintenance_cost.trim() !== '') {
      if (isNaN(Number(formData.maintenance_cost)) || Number(formData.maintenance_cost) < 0) {
        errors.maintenance_cost = 'Cost must be a positive numeric value';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setFormSubmitError(null);
    
    // Prepare payload
    const payload = {
      vehicle_id: parseInt(formData.vehicle_id, 10),
      maintenance_type: formData.maintenance_type,
      workshop: formData.workshop || null,
      description: formData.description || null,
      maintenance_cost: formData.maintenance_cost !== '' ? parseFloat(formData.maintenance_cost) : null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      status: formData.status
    };
    
    try {
      if (isEditing) {
        await updateMaintenance(currentLogId, payload);
      } else {
        await createMaintenance(payload);
      }
      
      setShowModal(false);
      fetchLogs(); // Refresh the list
    } catch (err) {
      console.error("Form submission failed:", err);
      if (err.response && err.response.data && err.response.data.errors) {
        setFormErrors(err.response.data.errors);
      } else if (err.response && err.response.data && err.response.data.error) {
        setFormSubmitError(err.response.data.error);
      } else {
        setFormSubmitError("Failed to save maintenance record. Please check validation rules.");
      }
    }
  };

  // Delete handler
  const handleDeleteLog = async (log) => {
    if (log.status === 'Open') {
      alert(`Cannot delete open maintenance record with ID ${log.id}. Complete it first.`);
      return;
    }
    
    const confirmDelete = window.confirm(`Are you sure you want to delete maintenance record #${log.id}?`);
    if (!confirmDelete) return;
    
    try {
      await deleteMaintenance(log.id);
      fetchLogs(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete log:", err);
      alert(err.response?.data?.error || "Failed to delete the maintenance record.");
    }
  };

  // Filter and Search logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      (log.vehicle_id && log.vehicle_id.toString().includes(searchQuery)) ||
      (log.vehicle_registration && log.vehicle_registration.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.maintenance_type && log.maintenance_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.workshop && log.workshop.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesStatus = 
      statusFilter === 'All' || 
      log.status === statusFilter;
      
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Maintenance Logs</h1>
        {canEdit && <button className="btn-primary" onClick={handleOpenAdd}><Plus size={18} strokeWidth={2.5} /> Log Maintenance</button>}
      </div>

      {/* Filters/Search Row */}
      <div className="filters-row">
        <div className="filter-group">
          <span className="filter-label">Search</span>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search ID, type, workshop..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <span className="filter-label">Status Filter</span>
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && <div className="error-alert">{error}</div>}

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">Loading maintenance logs...</div>
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="recent-trips-section">
          <table className="trips-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Vehicle</th>
                <th>Maintenance Type</th>
                <th>Workshop</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Cost</th>
                <th>Status</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td>{log.vehicle_registration || log.vehicle_id}</td>
                  <td>{log.maintenance_type}</td>
                  <td>{log.workshop || <span style={{color: '#9CA3AF'}}>—</span>}</td>
                  <td>{log.start_date}</td>
                  <td>{log.end_date || <span style={{color: '#9CA3AF'}}>—</span>}</td>
                  <td>{log.maintenance_cost !== null ? `₹${log.maintenance_cost.toFixed(2)}` : <span style={{color: '#9CA3AF'}}>—</span>}</td>
                  <td>
                    <span className={`status-badge ${log.status.toLowerCase()}`}>
                      {log.status}
                    </span>
                  </td>
                  {canEdit && (
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-edit btn-icon-only" title="Edit Log" onClick={() => handleOpenEdit(log)}><Edit2 size={16} /></button>
                      <button className="btn-danger btn-icon-only" title="Delete Log" onClick={() => handleDeleteLog(log)}><Trash2 size={16} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h3>No Maintenance Logs Found</h3>
          <p>Try refining your search query or status filter, or log a new record to get started.</p>
        </div>
      )}

      {/* Modal Dialog Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{isEditing ? `Edit Maintenance Record #${currentLogId}` : 'Log New Maintenance'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            {formSubmitError && <div className="error-alert">{formSubmitError}</div>}
            
            <form onSubmit={handleFormSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Vehicle *</label>
                  <select 
                    name="vehicle_id"
                    className="form-select"
                    value={formData.vehicle_id}
                    onChange={handleInputChange}
                    disabled={isEditing}
                  >
                    <option value="">Select a Vehicle</option>
                    {allVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registration_number}</option>
                    ))}
                  </select>
                  {formErrors.vehicle_id && <span style={{color: '#EF4444', fontSize: '0.75rem'}}>{formErrors.vehicle_id}</span>}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Maintenance Type *</label>
                  <input 
                    type="text" 
                    name="maintenance_type"
                    className="form-input" 
                    placeholder="e.g. Engine Repair"
                    value={formData.maintenance_type}
                    onChange={handleInputChange}
                  />
                  {formErrors.maintenance_type && <span style={{color: '#EF4444', fontSize: '0.75rem'}}>{formErrors.maintenance_type}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Workshop</label>
                  <input 
                    type="text" 
                    name="workshop"
                    className="form-input" 
                    placeholder="e.g. City Garage"
                    value={formData.workshop}
                    onChange={handleInputChange}
                  />
                  {formErrors.workshop && <span style={{color: '#EF4444', fontSize: '0.75rem'}}>{formErrors.workshop}</span>}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Cost (₹)</label>
                  <input 
                    type="text" 
                    name="maintenance_cost"
                    className="form-input" 
                    placeholder="e.g. 350.00"
                    value={formData.maintenance_cost}
                    onChange={handleInputChange}
                  />
                  {formErrors.maintenance_cost && <span style={{color: '#EF4444', fontSize: '0.75rem'}}>{formErrors.maintenance_cost}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input 
                    type="date" 
                    name="start_date"
                    className="form-input" 
                    value={formData.start_date}
                    onChange={handleInputChange}
                  />
                  {formErrors.start_date && <span style={{color: '#EF4444', fontSize: '0.75rem'}}>{formErrors.start_date}</span>}
                </div>
                
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input 
                    type="date" 
                    name="end_date"
                    className="form-input" 
                    value={formData.end_date}
                    onChange={handleInputChange}
                  />
                  {formErrors.end_date && <span style={{color: '#EF4444', fontSize: '0.75rem'}}>{formErrors.end_date}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status *</label>
                <select 
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="Open">Open</option>
                  <option value="Completed">Completed</option>
                </select>
                {formErrors.status && <span style={{color: '#EF4444', fontSize: '0.75rem'}}>{formErrors.status}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  name="description"
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Details of the maintenance work..."
                  value={formData.description}
                  onChange={handleInputChange}
                />
                {formErrors.description && <span style={{color: '#EF4444', fontSize: '0.75rem'}}>{formErrors.description}</span>}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{isEditing ? 'Save Changes' : 'Create Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;

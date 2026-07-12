import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Eye, Edit2, Trash2, Plus } from 'lucide-react';
import { vehicleService } from '../services/vehicleService';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import '../styles/vehicles.css';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, available: 0, onTrip: 0, inShop: 0, retired: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const role = user?.role || '';
  const canEdit = role === 'Fleet Manager';
  const canViewFinance = role === 'Fleet Manager' || role === 'Financial Analyst';

  // Pagination, Search, Filter, Sort state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [purchaseDateFilter, setPurchaseDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // add, edit, view, delete
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    registration_number: '', vehicle_name: '', vehicle_model: '', 
    vehicle_type: 'Truck', max_load_capacity: '', odometer: '0', 
    acquisition_cost: '', acquisition_date: '', status: 'Available'
  });
  const [formErrors, setFormErrors] = useState({});

  // Toasts
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'info') => {
    setToasts((prev) => [...prev, { id: Date.now(), message, type }]);
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getVehicles({
        page, limit, search, type: typeFilter, status: statusFilter, 
        purchaseDate: purchaseDateFilter, sortBy, sortOrder
      });
      if (data.success) {
        setVehicles(data.data.items);
        setTotalRecords(data.data.total);
        calculateKpis(data.data.items); // In a real app with large data, KPIs should come from backend
      }
    } catch (error) {
      addToast('Failed to fetch vehicles', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, typeFilter, statusFilter, purchaseDateFilter, sortBy, sortOrder]);

  // Note: For true global KPIs, we should fetch all vehicles without pagination or use a dedicated stat endpoint.
  // We will do a separate fetch for KPIs to get accurate total counts across pages.
  const fetchKpis = async () => {
    try {
        // We can fetch all with a large limit just for stats, or ideally backend would provide this.
        // I will use a simple query with no pagination (limit=1000) for demo purposes, 
        // or just rely on the dashboard stats API. Let's use the dashboard stats API logic here if possible, 
        // but for now, we'll just query with a big limit to calculate.
        const res = await vehicleService.getVehicles({ limit: 10000 });
        if(res.success) {
            calculateKpis(res.data.items);
        }
    } catch(e) {}
  }

  const calculateKpis = (items) => {
    let total = items.length;
    let available = 0, onTrip = 0, inShop = 0, retired = 0;
    items.forEach(v => {
      if (v.status === 'Available') available++;
      else if (v.status === 'On Trip') onTrip++;
      else if (v.status === 'In Shop') inShop++;
      else if (v.status === 'Retired') retired++;
    });
    setKpis({ total, available, onTrip, inShop, retired });
  };

  useEffect(() => {
    fetchVehicles();
    fetchKpis();
  }, [fetchVehicles]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.registration_number) errors.registration_number = "Registration Number is required";
    if (!formData.vehicle_name) errors.vehicle_name = "Vehicle Name is required";
    if (!formData.vehicle_type) errors.vehicle_type = "Vehicle Type is required";
    if (!formData.max_load_capacity || formData.max_load_capacity <= 0) errors.max_load_capacity = "Max Load Capacity must be > 0";
    if (formData.odometer < 0) errors.odometer = "Odometer cannot be negative";
    if (!formData.acquisition_cost || formData.acquisition_cost <= 0) errors.acquisition_cost = "Acquisition Cost must be > 0";
    if (formData.acquisition_date) {
        if (new Date(formData.acquisition_date) > new Date()) {
            errors.acquisition_date = "Purchase Date cannot be in the future";
        }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openModal = (mode, vehicle = null) => {
    setModalMode(mode);
    setSelectedVehicle(vehicle);
    setFormErrors({});
    if (vehicle && mode !== 'add') {
      setFormData({
        registration_number: vehicle.registration_number,
        vehicle_name: vehicle.vehicle_name,
        vehicle_model: vehicle.vehicle_model || '',
        vehicle_type: vehicle.vehicle_type,
        max_load_capacity: vehicle.max_load_capacity,
        odometer: vehicle.odometer,
        acquisition_cost: vehicle.acquisition_cost,
        acquisition_date: vehicle.acquisition_date || '',
        status: vehicle.status
      });
    } else {
      setFormData({
        registration_number: '', vehicle_name: '', vehicle_model: '', 
        vehicle_type: 'Truck', max_load_capacity: '', odometer: '0', 
        acquisition_cost: '', acquisition_date: '', status: 'Available'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (modalMode === 'delete') {
      try {
        const res = await vehicleService.deleteVehicle(selectedVehicle.id);
        if (res.success) {
          addToast(res.message, 'success');
          setIsModalOpen(false);
          fetchVehicles();
          fetchKpis();
        } else {
          addToast(res.message || 'Error deleting vehicle', 'error');
        }
      } catch (err) {
        addToast(err.response?.data?.message || 'Error deleting vehicle', 'error');
      }
      return;
    }

    if (!validateForm()) return;

    try {
      let res;
      if (modalMode === 'add') {
        res = await vehicleService.createVehicle(formData);
      } else if (modalMode === 'edit') {
        res = await vehicleService.updateVehicle(selectedVehicle.id, formData);
      }

      if (res.success) {
        addToast(res.message, 'success');
        setIsModalOpen(false);
        fetchVehicles();
        fetchKpis();
      } else {
        addToast(res.message || 'Error saving vehicle', 'error');
        if (res.errors) {
            const errs = {};
            res.errors.forEach(e => errs.api = (errs.api ? errs.api + ", " : "") + e);
            setFormErrors(errs);
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving vehicle', 'error');
      if (err.response?.data?.errors) {
          const errs = {};
          err.response.data.errors.forEach(e => errs.api = (errs.api ? errs.api + ", " : "") + e);
          setFormErrors(errs);
      }
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Available': return 'available';
      case 'On Trip': return 'on-trip';
      case 'In Shop': return 'in-shop';
      case 'Retired': return 'retired';
      default: return '';
    }
  };

  return (
    <div className="vehicles-container">
      <div className="vehicles-header">
        <div className="vehicles-header-text">
          <h1>Vehicle Management</h1>
          <p>Manage all fleet vehicles</p>
        </div>
        {canEdit && <button className="add-btn" onClick={() => openModal('add')}><Plus size={18} strokeWidth={2.5} /> Add Vehicle</button>}
      </div>

      <div className="kpi-grid">
        <div className="kpi-card total">
          <span className="kpi-label">Total Vehicles</span>
          <span className="kpi-value">{kpis.total}</span>
        </div>
        <div className="kpi-card available">
          <span className="kpi-label">Available</span>
          <span className="kpi-value">{kpis.available}</span>
        </div>
        <div className="kpi-card on-trip">
          <span className="kpi-label">On Trip</span>
          <span className="kpi-value">{kpis.onTrip}</span>
        </div>
        <div className="kpi-card in-shop">
          <span className="kpi-label">In Shop</span>
          <span className="kpi-value">{kpis.inShop}</span>
        </div>
        <div className="kpi-card retired">
          <span className="kpi-label">Retired</span>
          <span className="kpi-value">{kpis.retired}</span>
        </div>
      </div>

      <div className="controls-row">
        <input 
          type="text" 
          placeholder="Search Reg No, Name, Model..." 
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filters-group">
          <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="Truck">Truck</option>
            <option value="Mini Truck">Mini Truck</option>
            <option value="Van">Van</option>
            <option value="Pickup">Pickup</option>
            <option value="Bike">Bike</option>
            <option value="Trailer">Trailer</option>
            <option value="Container">Container</option>
          </select>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
          <input 
            type="date" 
            className="filter-select"
            value={purchaseDateFilter}
            onChange={(e) => setPurchaseDateFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="data-table-container">
        {loading ? (
          <div className="loading-state">Loading vehicles...</div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <p>No vehicles found.</p>
            {canEdit && <button className="add-btn" style={{marginTop: '16px'}} onClick={() => openModal('add')}><Plus size={18} strokeWidth={2.5} /> Add Vehicle</button>}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('registration_number')}>Reg Number {sortBy === 'registration_number' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}</th>
                  <th onClick={() => handleSort('vehicle_name')}>Name {sortBy === 'vehicle_name' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}</th>
                  <th onClick={() => handleSort('vehicle_type')}>Type {sortBy === 'vehicle_type' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}</th>
                  <th onClick={() => handleSort('max_load_capacity')}>Capacity</th>
                  <th onClick={() => handleSort('odometer')}>Odometer {sortBy === 'odometer' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}</th>
                  {canViewFinance && <th onClick={() => handleSort('acquisition_cost')}>Cost {sortBy === 'acquisition_cost' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}</th>}
                  <th onClick={() => handleSort('acquisition_date')}>Purchase Date {sortBy === 'acquisition_date' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td>{v.registration_number}</td>
                    <td>{v.vehicle_name} <br/><small style={{color: '#94a3b8'}}>{v.vehicle_model}</small></td>
                    <td>{v.vehicle_type}</td>
                    <td>{v.max_load_capacity}</td>
                    <td>{v.odometer}</td>
                    {canViewFinance && <td>₹{v.acquisition_cost}</td>}
                    <td>{v.acquisition_date}</td>
                    <td><span className={`status-badge ${getStatusClass(v.status)}`}>{v.status}</span></td>
                    <td className="actions-cell">
                      <button className="action-btn btn-icon-only" title="View Details" onClick={() => openModal('view', v)}><Eye size={16} /></button>
                      {canEdit && (
                        <>
                          <button className="action-btn btn-icon-only" title="Edit Vehicle" onClick={() => openModal('edit', v)} disabled={v.status === 'Retired'}><Edit2 size={16} /></button>
                          <button className="action-btn delete btn-icon-only" title="Delete Vehicle" onClick={() => openModal('delete', v)}><Trash2 size={16} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <div className="page-info">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries
              </div>
              <div className="pagination-controls">
                <select className="filter-select" value={limit} onChange={(e) => {setLimit(Number(e.target.value)); setPage(1);}}>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
                <button className="page-btn" disabled={page * limit >= totalRecords} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'add' ? 'Add New Vehicle' : modalMode === 'edit' ? 'Edit Vehicle' : modalMode === 'view' ? 'Vehicle Details' : 'Confirm Delete'}
      >
        {modalMode === 'delete' ? (
          <div>
            <p>Are you sure you want to delete the vehicle <strong>{selectedVehicle?.registration_number}</strong>?</p>
            <p className="error-text">This action cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleSubmit}>Delete</button>
            </div>
          </div>
        ) : modalMode === 'view' ? (
          <div>
            <div className="view-details">
              <div className="detail-item"><div className="detail-label">Reg Number</div><div className="detail-value">{formData.registration_number}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge ${getStatusClass(formData.status)}`}>{formData.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Name</div><div className="detail-value">{formData.vehicle_name}</div></div>
              <div className="detail-item"><div className="detail-label">Model</div><div className="detail-value">{formData.vehicle_model || 'N/A'}</div></div>
              <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{formData.vehicle_type}</div></div>
              <div className="detail-item"><div className="detail-label">Max Load Capacity</div><div className="detail-value">{formData.max_load_capacity}</div></div>
              <div className="detail-item"><div className="detail-label">Odometer</div><div className="detail-value">{formData.odometer}</div></div>
              {canViewFinance && <div className="detail-item"><div className="detail-label">Acquisition Cost</div><div className="detail-value">₹{formData.acquisition_cost}</div></div>}
              <div className="detail-item"><div className="detail-label">Purchase Date</div><div className="detail-value">{formData.acquisition_date || 'N/A'}</div></div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Close</button>
            </div>
          </div>
        ) : (
          <div>
            {formErrors.api && <div className="error-text" style={{marginBottom: '16px'}}>{formErrors.api}</div>}
            <div className="view-details">
              <div className="form-group">
                <label>Registration Number *</label>
                <input type="text" className="form-control" value={formData.registration_number} onChange={(e) => setFormData({...formData, registration_number: e.target.value})} disabled={modalMode === 'edit'} />
                {formErrors.registration_number && <div className="error-text">{formErrors.registration_number}</div>}
              </div>
              <div className="form-group">
                <label>Vehicle Name *</label>
                <input type="text" className="form-control" value={formData.vehicle_name} onChange={(e) => setFormData({...formData, vehicle_name: e.target.value})} />
                {formErrors.vehicle_name && <div className="error-text">{formErrors.vehicle_name}</div>}
              </div>
              <div className="form-group">
                <label>Vehicle Model</label>
                <input type="text" className="form-control" value={formData.vehicle_model} onChange={(e) => setFormData({...formData, vehicle_model: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Vehicle Type *</label>
                <select className="form-control" value={formData.vehicle_type} onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}>
                  <option value="Truck">Truck</option>
                  <option value="Mini Truck">Mini Truck</option>
                  <option value="Van">Van</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Bike">Bike</option>
                  <option value="Trailer">Trailer</option>
                  <option value="Container">Container</option>
                </select>
                {formErrors.vehicle_type && <div className="error-text">{formErrors.vehicle_type}</div>}
              </div>
              <div className="form-group">
                <label>Max Load Capacity *</label>
                <input type="number" step="0.01" className="form-control" value={formData.max_load_capacity} onChange={(e) => setFormData({...formData, max_load_capacity: e.target.value})} />
                {formErrors.max_load_capacity && <div className="error-text">{formErrors.max_load_capacity}</div>}
              </div>
              <div className="form-group">
                <label>Current Odometer</label>
                <input type="number" step="0.01" className="form-control" value={formData.odometer} onChange={(e) => setFormData({...formData, odometer: e.target.value})} />
                {formErrors.odometer && <div className="error-text">{formErrors.odometer}</div>}
              </div>
              <div className="form-group">
                <label>Acquisition Cost *</label>
                <input type="number" step="0.01" className="form-control" value={formData.acquisition_cost} onChange={(e) => setFormData({...formData, acquisition_cost: e.target.value})} />
                {formErrors.acquisition_cost && <div className="error-text">{formErrors.acquisition_cost}</div>}
              </div>
              <div className="form-group">
                <label>Purchase Date</label>
                <input type="date" className="form-control" value={formData.acquisition_date} onChange={(e) => setFormData({...formData, acquisition_date: e.target.value})} max={new Date().toISOString().split('T')[0]} />
                {formErrors.acquisition_date && <div className="error-text">{formErrors.acquisition_date}</div>}
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="In Shop">In Shop</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn-submit" onClick={handleSubmit}>Save</button>
            </div>
          </div>
        )}
      </Modal>
      
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Vehicles;

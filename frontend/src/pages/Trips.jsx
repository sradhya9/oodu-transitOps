import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Eye, Play, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";
import { getTrips, createTrip, dispatchTrip, completeTrip, cancelTrip } from "../services/tripService";
import { getAvailableDrivers, getDrivers } from "../services/driverService";
import { vehicleService } from "../services/vehicleService";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import "../styles/vehicles.css";

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState({ total: 0, draft: 0, active: 0, completed: 0, cancelled: 0 });
  const [meta, setMeta] = useState({ current_page: 1, total_pages: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const role = user?.role || '';
  const canCreate = role === 'Dispatcher';
  const canComplete = role === 'Dispatcher';

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");

  // Filter Dropdown Data
  const [allVehicles, setAllVehicles] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add, view, complete, dispatch, cancel
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Creation data
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    vehicle_id: "",
    driver_id: "",
    source_location: "",
    destination_location: "",
    cargo_weight: "",
    planned_distance: ""
  });

  // Completion Form State
  const [completionData, setCompletionData] = useState({
    end_odometer: "",
    fuel_consumed: "",
    revenue: ""
  });

  const [formErrors, setFormErrors] = useState({});

  // Toasts
  const [toasts, setToasts] = useState([]);
  
  const addToast = (message, type = "success") => {
    setToasts((prev) => [...prev, { id: Date.now(), message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = addToast;

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const params = {
        page: meta.current_page,
        limit: meta.limit,
        search,
        status: statusFilter,
        vehicle_id: vehicleFilter,
        driver_id: driverFilter,
      };
      const response = await getTrips(params);
      if (response.success) {
        setTrips(response.data);
        setSummary(response.summary);
        setMeta(response.meta);
      }
    } catch (error) {
      showToast("Error fetching trips", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line
  }, [meta.current_page, meta.limit, statusFilter, vehicleFilter, driverFilter]);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [vehRes, drvRes] = await Promise.all([
          vehicleService.getVehicles({ limit: 1000 }), 
          getDrivers({ limit: 1000 })
        ]);
        if (vehRes.success) setAllVehicles(vehRes.data.items || vehRes.data);
        if (drvRes.success) setAllDrivers(drvRes.data);
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    };
    fetchFilterData();
  }, []);

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (meta.current_page !== 1) {
        setMeta((prev) => ({ ...prev, current_page: 1 }));
      } else {
        fetchTrips();
      }
    }, 500);
    return () => clearTimeout(handler);
    // eslint-disable-next-line
  }, [search]);

  const loadCreationData = async () => {
    try {
      const [vehRes, drvRes] = await Promise.all([vehicleService.getAvailableVehicles(), getAvailableDrivers()]);
      if (vehRes.success) setAvailableVehicles(vehRes.data);
      if (drvRes.success) setAvailableDrivers(drvRes.data);
    } catch (err) {
      showToast("Failed to load available vehicles and drivers", "error");
    }
  };

  const openModal = async (mode, trip = null) => {
    setModalMode(mode);
    setSelectedTrip(trip);

    if (mode === "add") {
      await loadCreationData();
      setFormData({
        vehicle_id: "",
        driver_id: "",
        source_location: "",
        destination_location: "",
        cargo_weight: "",
        planned_distance: ""
      });
    } else if (mode === "complete") {
      setCompletionData({
        end_odometer: "",
        fuel_consumed: "",
        revenue: ""
      });
      setFormErrors({});
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTrip(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompletionChange = (e) => {
    const { name, value } = e.target;
    setCompletionData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await createTrip(formData);
      if (res.success) {
        showToast("Trip created successfully");
        closeModal();
        fetchTrips();
      } else {
        showToast(res.message, "error");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Creation failed", "error");
    }
  };

  const handleCompleteSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormErrors({});
    try {
      const res = await completeTrip(selectedTrip.id, completionData);
      if (res.success) {
        showToast(res.message);
        closeModal();
        fetchTrips();
      } else {
        if (res.message && res.message.toLowerCase().includes("odometer")) {
          setFormErrors({ end_odometer: res.message });
        } else {
          showToast(res.message, "error");
        }
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Completion failed";
      if (msg.toLowerCase().includes("odometer")) {
        setFormErrors({ end_odometer: msg });
      } else {
        showToast(msg, "error");
      }
    }
  };

  const handleAction = async (actionFn, ...args) => {
    try {
      const res = await actionFn(...args);
      if (res.success) {
        showToast(res.message);
        closeModal();
        fetchTrips();
      } else {
        showToast(res.message, "error");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Action failed", "error");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Draft": return "draft";
      case "Dispatched": return "dispatched";
      case "Completed": return "completed";
      case "Cancelled": return "cancelled";
      default: return "";
    }
  };

  return (
    <div className="vehicles-container">
      <div className="vehicles-header">
        <div className="vehicles-header-text">
          <h1>Trip Management</h1>
          <p>Manage fleet operations and trips</p>
        </div>
        {canCreate && (
          <button className="add-btn" onClick={() => openModal("add")}>
            <Plus size={18} strokeWidth={2.5} /> Create Trip
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card total">
          <span className="kpi-label">Total Trips</span>
          <span className="kpi-value">{summary.total}</span>
        </div>
        <div className="kpi-card draft">
          <span className="kpi-label">Draft</span>
          <span className="kpi-value">{summary.draft}</span>
        </div>
        <div className="kpi-card dispatched">
          <span className="kpi-label">Active (Dispatched)</span>
          <span className="kpi-value">{summary.active}</span>
        </div>
        <div className="kpi-card completed">
          <span className="kpi-label">Completed</span>
          <span className="kpi-value">{summary.completed}</span>
        </div>
        <div className="kpi-card cancelled">
          <span className="kpi-label">Cancelled</span>
          <span className="kpi-value">{summary.cancelled}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="controls-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search Trip ID, Location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filters-group">
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select className="filter-select" value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
            <option value="">All Vehicles</option>
            {allVehicles.map(v => (
              <option key={v.id} value={v.id}>{v.registration_number}</option>
            ))}
          </select>
          <select className="filter-select" value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)}>
            <option value="">All Drivers</option>
            {allDrivers.map(d => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        {loading ? (
          <div className="loading-state">Loading trips...</div>
        ) : trips.length === 0 ? (
          <div className="empty-state">
            <p>No trips found.</p>
            {canCreate && (
              <button className="add-btn" style={{marginTop: '16px'}} onClick={() => openModal('add')}>
                <Plus size={18} strokeWidth={2.5} /> Create Trip
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td>{t.trip_number}</td>
                    <td>{t.source_location}</td>
                    <td>{t.destination_location}</td>
                    <td>{t.vehicle_registration}</td>
                    <td>{t.driver_name}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>{t.dispatch_time ? t.dispatch_time.substring(0, 10) : '-'}</td>
                    <td className="actions-cell">
                      <button className="action-btn btn-icon-only" title="View Details" onClick={() => openModal("view", t)}><Eye size={16} /></button>

                      {canCreate && t.status === 'Draft' && (
                        <>
                          <button className="action-btn btn-icon-only" title="Dispatch Trip" onClick={() => openModal("dispatch", t)} style={{ color: '#3B82F6' }}><Play size={16} /></button>
                          <button className="action-btn delete btn-icon-only" title="Cancel Trip" onClick={() => openModal("cancel", t)}><XCircle size={16} /></button>
                        </>
                      )}

                      {t.status === 'Dispatched' && (
                        <>
                          {canComplete && (
                            <button className="action-btn btn-icon-only" title="Complete Trip" onClick={() => openModal("complete", t)} style={{ color: '#10B981' }}><CheckCircle size={16} /></button>
                          )}
                          {canCreate && (
                            <button className="action-btn delete btn-icon-only" title="Cancel Trip" onClick={() => openModal("cancel", t)}><XCircle size={16} /></button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <div className="page-info">
                Showing {(meta.current_page - 1) * meta.limit + 1} to {Math.min(meta.current_page * meta.limit, summary.total)} of {summary.total} entries
              </div>
              <div className="pagination-controls">
                <select className="filter-select" value={meta.limit} onChange={(e) => setMeta({ ...meta, limit: parseInt(e.target.value), current_page: 1 })}>
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
                <button
                  className="page-btn"
                  disabled={meta.current_page <= 1}
                  onClick={() => setMeta({ ...meta, current_page: meta.current_page - 1 })}
                >Prev</button>
                <button
                  className="page-btn"
                  disabled={meta.current_page >= meta.total_pages}
                  onClick={() => setMeta({ ...meta, current_page: meta.current_page + 1 })}
                >Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Creation Modal */}
      {modalMode === "add" && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title="Create Trip">
          <form onSubmit={handleCreateTrip}>
            <div className="view-details">
              <div className="form-group">
                <label>Source Location *</label>
                <input type="text" name="source_location" className="form-control" required value={formData.source_location} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Destination Location *</label>
                <input type="text" name="destination_location" className="form-control" required value={formData.destination_location} onChange={handleInputChange} />
              </div>
              
              <div className="form-group">
                <label>Select Vehicle *</label>
                <select name="vehicle_id" className="form-control" required value={formData.vehicle_id} onChange={handleInputChange}>
                  <option value="">-- Choose Available Vehicle --</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} (Max Load: {v.max_load_capacity})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Driver *</label>
                <select name="driver_id" className="form-control" required value={formData.driver_id} onChange={handleInputChange}>
                  <option value="">-- Choose Available Driver --</option>
                  {availableDrivers.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name} ({d.license_number})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Cargo Weight *</label>
                <input type="number" name="cargo_weight" className="form-control" min="0" step="0.1" required value={formData.cargo_weight} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Planned Distance (optional)</label>
                <input type="number" name="planned_distance" className="form-control" min="0" step="0.1" value={formData.planned_distance} onChange={handleInputChange} />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-submit" style={{ background: '#3B82F6', color: '#fff', border: 'none' }}>Create Draft Trip</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Complete Trip Modal */}
      {modalMode === "complete" && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={`Complete Trip: ${selectedTrip?.trip_number}`}>
          <form onSubmit={handleCompleteSubmit}>
            <p style={{marginBottom: '16px'}}>Please enter the final trip details before completing.</p>
            <div className="form-group">
              <label>Final Odometer Reading *</label>
              <input type="number" name="end_odometer" className="form-control" required value={completionData.end_odometer} onChange={handleCompletionChange} />
              {formErrors.end_odometer && <span className="error-text">{formErrors.end_odometer}</span>}
            </div>
            <div className="form-group">
              <label>Fuel Consumed (Liters)</label>
              <input type="number" name="fuel_consumed" className="form-control" value={completionData.fuel_consumed} onChange={handleCompletionChange} />
            </div>
            <div className="form-group">
              <label>Revenue Generated ($)</label>
              <input type="number" name="revenue" className="form-control" value={completionData.revenue} onChange={handleCompletionChange} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-submit" style={{ background: '#10B981', color: '#fff', border: 'none' }}>Mark as Completed</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dispatch/Cancel Confirmation Modals */}
      {(modalMode === "dispatch" || modalMode === "cancel") && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === "dispatch" ? "Dispatch Trip" : "Cancel Trip"}>
          <div>
            <p>
              {modalMode === "dispatch"
                ? `Are you sure you want to dispatch trip ${selectedTrip?.trip_number}? This will mark the assigned Vehicle and Driver as 'On Trip'.`
                : `Are you sure you want to cancel trip ${selectedTrip?.trip_number}? This will free up the assigned Vehicle and Driver.`}
            </p>
            <div className="form-actions">
              <button className="btn-cancel" onClick={closeModal}>Go Back</button>
              <button
                className="btn-submit"
                style={{ background: modalMode === "dispatch" ? '#3B82F6' : '#EF4444', color: '#fff', border: 'none' }}
                onClick={() => handleAction(modalMode === "dispatch" ? dispatchTrip : cancelTrip, selectedTrip.id)}
              >
                Confirm {modalMode === "dispatch" ? "Dispatch" : "Cancel"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {modalMode === "view" && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={`Trip Details: ${selectedTrip?.trip_number}`}>
          <div>
            <div className="view-details">
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge ${getStatusBadgeClass(selectedTrip?.status)}`}>{selectedTrip?.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Vehicle</div><div className="detail-value">{selectedTrip?.vehicle_registration}</div></div>
              <div className="detail-item"><div className="detail-label">Driver</div><div className="detail-value">{selectedTrip?.driver_name}</div></div>
              <div className="detail-item"><div className="detail-label">Cargo Weight</div><div className="detail-value">{selectedTrip?.cargo_weight} kg</div></div>
              <div className="detail-item"><div className="detail-label">Source</div><div className="detail-value">{selectedTrip?.source_location}</div></div>
              <div className="detail-item"><div className="detail-label">Destination</div><div className="detail-value">{selectedTrip?.destination_location}</div></div>
              <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{selectedTrip?.created_at?.substring(0, 10)}</div></div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={closeModal}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Notification */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Trips;

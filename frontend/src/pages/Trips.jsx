import { useState, useEffect } from "react";
import { getTrips, createTrip, dispatchTrip, completeTrip, cancelTrip } from "../services/tripService";
import { getAvailableDrivers, getDrivers } from "../services/driverService";
import { vehicleService } from "../services/vehicleService";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import "../styles/dashboard.css";
import "../styles/vehicles.css";

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState({ total: 0, draft: 0, active: 0, completed: 0, cancelled: 0 });
  const [meta, setMeta] = useState({ current_page: 1, total_pages: 1, limit: 10 });
  const [loading, setLoading] = useState(false);

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
      case "Draft": return "bg-gray-400"; // Using inline colors or standard classes from vehicles.css
      case "Dispatched": return "blue";
      case "Completed": return "green";
      case "Cancelled": return "red";
      default: return "";
    }
  };

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Trip Management</h2>
        <button className="btn-primary" onClick={() => openModal("add")}>+ Create Trip</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Trips</span>
          <span className="kpi-value">{summary.total}</span>
        </div>
        <div className="kpi-card" style={{ borderLeftColor: '#9CA3AF' }}>
          <span className="kpi-label">Draft</span>
          <span className="kpi-value">{summary.draft}</span>
        </div>
        <div className="kpi-card blue">
          <span className="kpi-label">Active (Dispatched)</span>
          <span className="kpi-value">{summary.active}</span>
        </div>
        <div className="kpi-card green">
          <span className="kpi-label">Completed</span>
          <span className="kpi-value">{summary.completed}</span>
        </div>
        <div className="kpi-card red">
          <span className="kpi-label">Cancelled</span>
          <span className="kpi-value">{summary.cancelled}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="filters-row">
        <div className="filter-group">
          <label className="filter-label">Search</label>
          <input
            type="text"
            className="filter-select"
            placeholder="Trip ID, Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Vehicle</label>
          <select className="filter-select" value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
            <option value="">All Vehicles</option>
            {allVehicles.map(v => (
              <option key={v.id} value={v.id}>{v.registration_number}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Driver</label>
          <select className="filter-select" value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)}>
            <option value="">All Drivers</option>
            {allDrivers.map(d => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container" style={{ overflowX: 'auto', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
        <table className="data-table trips-table">
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
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: "center" }}>Loading...</td></tr>
            ) : trips.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: "center" }}>No trips found.</td></tr>
            ) : (
              trips.map((t) => (
                <tr key={t.id}>
                  <td>{t.trip_number}</td>
                  <td>{t.source_location}</td>
                  <td>{t.destination_location}</td>
                  <td>{t.vehicle_registration}</td>
                  <td>{t.driver_name}</td>
                  <td>
                    <span className={`status-badge status-bar-fill ${getStatusBadgeClass(t.status)}`} style={{ width: 'auto', display: 'inline-block', backgroundColor: t.status === 'Draft' ? '#9CA3AF' : undefined }}>
                      {t.status}
                    </span>
                  </td>
                  <td>{t.dispatch_time ? t.dispatch_time.substring(0, 10) : '-'}</td>
                  <td>
                    <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-sm" onClick={() => openModal("view", t)}>View</button>

                      {t.status === 'Draft' && (
                        <>
                          <button className="btn-sm" style={{ backgroundColor: '#3B82F6', color: '#fff', border: 'none' }} onClick={() => openModal("dispatch", t)}>Dispatch</button>
                          <button className="btn-sm btn-danger" style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none' }} onClick={() => openModal("cancel", t)}>Cancel</button>
                        </>
                      )}

                      {t.status === 'Dispatched' && (
                        <>
                          <button className="btn-sm" style={{ backgroundColor: '#10B981', color: '#fff', border: 'none' }} onClick={() => openModal("complete", t)}>Complete</button>
                          <button className="btn-sm btn-danger" style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none' }} onClick={() => openModal("cancel", t)}>Cancel</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="limit-selector">
          <label>Rows per page: </label>
          <select value={meta.limit} onChange={(e) => setMeta({ ...meta, limit: parseInt(e.target.value), current_page: 1 })} style={{ padding: '4px' }}>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <div className="page-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            disabled={meta.current_page <= 1}
            onClick={() => setMeta({ ...meta, current_page: meta.current_page - 1 })}
            style={{ padding: '4px 12px' }}
          >Prev</button>
          <span>Page {meta.current_page} of {meta.total_pages || 1}</span>
          <button
            disabled={meta.current_page >= meta.total_pages}
            onClick={() => setMeta({ ...meta, current_page: meta.current_page + 1 })}
            style={{ padding: '4px 12px' }}
          >Next</button>
        </div>
      </div>

      {/* Creation Modal */}
      {modalMode === "add" && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title="Create Trip">
          <form onSubmit={handleCreateTrip} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label>Source Location</label>
                <input type="text" name="source_location" className="filter-select" required value={formData.source_location} onChange={handleInputChange} />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label>Destination Location</label>
                <input type="text" name="destination_location" className="filter-select" required value={formData.destination_location} onChange={handleInputChange} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label>Select Vehicle</label>
                <select name="vehicle_id" className="filter-select" required value={formData.vehicle_id} onChange={handleInputChange}>
                  <option value="">-- Choose Available Vehicle --</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} (Max Load: {v.max_load_capacity})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label>Select Driver</label>
                <select name="driver_id" className="filter-select" required value={formData.driver_id} onChange={handleInputChange}>
                  <option value="">-- Choose Available Driver --</option>
                  {availableDrivers.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name} ({d.license_number})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label>Cargo Weight</label>
                <input type="number" name="cargo_weight" className="filter-select" min="0" step="0.1" required value={formData.cargo_weight} onChange={handleInputChange} />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label>Planned Distance (optional)</label>
                <input type="number" name="planned_distance" className="filter-select" min="0" step="0.1" value={formData.planned_distance} onChange={handleInputChange} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button type="button" className="btn-secondary" style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create Draft Trip</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Complete Trip Modal */}
      {modalMode === "complete" && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={`Complete Trip: ${selectedTrip?.trip_number}`}>
          <form onSubmit={handleCompleteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p>Please enter the final trip details before completing.</p>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label>Final Odometer Reading</label>
              <input type="number" name="end_odometer" className="filter-select" required value={completionData.end_odometer} onChange={handleCompletionChange} />
              {formErrors.end_odometer && <span style={{ color: '#EF4444', fontSize: '13px', marginTop: '4px' }}>{formErrors.end_odometer}</span>}
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label>Fuel Consumed (Liters)</label>
              <input type="number" name="fuel_consumed" className="filter-select" value={completionData.fuel_consumed} onChange={handleCompletionChange} />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label>Revenue Generated ($)</label>
              <input type="number" name="revenue" className="filter-select" value={completionData.revenue} onChange={handleCompletionChange} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button type="button" className="btn-secondary" style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Mark as Completed</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dispatch/Cancel Confirmation Modals */}
      {(modalMode === "dispatch" || modalMode === "cancel") && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === "dispatch" ? "Dispatch Trip" : "Cancel Trip"}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p>
              {modalMode === "dispatch"
                ? `Are you sure you want to dispatch trip ${selectedTrip?.trip_number}? This will mark the assigned Vehicle and Driver as 'On Trip'.`
                : `Are you sure you want to cancel trip ${selectedTrip?.trip_number}? This will free up the assigned Vehicle and Driver.`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={closeModal}>Go Back</button>
              <button
                className="btn-primary"
                style={{ padding: '8px 16px', background: modalMode === "dispatch" ? '#3B82F6' : '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p><strong>Status:</strong> {selectedTrip?.status}</p>
            <p><strong>Route:</strong> {selectedTrip?.source_location} ➔ {selectedTrip?.destination_location}</p>
            <p><strong>Vehicle:</strong> {selectedTrip?.vehicle_registration}</p>
            <p><strong>Driver:</strong> {selectedTrip?.driver_name}</p>
            <p><strong>Cargo Weight:</strong> {selectedTrip?.cargo_weight} kg</p>
            <p><strong>Created:</strong> {selectedTrip?.created_at?.substring(0, 10)}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-secondary" style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={closeModal}>Close</button>
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

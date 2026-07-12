import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Eye, Edit2, Trash2, Plus } from "lucide-react";
import { getDrivers, createDriver, updateDriver, deleteDriver } from "../services/driverService";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import "../styles/vehicles.css";

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, available: 0, on_trip: 0, off_duty: 0, suspended: 0 });
  const [meta, setMeta] = useState({ current_page: 1, total_pages: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const role = user?.role || '';
  const canAdd = role === 'Fleet Manager';
  const canEdit = role === 'Fleet Manager' || role === 'Safety Officer';

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add, edit, view, delete
  const [selectedDriver, setSelectedDriver] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    license_number: "",
    license_category: "",
    license_expiry: "",
    contact_number: "",
    safety_score: 100,
    status: "Available"
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    setToasts((prev) => [...prev, { id: Date.now(), message, type }]);
  };
  
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = addToast;

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = {
        page: meta.current_page,
        limit: meta.limit,
        search,
        status: statusFilter,
        category: categoryFilter,
      };
      const response = await getDrivers(params);
      if (response.success) {
        setDrivers(response.data);
        setSummary(response.summary);
        setMeta(response.meta);
      }
    } catch (error) {
      showToast("Error fetching drivers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    // eslint-disable-next-line
  }, [meta.current_page, meta.limit, statusFilter, categoryFilter]);

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (meta.current_page !== 1) {
        setMeta((prev) => ({ ...prev, current_page: 1 }));
      } else {
        fetchDrivers();
      }
    }, 500);
    return () => clearTimeout(handler);
    // eslint-disable-next-line
  }, [search]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openModal = (mode, driver = null) => {
    setModalMode(mode);
    setSelectedDriver(driver);
    if (driver && mode !== 'add') {
      setFormData({
        full_name: driver.full_name || "",
        license_number: driver.license_number || "",
        license_category: driver.license_category || "",
        license_expiry: driver.license_expiry || "",
        contact_number: driver.contact_number || "",
        safety_score: driver.safety_score || 100,
        status: driver.status || "Available"
      });
    } else {
      setFormData({
        full_name: "",
        license_number: "",
        license_category: "",
        license_expiry: "",
        contact_number: "",
        safety_score: 100,
        status: "Available"
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDriver(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (modalMode === 'delete') {
      try {
        const res = await deleteDriver(selectedDriver.id);
        if (res.success) {
          showToast("Driver deleted successfully");
          closeModal();
          fetchDrivers();
        } else {
          showToast(res.message, "error");
        }
      } catch (error) {
        showToast(error.response?.data?.message || "Deletion failed", "error");
        closeModal();
      }
      return;
    }

    try {
      if (modalMode === "add") {
        const res = await createDriver(formData);
        if (res.success) {
          showToast("Driver created successfully");
          closeModal();
          fetchDrivers();
        } else {
          showToast(res.message, "error");
        }
      } else if (modalMode === "edit") {
        const res = await updateDriver(selectedDriver.id, formData);
        if (res.success) {
          showToast("Driver updated successfully");
          closeModal();
          fetchDrivers();
        } else {
          showToast(res.message, "error");
        }
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Operation failed", "error");
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Available": return "available";
      case "On Trip": return "on-trip";
      case "Off Duty": return "off-duty";
      case "Suspended": return "suspended";
      default: return "";
    }
  };

  return (
    <div className="vehicles-container">
      <div className="vehicles-header">
        <div className="vehicles-header-text">
          <h1>Driver Management</h1>
          <p>Manage all fleet drivers</p>
        </div>
        {canAdd && (
          <button className="add-btn" onClick={() => openModal("add")}>
            <Plus size={18} strokeWidth={2.5} /> Add Driver
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card total">
          <span className="kpi-label">Total Drivers</span>
          <span className="kpi-value">{summary.total}</span>
        </div>
        <div className="kpi-card available">
          <span className="kpi-label">Available</span>
          <span className="kpi-value">{summary.available}</span>
        </div>
        <div className="kpi-card on-trip">
          <span className="kpi-label">On Trip</span>
          <span className="kpi-value">{summary.on_trip}</span>
        </div>
        <div className="kpi-card off-duty">
          <span className="kpi-label">Off Duty</span>
          <span className="kpi-value">{summary.off_duty}</span>
        </div>
        <div className="kpi-card suspended">
          <span className="kpi-label">Suspended</span>
          <span className="kpi-value">{summary.suspended}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="controls-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search Name, License..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filters-group">
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
          <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            <option value="CDL-A">CDL-A</option>
            <option value="CDL-B">CDL-B</option>
            <option value="Class D">Class D</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        {loading ? (
          <div className="loading-state">Loading drivers...</div>
        ) : drivers.length === 0 ? (
          <div className="empty-state">
            <p>No drivers found.</p>
            {canAdd && (
              <button className="add-btn" style={{marginTop: '16px'}} onClick={() => openModal('add')}>
                <Plus size={18} strokeWidth={2.5} /> Add Driver
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>License No.</th>
                  <th>Category</th>
                  <th>Expiry Date</th>
                  <th>Contact</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td>{d.full_name}</td>
                    <td>{d.license_number}</td>
                    <td>{d.license_category}</td>
                    <td>{d.license_expiry}</td>
                    <td>{d.contact_number}</td>
                    <td>{d.safety_score}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="action-btn btn-icon-only" title="View Details" onClick={() => openModal("view", d)}><Eye size={16} /></button>
                      {canEdit && (
                        <>
                          <button className="action-btn btn-icon-only" title="Edit Driver" onClick={() => openModal("edit", d)}><Edit2 size={16} /></button>
                          <button className="action-btn delete btn-icon-only" title="Delete Driver" onClick={() => openModal("delete", d)}><Trash2 size={16} /></button>
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

      {/* Driver Modal (Add/Edit/View/Delete) */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalMode === "add" ? "Add Driver" : modalMode === "edit" ? "Edit Driver" : modalMode === "delete" ? "Confirm Delete" : "Driver Details"}
      >
        {modalMode === "delete" ? (
          <div>
            <p>Are you sure you want to delete the driver <strong>{selectedDriver?.full_name}</strong>?</p>
            <p className="error-text">This action cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleSubmit} style={{ padding: '8px 16px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ) : modalMode === "view" ? (
          <div>
            <div className="view-details">
              <div className="detail-item"><div className="detail-label">Full Name</div><div className="detail-value">{formData.full_name}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`status-badge ${getStatusClass(formData.status)}`}>{formData.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">License No.</div><div className="detail-value">{formData.license_number}</div></div>
              <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{formData.license_category || 'N/A'}</div></div>
              <div className="detail-item"><div className="detail-label">Expiry Date</div><div className="detail-value">{formData.license_expiry}</div></div>
              <div className="detail-item"><div className="detail-label">Contact</div><div className="detail-value">{formData.contact_number}</div></div>
              <div className="detail-item"><div className="detail-label">Safety Score</div><div className="detail-value">{formData.safety_score}</div></div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Close</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="view-details">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="full_name" className="form-control" required value={formData.full_name} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>License Number *</label>
                <input type="text" name="license_number" className="form-control" required value={formData.license_number} onChange={handleInputChange} disabled={modalMode !== "add"} />
              </div>

              <div className="form-group">
                <label>License Category</label>
                <select name="license_category" className="form-control" value={formData.license_category} onChange={handleInputChange}>
                  <option value="">Select Category</option>
                  <option value="CDL-A">CDL-A</option>
                  <option value="CDL-B">CDL-B</option>
                  <option value="Class D">Class D</option>
                </select>
              </div>

              <div className="form-group">
                <label>License Expiry *</label>
                <input type="date" name="license_expiry" className="form-control" required value={formData.license_expiry} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Contact Number *</label>
                <input type="text" name="contact_number" className="form-control" required value={formData.contact_number} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Safety Score</label>
                <input type="number" name="safety_score" className="form-control" min="0" max="100" step="0.1" value={formData.safety_score} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleInputChange}>
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-submit" style={{ padding: '8px 16px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Driver</button>
            </div>
          </form>
        )}
      </Modal>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Drivers;

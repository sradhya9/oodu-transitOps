import { useState, useEffect } from "react";
import { getDrivers, createDriver, updateDriver, deleteDriver } from "../services/driverService";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import "../styles/dashboard.css";
import "../styles/vehicles.css";

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, available: 0, on_trip: 0, off_duty: 0, suspended: 0 });
  const [meta, setMeta] = useState({ current_page: 1, total_pages: 1, limit: 10 });
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add, edit, view
  const [selectedDriver, setSelectedDriver] = useState(null);
  
  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
    if (driver) {
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
    e.preventDefault();
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

  const handleDelete = async () => {
    try {
      const res = await deleteDriver(selectedDriver.id);
      if (res.success) {
        showToast("Driver deleted successfully");
        setIsDeleteModalOpen(false);
        setSelectedDriver(null);
        fetchDrivers();
      } else {
        showToast(res.message, "error");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Deletion failed", "error");
      setIsDeleteModalOpen(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Available": return "green";
      case "On Trip": return "blue";
      case "Off Duty": return "orange";
      case "Suspended": return "red";
      default: return "";
    }
  };

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Driver Management</h2>
        <button className="btn-primary" onClick={() => openModal("add")}>+ Add Driver</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Drivers</span>
          <span className="kpi-value">{summary.total}</span>
        </div>
        <div className="kpi-card green">
          <span className="kpi-label">Available</span>
          <span className="kpi-value">{summary.available}</span>
        </div>
        <div className="kpi-card blue">
          <span className="kpi-label">On Trip</span>
          <span className="kpi-value">{summary.on_trip}</span>
        </div>
        <div className="kpi-card orange">
          <span className="kpi-label">Off Duty</span>
          <span className="kpi-value">{summary.off_duty}</span>
        </div>
        <div className="kpi-card red">
          <span className="kpi-label">Suspended</span>
          <span className="kpi-value">{summary.suspended}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="filters-row">
        <div className="filter-group">
          <label className="filter-label">Search</label>
          <input
            type="text"
            className="filter-select"
            placeholder="Name, License..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            <option value="CDL-A">CDL-A</option>
            <option value="CDL-B">CDL-B</option>
            <option value="Class D">Class D</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container" style={{ overflowX: 'auto', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
        <table className="data-table trips-table">
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
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: "center" }}>Loading...</td></tr>
            ) : drivers.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: "center" }}>No drivers found.</td></tr>
            ) : (
              drivers.map((d) => (
                <tr key={d.id}>
                  <td>{d.full_name}</td>
                  <td>{d.license_number}</td>
                  <td>{d.license_category}</td>
                  <td>{d.license_expiry}</td>
                  <td>{d.contact_number}</td>
                  <td>{d.safety_score}</td>
                  <td>
                    <span className={`status-badge status-bar-fill ${getStatusBadgeClass(d.status)}`} style={{ width: 'auto', display: 'inline-block' }}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-sm" onClick={() => openModal("view", d)}>View</button>
                      <button className="btn-sm" onClick={() => openModal("edit", d)}>Edit</button>
                      <button className="btn-sm btn-danger" style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }} onClick={() => { setSelectedDriver(d); setIsDeleteModalOpen(true); }}>Delete</button>
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

      {/* Driver Modal (Add/Edit/View) */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalMode === "add" ? "Add Driver" : modalMode === "edit" ? "Edit Driver" : "Driver Details"}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label>Full Name</label>
            <input type="text" name="full_name" className="filter-select" required value={formData.full_name} onChange={handleInputChange} disabled={modalMode === "view"} />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label>License Number</label>
            <input type="text" name="license_number" className="filter-select" required value={formData.license_number} onChange={handleInputChange} disabled={modalMode !== "add"} />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label>License Category</label>
              <select name="license_category" className="filter-select" value={formData.license_category} onChange={handleInputChange} disabled={modalMode === "view"}>
                <option value="">Select Category</option>
                <option value="CDL-A">CDL-A</option>
                <option value="CDL-B">CDL-B</option>
                <option value="Class D">Class D</option>
              </select>
            </div>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label>License Expiry</label>
              <input type="date" name="license_expiry" className="filter-select" required value={formData.license_expiry} onChange={handleInputChange} disabled={modalMode === "view"} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label>Contact Number</label>
              <input type="text" name="contact_number" className="filter-select" required value={formData.contact_number} onChange={handleInputChange} disabled={modalMode === "view"} />
            </div>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label>Safety Score</label>
              <input type="number" name="safety_score" className="filter-select" min="0" max="100" step="0.1" value={formData.safety_score} onChange={handleInputChange} disabled={modalMode === "view"} />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label>Status</label>
            <select name="status" className="filter-select" value={formData.status} onChange={handleInputChange} disabled={modalMode === "view"}>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="Off Duty">Off Duty</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {modalMode !== "view" && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button type="button" className="btn-secondary" style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Driver</button>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>Are you sure you want to delete the driver <strong>{selectedDriver?.full_name}</strong>? This action cannot be undone.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-secondary" style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
            <button className="btn-danger" style={{ padding: '8px 16px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={handleDelete}>Delete Driver</button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Drivers;

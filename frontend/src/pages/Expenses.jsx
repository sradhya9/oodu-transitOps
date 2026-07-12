import { useState, useEffect } from 'react';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} from '../services/expenseService';
import '../styles/dashboard.css';
import '../styles/maintenance.css';

const EXPENSE_TYPES = ['Fuel', 'Maintenance', 'Toll', 'Repair', 'Insurance', 'Other'];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentExpenseId, setCurrentExpenseId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    expense_type: 'Other',
    amount: '',
    description: '',
    expense_date: '',
    vehicle_id: '',
    trip_id: '',
    created_by: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [formSubmitError, setFormSubmitError] = useState(null);

  // Fetch expenses on mount
  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setError('Failed to load expense records. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

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
    setCurrentExpenseId(null);
    setFormErrors({});
    setFormSubmitError(null);

    const today = new Date().toISOString().split('T')[0];
    setFormData({
      expense_type: 'Other',
      amount: '',
      description: '',
      expense_date: today,
      vehicle_id: '',
      trip_id: '',
      created_by: ''
    });
    setShowModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (expense) => {
    setIsEditing(true);
    setCurrentExpenseId(expense.id);
    setFormErrors({});
    setFormSubmitError(null);
    setFormData({
      expense_type: expense.expense_type || 'Other',
      amount: expense.amount !== null ? expense.amount.toString() : '',
      description: expense.description || '',
      expense_date: expense.expense_date || '',
      vehicle_id: expense.vehicle_id !== null ? expense.vehicle_id.toString() : '',
      trip_id: expense.trip_id !== null ? expense.trip_id.toString() : '',
      created_by: expense.created_by !== null ? expense.created_by.toString() : ''
    });
    setShowModal(true);
  };

  // Form validations
  const validateForm = () => {
    const errors = {};
    
    if (!formData.expense_type || !EXPENSE_TYPES.includes(formData.expense_type)) {
      errors.expense_type = 'A valid expense type is required';
    }

    if (!formData.amount || formData.amount.toString().trim() === '') {
      errors.amount = 'Amount is required';
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) < 0) {
      errors.amount = 'Amount must be a numeric value greater than or equal to 0';
    }

    if (!formData.expense_date || formData.expense_date.trim() === '') {
      errors.expense_date = 'Date is required';
    }

    if (formData.vehicle_id && formData.vehicle_id.toString().trim() !== '') {
      if (isNaN(Number(formData.vehicle_id)) || !Number.isInteger(Number(formData.vehicle_id))) {
        errors.vehicle_id = 'Vehicle ID must be an integer';
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
      expense_type: formData.expense_type,
      amount: parseFloat(formData.amount),
      expense_date: formData.expense_date,
      description: formData.description || null,
      vehicle_id: formData.vehicle_id !== '' ? parseInt(formData.vehicle_id, 10) : null,
      trip_id: formData.trip_id !== '' ? parseInt(formData.trip_id, 10) : null,
      created_by: formData.created_by !== '' ? parseInt(formData.created_by, 10) : null
    };

    try {
      if (isEditing) {
        await updateExpense(currentExpenseId, payload);
      } else {
        await createExpense(payload);
      }
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      console.error('Form submission failed:', err);
      if (err.response && err.response.data && err.response.data.errors) {
        setFormErrors(err.response.data.errors);
      } else if (err.response && err.response.data && err.response.data.error) {
        setFormSubmitError(err.response.data.error);
      } else {
        setFormSubmitError('Failed to save expense. Please check input values.');
      }
    }
  };

  // Handle delete
  const handleDeleteExpense = async (id) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete expense record #${id}?`);
    if (!confirmDelete) return;

    try {
      await deleteExpense(id);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert(err.response?.data?.error || 'Failed to delete the expense record.');
    }
  };

  // Search & filter logic
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      (exp.expense_type && exp.expense_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exp.vehicle_id && exp.vehicle_id.toString().includes(searchQuery));

    const matchesType = typeFilter === 'All' || exp.expense_type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div>
      {/* Search and Filters */}
      <div className="filters-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="filter-group">
            <span className="filter-label">Search</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search type, desc, vehicle ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <span className="filter-label">Type Filter</span>
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              {EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd} style={{ alignSelf: 'flex-end' }}>
          + Add Expense
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {/* Main Table */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">Loading expenses...</div>
        </div>
      ) : filteredExpenses.length > 0 ? (
        <div className="recent-trips-section">
          <table className="trips-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Expense Type</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Vehicle ID</th>
                <th>Trip ID</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td>#{exp.id}</td>
                  <td>
                    <span className="user-badge" style={{ display: 'inline-block', width: 'fit-content' }}>
                      {exp.expense_type}
                    </span>
                  </td>
                  <td>${exp.amount.toFixed(2)}</td>
                  <td>{exp.expense_date}</td>
                  <td>{exp.vehicle_id !== null ? exp.vehicle_id : <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                  <td>{exp.trip_id !== null ? exp.trip_id : <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exp.description}>
                    {exp.description || <span style={{ color: '#9CA3AF' }}>—</span>}
                  </td>
                  <td>
                    <button className="btn-edit" onClick={() => handleOpenEdit(exp)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDeleteExpense(exp.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h3>No Expense Records Found</h3>
          <p>Try refining your search query or filters, or add a new expense log.</p>
        </div>
      )}

      {/* Modal Dialog Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{isEditing ? `Edit Expense Record #${currentExpenseId}` : 'Log New Expense'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            {formSubmitError && <div className="error-alert">{formSubmitError}</div>}

            <form onSubmit={handleFormSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Expense Type *</label>
                  <select
                    name="expense_type"
                    className="form-select"
                    value={formData.expense_type}
                    onChange={handleInputChange}
                  >
                    {EXPENSE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {formErrors.expense_type && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.expense_type}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Amount ($) *</label>
                  <input
                    type="text"
                    name="amount"
                    className="form-input"
                    placeholder="e.g. 150.00"
                    value={formData.amount}
                    onChange={handleInputChange}
                  />
                  {formErrors.amount && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.amount}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Expense Date *</label>
                  <input
                    type="date"
                    name="expense_date"
                    className="form-input"
                    value={formData.expense_date}
                    onChange={handleInputChange}
                  />
                  {formErrors.expense_date && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.expense_date}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle ID</label>
                  <input
                    type="text"
                    name="vehicle_id"
                    className="form-input"
                    placeholder="e.g. 5 (optional)"
                    value={formData.vehicle_id}
                    onChange={handleInputChange}
                  />
                  {formErrors.vehicle_id && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.vehicle_id}</span>}
                </div>
              </div>

              <div className="form-row">
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
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Details about the expense..."
                  value={formData.description}
                  onChange={handleInputChange}
                />
                {formErrors.description && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{formErrors.description}</span>}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{isEditing ? 'Save Changes' : 'Log Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

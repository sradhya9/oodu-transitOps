import { useState, useEffect, useMemo } from 'react';
import {
  getDashboardSummary,
  getFuelEfficiency,
  getFleetUtilization,
  getVehicleROI,
  getOperationalCost
} from '../services/reportService';
import { getMaintenanceLogs } from '../services/maintenanceService';
import '../styles/dashboard.css';
import '../styles/maintenance.css';

// ==========================================
// Reusable Helper Functions & Component Views
// ==========================================

const formatCurrency = (val) => val !== null && val !== undefined
  ? `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : '₹0.00';

const KpiCard = ({ title, value, color }) => (
  <div className={`kpi-card ${color}`}>
    <span className="kpi-label">{title}</span>
    <span className="kpi-value">{value}</span>
  </div>
);

const BarRow = ({ label, percentage, valueText, color }) => (
  <div className="bar-chart-row">
    <span className="bar-chart-label">{label}</span>
    <div className="bar-chart-track">
      <div className="bar-chart-fill" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
    </div>
    <span className="bar-chart-value">{valueText}</span>
  </div>
);

const PendingBanner = ({ title, message, formula }) => (
  <div className="info-banner">
    <h4>{title}</h4>
    <p>{message}</p>
    {formula && (
      <code style={{ display: 'block', marginTop: '8px', color: '#1E3A8A', fontSize: '0.8rem' }}>
        Formula: {formula}
      </code>
    )}
  </div>
);

// ==========================================
// Main Reports Dashboard Page Component
// ==========================================

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Raw API Response States
  const [dashboardData, setDashboardData] = useState(null);
  const [fuelEfficiencyData, setFuelEfficiencyData] = useState([]);
  const [fleetUtilizationData, setFleetUtilizationData] = useState(null);
  const [vehicleRoiData, setVehicleRoiData] = useState(null);
  const [operationalCostData, setOperationalCostData] = useState(null);
  const [maintenanceChartData, setMaintenanceChartData] = useState([]);

  // Fetch report data on component mount
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        dashboardSummary,
        fuelEfficiency,
        fleetUtilization,
        vehicleRoi,
        operationalCost,
        maintenanceLogs
      ] = await Promise.all([
        getDashboardSummary(),
        getFuelEfficiency(),
        getFleetUtilization(),
        getVehicleROI(),
        getOperationalCost(),
        getMaintenanceLogs()
      ]);

      setDashboardData(dashboardSummary);
      setFuelEfficiencyData(fuelEfficiency);
      setFleetUtilizationData(fleetUtilization);
      setVehicleRoiData(vehicleRoi);
      setOperationalCostData(operationalCost);

      // Process raw maintenance logs into totals grouped by vehicle_id
      const maintByVehicle = {};
      maintenanceLogs.forEach((log) => {
        if (log.vehicle_id && log.maintenance_cost) {
          const cost = parseFloat(log.maintenance_cost);
          maintByVehicle[log.vehicle_id] = (maintByVehicle[log.vehicle_id] || 0) + cost;
        }
      });

      const maintChart = Object.entries(maintByVehicle).map(([vId, cost]) => ({
        vehicle_id: vId,
        total_cost: cost
      }));
      maintChart.sort((a, b) => b.total_cost - a.total_cost);
      setMaintenanceChartData(maintChart);

    } catch (err) {
      console.error('Failed to load reports data:', err);
      setError('Failed to load reports and analytics. Please verify that the backend services are active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Memoized calculations to separate rendering logic from data transformation
  const transformedCosts = useMemo(() => {
    if (!operationalCostData) return null;

    const fuel = operationalCostData.fuel_cost || 0;
    const maintenance = operationalCostData.maintenance_cost || 0;
    const other = operationalCostData.other_expenses || 0;
    const grandTotal = operationalCostData.grand_total || 0;

    const fuelPct = grandTotal > 0 ? (fuel / grandTotal) * 100 : 0;
    const maintPct = grandTotal > 0 ? (maintenance / grandTotal) * 100 : 0;
    const otherPct = grandTotal > 0 ? (other / grandTotal) * 100 : 0;

    const maxFuelEfficiency = fuelEfficiencyData.length > 0 
      ? Math.max(...fuelEfficiencyData.map((d) => d.fuel_efficiency)) 
      : 1;

    const maxMaintenanceCost = maintenanceChartData.length > 0
      ? Math.max(...maintenanceChartData.map((d) => d.total_cost))
      : 1;

    // Custom donut pie-chart segment mapping
    const pieChartStyle = {
      background: `conic-gradient(#3B82F6 0% ${fuelPct}%, #FF5B04 ${fuelPct}% ${fuelPct + maintPct}%, #64748B ${fuelPct + maintPct}% 100%)`,
      width: '160px',
      height: '160px',
      borderRadius: '50%',
      boxShadow: 'inset 0 0 0 24px white'
    };

    return {
      fuel,
      maintenance,
      other,
      grandTotal,
      fuelPct,
      maintPct,
      otherPct,
      maxFuelEfficiency,
      maxMaintenanceCost,
      pieChartStyle,
      hasPieData: grandTotal > 0
    };
  }, [operationalCostData, fuelEfficiencyData, maintenanceChartData]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="page-header">
          <h1 className="page-title">Reports & Analytics</h1>
        </div>
        <div className="loading-container">
          <div className="loading-spinner">Generating reports and processing SQL aggregates...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="page-header">
          <h1 className="page-title">Reports & Analytics</h1>
        </div>
        <div className="error-alert">{error}</div>
      </div>
    );
  }

  const {
    fuel,
    maintenance,
    other,
    grandTotal,
    fuelPct,
    maintPct,
    otherPct,
    maxFuelEfficiency,
    maxMaintenanceCost,
    pieChartStyle,
    hasPieData
  } = transformedCosts;

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <h1 className="page-title">Reports & Analytics</h1>
        <div style={{ position: 'relative' }}>
          <button className="btn-primary" onClick={() => setDropdownOpen(!dropdownOpen)}>
            Export CSV ▼
          </button>
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '42px',
              backgroundColor: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              zIndex: 100,
              minWidth: '220px',
              display: 'flex',
              flexDirection: 'column',
              padding: '6px 0'
            }}>
              <a 
                href="http://localhost:5000/reports/export/maintenance" 
                target="_blank" 
                rel="noreferrer"
                style={{
                  padding: '10px 16px',
                  textDecoration: 'none',
                  color: 'var(--text-dark)',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  display: 'block'
                }}
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >
                Export Maintenance CSV
              </a>
              <a 
                href="http://localhost:5000/reports/export/fuel" 
                target="_blank" 
                rel="noreferrer"
                style={{
                  padding: '10px 16px',
                  textDecoration: 'none',
                  color: 'var(--text-dark)',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  borderTop: '1px solid var(--card-border)',
                  display: 'block'
                }}
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >
                Export Fuel Logs CSV
              </a>
              <a 
                href="http://localhost:5000/reports/export/expenses" 
                target="_blank" 
                rel="noreferrer"
                style={{
                  padding: '10px 16px',
                  textDecoration: 'none',
                  color: 'var(--text-dark)',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  borderTop: '1px solid var(--card-border)',
                  display: 'block'
                }}
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >
                Export Expense CSV
              </a>
              <a 
                href="http://localhost:5000/reports/export/operational-cost" 
                target="_blank" 
                rel="noreferrer"
                style={{
                  padding: '10px 16px',
                  textDecoration: 'none',
                  color: 'var(--text-dark)',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  borderTop: '1px solid var(--card-border)',
                  display: 'block'
                }}
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >
                Export Operational Cost CSV
              </a>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Panel */}
      <div className="kpi-grid">
        <KpiCard title="Operational Cost" value={formatCurrency(grandTotal)} color="orange" />
        <KpiCard title="Fuel Cost" value={formatCurrency(fuel)} color="blue" />
        <KpiCard title="Maintenance Cost" value={formatCurrency(maintenance)} color="blue" />
        <KpiCard title="Other Expenses" value={formatCurrency(other)} color="blue" />
        <KpiCard title="Vehicles In Shop" value={dashboardData?.vehicles_in_shop || 0} color="orange" />
        <KpiCard title="Active Trips" value={dashboardData?.active_trips || 0} color="blue" />
      </div>

      {/* Reports Analysis Details Grid */}
      <div className="reports-grid">
        
        {/* Section 1: Operational Cost Table & Pie Chart */}
        <div className="report-section-card">
          <h2>Operational Cost breakdown</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'center' }}>
            <table className="trips-table">
              <tbody>
                <tr>
                  <td style={{ fontWeight: '500' }}>Fuel cost</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(fuel)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '500' }}>Maintenance cost</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(maintenance)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '500' }}>Other expenses</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(other)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: '600' }}>
                  <td>Grand Total</td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-color)' }}>{formatCurrency(grandTotal)}</td>
                </tr>
              </tbody>
            </table>

            <div className="chart-wrapper">
              {hasPieData ? (
                <>
                  <div style={pieChartStyle}></div>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: '#3B82F6' }}></span>
                      <span>Fuel ({fuelPct.toFixed(0)}%)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: '#FF5B04' }}></span>
                      <span>Maint ({maintPct.toFixed(0)}%)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: '#64748B' }}></span>
                      <span>Other ({otherPct.toFixed(0)}%)</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Insufficient cost data to render chart</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Fuel Efficiency Table & Horizontal Bar Chart */}
        <div className="report-section-card">
          <h2>Fuel Efficiency by Vehicle</h2>
          {fuelEfficiencyData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <table className="trips-table">
                <thead>
                  <tr>
                    <th>Vehicle ID</th>
                    <th>Registration</th>
                    <th>Distance (km)</th>
                    <th>Fuel (L)</th>
                    <th style={{ textAlign: 'right' }}>Efficiency (km/L)</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelEfficiencyData.map((d) => (
                    <tr key={d.vehicle_id}>
                      <td>#{d.vehicle_id}</td>
                      <td>{d.registration_number || <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                      <td>{d.total_distance.toLocaleString()}</td>
                      <td>{d.total_fuel.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>{d.fuel_efficiency.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bar-chart-container">
                <span className="filter-label" style={{ marginBottom: '8px' }}>Visual Efficiency Comparison</span>
                {fuelEfficiencyData.map((d) => {
                  const pct = maxFuelEfficiency > 0 ? (d.fuel_efficiency / maxFuelEfficiency) * 100 : 0;
                  return (
                    <BarRow 
                      key={d.vehicle_id}
                      label={`Vehicle #${d.vehicle_id}`} 
                      percentage={pct} 
                      valueText={`${d.fuel_efficiency.toFixed(1)} km/L`}
                      color="#3B82F6"
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No Efficiency Data</h3>
              <p>Trip distances and fuel consumption logs are required to compute efficiency metrics.</p>
            </div>
          )}
        </div>

        {/* Section 3: Maintenance Cost by Vehicle horizontal bar chart */}
        <div className="report-section-card">
          <h2>Maintenance Cost by Vehicle</h2>
          {maintenanceChartData.length > 0 ? (
            <div className="bar-chart-container" style={{ marginTop: '0' }}>
              {maintenanceChartData.map((d) => {
                const pct = maxMaintenanceCost > 0 ? (d.total_cost / maxMaintenanceCost) * 100 : 0;
                return (
                  <BarRow 
                    key={d.vehicle_id}
                    label={`Vehicle #${d.vehicle_id}`}
                    percentage={pct}
                    valueText={formatCurrency(d.total_cost)}
                    color="#FF5B04"
                  />
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No Maintenance Costs</h3>
              <p>Logged maintenance logs containing costs will display here grouped by vehicle.</p>
            </div>
          )}
        </div>

        {/* Section 4: Fleet Utilization Card (waiting for Vehicle ORM) */}
        <div className="report-section-card">
          <h2>Fleet Utilization</h2>
          {fleetUtilizationData?.status === 'pending_integration' ? (
            <PendingBanner 
              title="Integration Pending" 
              message={fleetUtilizationData.message} 
              formula={fleetUtilizationData._todo}
            />
          ) : (
            <div className="empty-state">
              <h3>No Utilization Data</h3>
              <p>Fleet utilization metrics are currently not available.</p>
            </div>
          )}
        </div>

        {/* Section 5: Vehicle ROI Card (waiting for Vehicle/Trip ORM) */}
        <div className="report-section-card" style={{ gridColumn: 'span 2' }}>
          <h2>Vehicle ROI Analysis</h2>
          {vehicleRoiData?.status === 'pending_integration' ? (
            <PendingBanner 
              title="Integration Pending" 
              message={vehicleRoiData.message} 
              formula={vehicleRoiData._todo}
            />
          ) : (
            <div className="empty-state">
              <h3>No ROI Analysis</h3>
              <p>ROI analysis metrics are currently not available.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Reports;

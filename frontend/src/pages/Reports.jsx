import { useState, useEffect, useMemo, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getDashboardSummary,
  getFuelEfficiency,
  getFleetUtilization,
  getVehicleROI,
  getOperationalCost,
  exportReportFile
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

const formatCurrencyCompact = (val) => val !== null && val !== undefined
  ? `₹${val.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })}`
  : '₹0';

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

  const { user } = useContext(AuthContext);
  const role = user?.role || '';
  const canViewFinancials = role === 'Fleet Manager' || role === 'Financial Analyst';

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
      const regByVehicle = {};
      maintenanceLogs.forEach((log) => {
        if (log.vehicle_id && log.maintenance_cost) {
          const cost = parseFloat(log.maintenance_cost);
          maintByVehicle[log.vehicle_id] = (maintByVehicle[log.vehicle_id] || 0) + cost;
          regByVehicle[log.vehicle_id] = log.vehicle_registration || `Vehicle #${log.vehicle_id}`;
        }
      });

      const maintChart = Object.entries(maintByVehicle).map(([vId, cost]) => ({
        vehicle_id: vId,
        registration_number: regByVehicle[vId],
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
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      boxShadow: 'inset 0 0 0 16px white'
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
        {canViewFinancials && (
          <div style={{ position: 'relative' }}>
            <button className="btn-secondary" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <span className="icon"></span> Export Reports ▼
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
                <div style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-light)' }}>Maintenance Report</div>
                <div style={{ display: 'flex' }}>
                  <button
                    style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)' }}
                    className="dropdown-item"
                    onClick={() => { setDropdownOpen(false); exportReportFile('maintenance', 'maintenance_report.csv', 'csv'); }}
                  >CSV</button>
                  <button
                    style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)' }}
                    className="dropdown-item"
                    onClick={() => { setDropdownOpen(false); exportReportFile('maintenance', 'maintenance_report.pdf', 'pdf'); }}
                  >PDF</button>
                </div>

                <div style={{ borderTop: '1px solid var(--card-border)', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-light)' }}>Fuel Logs Report</div>
                <div style={{ display: 'flex' }}>
                  <button
                    style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)' }}
                    className="dropdown-item"
                    onClick={() => { setDropdownOpen(false); exportReportFile('fuel', 'fuel_logs_report.csv', 'csv'); }}
                  >CSV</button>
                  <button
                    style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)' }}
                    className="dropdown-item"
                    onClick={() => { setDropdownOpen(false); exportReportFile('fuel', 'fuel_logs_report.pdf', 'pdf'); }}
                  >PDF</button>
                </div>

                <div style={{ borderTop: '1px solid var(--card-border)', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-light)' }}>Expense Report</div>
                <div style={{ display: 'flex' }}>
                  <button
                    style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)' }}
                    className="dropdown-item"
                    onClick={() => { setDropdownOpen(false); exportReportFile('expenses', 'expense_report.csv', 'csv'); }}
                  >CSV</button>
                  <button
                    style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)' }}
                    className="dropdown-item"
                    onClick={() => { setDropdownOpen(false); exportReportFile('expenses', 'expense_report.pdf', 'pdf'); }}
                  >PDF</button>
                </div>

                <div style={{ borderTop: '1px solid var(--card-border)', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-light)' }}>Operational Cost</div>
                <div style={{ display: 'flex' }}>
                  <button
                    style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)' }}
                    className="dropdown-item"
                    onClick={() => { setDropdownOpen(false); exportReportFile('operational-cost', 'operational_cost_report.csv', 'csv'); }}
                  >CSV</button>
                  <button
                    style={{ flex: 1, padding: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)' }}
                    className="dropdown-item"
                    onClick={() => { setDropdownOpen(false); exportReportFile('operational-cost', 'operational_cost_report.pdf', 'pdf'); }}
                  >PDF</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards Panel */}
      <div className="kpi-grid">
        {canViewFinancials && <KpiCard title="Operational Cost" value={formatCurrencyCompact(grandTotal)} color="orange" />}
        {canViewFinancials && <KpiCard title="Fuel Cost" value={formatCurrencyCompact(fuel)} color="blue" />}
        {canViewFinancials && <KpiCard title="Maintenance Cost" value={formatCurrencyCompact(maintenance)} color="blue" />}
        {canViewFinancials && <KpiCard title="Other Expenses" value={formatCurrencyCompact(other)} color="blue" />}
        <KpiCard title="Vehicles In Shop" value={dashboardData?.vehicles_in_shop || 0} color="orange" />
        <KpiCard title="Active Trips" value={dashboardData?.active_trips || 0} color="blue" />
      </div>

      {/* Reports Analysis Details Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        <div className="reports-grid" style={{ marginTop: 0, alignItems: 'start' }}>

          {canViewFinancials ? (
            <>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Section 1: Operational Cost Table & Pie Chart */}
                <div className="report-section-card" style={{ width: 'fit-content' }}>
                  <h2>Operational Cost breakdown</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '40px', alignItems: 'center' }}>
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

                {/* Section 3: Maintenance Cost by Vehicle */}
                <div className="report-section-card">
                  <h2>Maintenance Cost by Vehicle</h2>
                  {maintenanceChartData.length > 0 ? (
                    <div className="bar-chart-container" style={{ marginTop: '0' }}>
                      {maintenanceChartData.map((d) => {
                        const pct = maxMaintenanceCost > 0 ? (d.total_cost / maxMaintenanceCost) * 100 : 0;
                        return (
                          <BarRow
                            key={d.vehicle_id}
                            label={d.registration_number}
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

                {/* Section 2b: Visual Efficiency Comparison */}
                <div className="report-section-card">
                  <h2>Visual Efficiency Comparison</h2>
                  {fuelEfficiencyData.length > 0 ? (
                    <div className="bar-chart-container" style={{ marginTop: '0' }}>
                      {fuelEfficiencyData.map((d) => {
                        const pct = maxFuelEfficiency > 0 ? (d.fuel_efficiency / maxFuelEfficiency) * 100 : 0;
                        return (
                          <BarRow
                            key={d.vehicle_id}
                            label={d.registration_number || `Vehicle #${d.vehicle_id}`}
                            percentage={pct}
                            valueText={`${d.fuel_efficiency.toFixed(1)} km/L`}
                            color="#3B82F6"
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h3>No Efficiency Data</h3>
                      <p>Trip distances and fuel consumption logs are required to compute efficiency metrics.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Section 2a: Fuel Efficiency Table */}
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
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h3>No Efficiency Data</h3>
                      <p>Trip distances and fuel consumption logs are required to compute efficiency metrics.</p>
                    </div>
                  )}
                </div>

                {/* Section 4: Fleet Utilization Card */}
                <div className="report-section-card">
                  <h2>Fleet Utilization</h2>
                  {fleetUtilizationData?.status === 'success' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="kpi-card blue" style={{ marginTop: '8px' }}>
                        <span className="kpi-label">Current Fleet Utilization</span>
                        <span className="kpi-value">{fleetUtilizationData.fleet_utilization}%</span>
                      </div>
                      <div className="info-banner" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                          <strong>{fleetUtilizationData.vehicles_on_trip}</strong> out of <strong>{fleetUtilizationData.total_vehicles}</strong> available vehicles are currently on active trips.
                        </p>
                      </div>
                    </div>
                  ) : fleetUtilizationData?.status === 'pending_integration' ? (
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

              </div>
            </>
          ) : (
            <div className="report-section-card">
              <h2>Fleet Utilization</h2>
              {fleetUtilizationData?.status === 'success' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="kpi-card blue" style={{ marginTop: '8px' }}>
                    <span className="kpi-label">Current Fleet Utilization</span>
                    <span className="kpi-value">{fleetUtilizationData.fleet_utilization}%</span>
                  </div>
                  <div className="info-banner" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>{fleetUtilizationData.vehicles_on_trip}</strong> out of <strong>{fleetUtilizationData.total_vehicles}</strong> available vehicles are currently on active trips.
                    </p>
                  </div>
                </div>
              ) : fleetUtilizationData?.status === 'pending_integration' ? (
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
          )}

        </div>

        {/* Section 5: Vehicle ROI Card (Full width at bottom) */}
        {canViewFinancials && (
          <div className="report-section-card">
            <h2>Vehicle ROI Analysis</h2>
            {vehicleRoiData?.status === 'success' && vehicleRoiData.roi_records.length > 0 ? (
              <table className="trips-table">
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Maintenance</th>
                    <th style={{ textAlign: 'right' }}>Fuel Cost</th>
                    <th style={{ textAlign: 'right' }}>Acq. Cost</th>
                    <th style={{ textAlign: 'right' }}>ROI %</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleRoiData.roi_records.map((roi) => (
                    <tr key={roi.vehicle_id}>
                      <td style={{ fontWeight: '500' }}>{roi.registration_number}</td>
                      <td style={{ textAlign: 'right', color: '#10B981' }}>{formatCurrency(roi.total_revenue)}</td>
                      <td style={{ textAlign: 'right', color: '#EF4444' }}>{formatCurrency(roi.total_maintenance)}</td>
                      <td style={{ textAlign: 'right', color: '#F59E0B' }}>{formatCurrency(roi.total_fuel)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(roi.acquisition_cost)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: roi.roi_percentage >= 0 ? '#10B981' : '#EF4444' }}>
                        {roi.roi_percentage > 0 ? '+' : ''}{roi.roi_percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : vehicleRoiData?.status === 'pending_integration' ? (
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
        )}
      </div>
    </div>
  );
};

export default Reports;

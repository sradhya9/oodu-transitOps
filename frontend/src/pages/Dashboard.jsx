import { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/dashboard.css';

const Dashboard = () => {
  const [health, setHealth] = useState({
    status: 'LOADING',
    database: 'LOADING'
  });
  
  const [stats, setStats] = useState({
    activeVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    fleetUtilization: 0
  });

  const [recentTrips, setRecentTrips] = useState([]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get('/health');
        setHealth({
          status: response.data.status,
          database: response.data.database
        });
      } catch (error) {
        if (error.response) {
          setHealth({
            status: error.response.data.status || 'FAILED',
            database: error.response.data.database || 'Disconnected'
          });
        } else {
          setHealth({
            status: 'FAILED',
            database: 'Disconnected'
          });
        }
      }
    };
    checkHealth();
    
    const fetchDashboardData = async () => {
      try {
        const statsResponse = await api.get('/dashboard/stats');
        setStats(statsResponse.data);
        
        const tripsResponse = await api.get('/dashboard/recent-trips');
        setRecentTrips(tripsResponse.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1 className="page-title">1. Dashboard</h1>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <span className="filter-label">Filters</span>
          <select className="filter-select">
            <option>Vehicle Type: All</option>
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">&nbsp;</span>
          <select className="filter-select">
            <option>Status: All</option>
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">&nbsp;</span>
          <select className="filter-select">
            <option>Region: All</option>
          </select>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card blue">
          <span className="kpi-label">Active Vehicles</span>
          <span className="kpi-value">{stats.activeVehicles}</span>
        </div>
        <div className="kpi-card green">
          <span className="kpi-label">Available Vehicles</span>
          <span className="kpi-value">{stats.availableVehicles}</span>
        </div>
        <div className="kpi-card orange">
          <span className="kpi-label">Vehicles In Maintenance</span>
          <span className="kpi-value">{stats.maintenanceVehicles}</span>
        </div>
        <div className="kpi-card blue">
          <span className="kpi-label">Active Trips</span>
          <span className="kpi-value">{stats.activeTrips}</span>
        </div>
        <div className="kpi-card blue">
          <span className="kpi-label">Pending Trips</span>
          <span className="kpi-value">{stats.pendingTrips}</span>
        </div>
        <div className="kpi-card blue">
          <span className="kpi-label">Drivers On Duty</span>
          <span className="kpi-value">{stats.driversOnDuty}</span>
        </div>
        <div className="kpi-card green">
          <span className="kpi-label">Fleet Utilization</span>
          <span className="kpi-value">{stats.fleetUtilization}%</span>
        </div>
      </div>

      <div className="dashboard-content-grid">
        <div className="recent-trips-section">
          <h2 className="section-title">Recent Trips</h2>
          <table className="trips-table">
            <thead>
              <tr>
                <th>Trip</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Status</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {recentTrips.length > 0 ? recentTrips.map((trip, idx) => (
                <tr key={idx}>
                  <td>{trip.id}</td>
                  <td>{trip.vehicle}</td>
                  <td>{trip.driver}</td>
                  <td><span className={`status-badge ${trip.statusClass}`}>{trip.status}</span></td>
                  <td>{trip.eta}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)'}}>No recent trips found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="vehicle-status-section">
          <h2 className="section-title">Vehicle Status</h2>
          <div className="status-list">
            <div className="status-item">
              <span className="status-item-label">Available</span>
              <div className="status-bar-bg"><div className="status-bar-fill green"></div></div>
            </div>
            <div className="status-item">
              <span className="status-item-label">On Trip</span>
              <div className="status-bar-bg"><div className="status-bar-fill blue"></div></div>
            </div>
            <div className="status-item">
              <span className="status-item-label">In Shop</span>
              <div className="status-bar-bg"><div className="status-bar-fill orange"></div></div>
            </div>
            <div className="status-item">
              <span className="status-item-label">Retired</span>
              <div className="status-bar-bg"><div className="status-bar-fill red"></div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="health-status-box">
        <h3>System Status (API)</h3>
        <p>
          Backend: 
          <span style={{ 
            color: health.status === 'OK' ? '#10B981' : (health.status === 'LOADING' ? '#9CA3AF' : '#EF4444'),
            fontWeight: '600',
            marginLeft: '10px'
          }}>
            {health.status}
          </span>
        </p>
        <p>
          Database: 
          <span style={{ 
            color: health.database === 'Connected' ? '#10B981' : (health.database === 'LOADING' ? '#9CA3AF' : '#EF4444'),
            fontWeight: '600',
            marginLeft: '10px'
          }}>
            {health.database}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import api from '../services/api';

const Dashboard = () => {
  const [health, setHealth] = useState({
    status: 'LOADING',
    database: 'LOADING'
  });

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
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>System Status</h3>
        <p>
          Backend: 
          <span style={{ 
            color: health.status === 'OK' ? 'green' : (health.status === 'LOADING' ? 'gray' : 'red'),
            fontWeight: 'bold',
            marginLeft: '10px'
          }}>
            {health.status}
          </span>
        </p>
        <p>
          Database: 
          <span style={{ 
            color: health.database === 'Connected' ? 'green' : (health.database === 'LOADING' ? 'gray' : 'red'),
            fontWeight: 'bold',
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

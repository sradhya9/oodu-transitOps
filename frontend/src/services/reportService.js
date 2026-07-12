import api from './api';

export const getDashboardSummary = async () => {
  try {
    const response = await api.get('/reports/dashboard');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFuelEfficiency = async () => {
  try {
    const response = await api.get('/reports/fuel-efficiency');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFleetUtilization = async () => {
  try {
    const response = await api.get('/reports/fleet-utilization');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getVehicleROI = async () => {
  try {
    const response = await api.get('/reports/vehicle-roi');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getOperationalCost = async () => {
  try {
    const response = await api.get('/reports/operational-cost');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const exportReportCSV = async (endpoint, filename) => {
  try {
    const response = await api.get(`/reports/export/${endpoint}`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (error) {
    console.error(`Failed to export ${filename}:`, error);
    throw error;
  }
};

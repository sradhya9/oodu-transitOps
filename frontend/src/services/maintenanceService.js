import api from './api';

export const getMaintenanceLogs = async () => {
  try {
    const response = await api.get('/maintenance');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getMaintenanceById = async (id) => {
  try {
    const response = await api.get(`/maintenance/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createMaintenance = async (data) => {
  try {
    const response = await api.post('/maintenance', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateMaintenance = async (id, data) => {
  try {
    const response = await api.put(`/maintenance/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteMaintenance = async (id) => {
  try {
    const response = await api.delete(`/maintenance/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

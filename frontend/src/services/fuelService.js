import api from './api';

export const getFuelLogs = async () => {
  try {
    const response = await api.get('/fuel-logs');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFuelLogById = async (id) => {
  try {
    const response = await api.get(`/fuel-logs/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createFuelLog = async (data) => {
  try {
    const response = await api.post('/fuel-logs', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateFuelLog = async (id, data) => {
  try {
    const response = await api.put(`/fuel-logs/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteFuelLog = async (id) => {
  try {
    const response = await api.delete(`/fuel-logs/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

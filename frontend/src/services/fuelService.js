import api from './api';

export const getFuelLogs = async () => {
  try {
    const response = await api.get('/fuel');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFuelLogById = async (id) => {
  try {
    const response = await api.get(`/fuel/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createFuelLog = async (data) => {
  try {
    const response = await api.post('/fuel', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateFuelLog = async (id, data) => {
  try {
    const response = await api.put(`/fuel/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteFuelLog = async (id) => {
  try {
    const response = await api.delete(`/fuel/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

import api from './api';

export const getDrivers = async (params) => {
  const response = await api.get('/api/drivers', { params });
  return response.data;
};

export const getAvailableDrivers = async () => {
  const response = await api.get('/api/drivers/available');
  return response.data;
};

export const getDriverById = async (id) => {
  const response = await api.get(`/api/drivers/${id}`);
  return response.data;
};

export const createDriver = async (data) => {
  const response = await api.post('/api/drivers', data);
  return response.data;
};

export const updateDriver = async (id, data) => {
  const response = await api.put(`/api/drivers/${id}`, data);
  return response.data;
};

export const deleteDriver = async (id) => {
  const response = await api.delete(`/api/drivers/${id}`);
  return response.data;
};

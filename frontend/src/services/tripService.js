import api from './api';

export const getTrips = async (params) => {
  const response = await api.get('/api/trips', { params });
  return response.data;
};

export const getTripById = async (id) => {
  const response = await api.get(`/api/trips/${id}`);
  return response.data;
};

export const createTrip = async (data) => {
  const response = await api.post('/api/trips', data);
  return response.data;
};

export const dispatchTrip = async (id) => {
  const response = await api.put(`/api/trips/${id}/dispatch`);
  return response.data;
};

export const completeTrip = async (id, data) => {
  const response = await api.put(`/api/trips/${id}/complete`, data);
  return response.data;
};

export const cancelTrip = async (id) => {
  const response = await api.put(`/api/trips/${id}/cancel`);
  return response.data;
};

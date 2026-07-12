import api from './api';

export const vehicleService = {
  getVehicles: async (params) => {
    const response = await api.get('/api/vehicles', { params });
    return response.data;
  },

  getAvailableVehicles: async () => {
    const response = await api.get('/api/vehicles/available');
    return response.data;
  },

  getVehicleById: async (id) => {
    const response = await api.get(`/api/vehicles/${id}`);
    return response.data;
  },

  createVehicle: async (vehicleData) => {
    const response = await api.post('/api/vehicles', vehicleData);
    return response.data;
  },

  updateVehicle: async (id, vehicleData) => {
    const response = await api.put(`/api/vehicles/${id}`, vehicleData);
    return response.data;
  },

  deleteVehicle: async (id) => {
    const response = await api.delete(`/api/vehicles/${id}`);
    return response.data;
  },
};

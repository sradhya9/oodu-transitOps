import api from './api';

export const getSystemSettings = async () => {
  const response = await api.get('/api/settings');
  return response.data.data;
};

export const updateSystemSettings = async (settings) => {
  const response = await api.put('/api/settings', settings);
  return response.data;
};

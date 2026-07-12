import api from './api';

export const getExpenses = async () => {
  try {
    const response = await api.get('/expenses');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getExpenseById = async (id) => {
  try {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createExpense = async (data) => {
  try {
    const response = await api.post('/expenses', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateExpense = async (id, data) => {
  try {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteExpense = async (id) => {
  try {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

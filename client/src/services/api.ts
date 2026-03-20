import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://server-production-ebd2b.up.railway.app';

// Create axios instance with default config
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const authData = localStorage.getItem('auth-storage');

  if (authData) {
    try {
      const { state } = JSON.parse(authData);
      const token = state?.token;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error parsing auth token:', error);
    }
  }

  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

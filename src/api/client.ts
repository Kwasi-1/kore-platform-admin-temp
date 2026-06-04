import axios from 'axios';
import { usePlatformAuthStore } from '../store/platformAuthStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach platform token
apiClient.interceptors.request.use(
  (config) => {
    const { token } = usePlatformAuthStore.getState();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to catch 401s
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const { logout } = usePlatformAuthStore.getState();
      logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;

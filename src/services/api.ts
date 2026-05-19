import axios from 'axios';
import * as secureStorage from './secureStorage';
import { API_BASE_URL } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 40000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await secureStorage.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, try to refresh then retry once.
// Never attempt refresh for auth endpoints — login/register/refresh failures
// must propagate directly to the caller, not silently loop.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const refreshToken = await secureStorage.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('no refresh token stored');
        // Use a short timeout so a sleeping server doesn't hang the refresh attempt
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { timeout: 10000 }
        );
        await secureStorage.setItemAsync('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        await secureStorage.deleteItemAsync('accessToken');
        await secureStorage.deleteItemAsync('refreshToken');
      }
    }

    return Promise.reject(error);
  }
);

export default api;

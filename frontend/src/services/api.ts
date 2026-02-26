import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: inject token ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('silvia_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle token refresh ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem('silvia_refresh');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefresh } = res.data.data;
        localStorage.setItem('silvia_token', accessToken);
        localStorage.setItem('silvia_refresh', newRefresh);

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('silvia_token');
        localStorage.removeItem('silvia_refresh');
        localStorage.removeItem('silvia_user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

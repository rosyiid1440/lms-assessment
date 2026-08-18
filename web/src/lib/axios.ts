import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Public (no-login) routes must never be redirected to /login.
    const isPublic = window.location.pathname.startsWith('/live/');
    if (error.response?.status === 401 && !isPublic && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

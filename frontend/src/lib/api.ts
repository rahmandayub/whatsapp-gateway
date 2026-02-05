
import axios from 'axios';
import { getSession } from 'next-auth/react';

// Client-side API instance
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  // We need to retrieve the session to get the API key
  // This is for client-side calls.
  // For server-side calls, we should use a different approach or pass headers manually.
  // Note: getSession() works on client side.
  const session = await getSession() as { apiKey?: string } | null;
  if (session?.apiKey) {
    config.headers['x-api-key'] = session.apiKey;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Handle unauthorized (maybe redirect to login or show toast)
      // Since middleware protects routes, this might happen if key is revoked
      // window.location.href = '/login'; // Force logout
    }
    return Promise.reject(error);
  }
);

export default api;

// src/utils/api.js — Axios instance pointed at the backend
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // Groq calls can be slow; 30s is reasonable
});

// Intercept responses to normalise error messages
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ?? err.message ?? 'An unknown error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App.jsx';
import './index.css';

// Every API call carries the login token; an expired/invalid token sends the user back to login
axios.interceptors.request.use((config) => {
  try {
    const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { /* ignore */ }
  return config;
});
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCall = String(err.config?.url || '').includes('/api/auth/');
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

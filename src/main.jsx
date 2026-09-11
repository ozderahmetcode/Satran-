import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// Canlı ortamda (Firebase Hosting) Render.com backend adresini dinamik yönlendirme
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
if (API_BASE_URL) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && (input.startsWith('/api') || input.startsWith('/uploads'))) {
      input = `${API_BASE_URL}${input}`;
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

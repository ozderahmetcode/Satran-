import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Canlı ortamda (Firebase Hosting) Render.com backend adresini dinamik yönlendirme
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// ================= CSRF TOKEN & MERKEZİ FETCH GÜVENLİK YÖNETİMİ =================
let cachedCsrfToken = null;
let isFetchingCsrfToken = null;

/**
 * Sunucudan geçerli bir CSRF token alır veya önbelleğe alır
 */
async function getCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (isFetchingCsrfToken) return isFetchingCsrfToken;

  isFetchingCsrfToken = (async () => {
    try {
      const url = `${API_BASE_URL}/api/csrf-token`;
      const res = await originalFetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.csrfToken) {
          cachedCsrfToken = data.csrfToken;
          return cachedCsrfToken;
        }
      }
    } catch (e) {
      console.warn('[CSRF Uyarısı] Token alınamadı:', e);
    } finally {
      isFetchingCsrfToken = null;
    }
    return null;
  })();

  return isFetchingCsrfToken;
}

// Orijinal fetch referansı
const originalFetch = window.fetch;

// Küresel Fetch Sarmalayıcı: Otomatik Base URL, Credentials ve CSRF Başlığı Enjeksiyonu
window.fetch = async function (input, init = {}) {
  let url = input;
  if (typeof input === 'string') {
    if (API_BASE_URL && (input.startsWith('/api') || input.startsWith('/uploads'))) {
      url = `${API_BASE_URL}${input}`;
    }
  }

  // Tüm API isteklerinde kimlik ve çerezleri zorunlu olarak dahil et
  const options = { ...init };
  options.credentials = 'include';

  const method = (options.method || 'GET').toUpperCase();
  const isMutatingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  if (isMutatingMethod) {
    const token = await getCsrfToken();
    if (token) {
      if (options.headers instanceof Headers) {
        options.headers.set('X-CSRF-Token', token);
      } else if (options.headers && typeof options.headers === 'object') {
        options.headers = {
          ...options.headers,
          'X-CSRF-Token': token
        };
      } else {
        options.headers = {
          'X-CSRF-Token': token
        };
      }
    }
  }

  const response = await originalFetch(url, options);

  // Eğer CSRF hatası alındıysa tokeni sıfırla ve isteği 1 kez otomatik tekrar dene
  if (response.status === 403 && isMutatingMethod) {
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      if (body.code && body.code.startsWith('CSRF_')) {
        console.warn('[CSRF Yenileme] Belirteç geçersiz veya eksik, yeniden alınıyor...');
        cachedCsrfToken = null;
        const freshToken = await getCsrfToken();
        if (freshToken) {
          if (options.headers instanceof Headers) {
            options.headers.set('X-CSRF-Token', freshToken);
          } else {
            options.headers = {
              ...options.headers,
              'X-CSRF-Token': freshToken
            };
          }
          return originalFetch(url, options);
        }
      }
    } catch (err) {
      // JSON parse hatası durumunda orijinal yanıtı dön
    }
  }

  return response;
};

// Uygulama başlarken CSRF tokenini ve Render.com arka plan uyanıklığını hazırla
getCsrfToken().catch(() => {});
originalFetch(`${API_BASE_URL || ''}/api/health`, { method: 'GET' }).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Capture early beforeinstallprompt event before React component mounts
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  window.dispatchEvent(new Event('pwa-installable'));
});

// Ensure any stale service worker is removed in development so it never intercepts HMR or dev requests
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !import.meta.env.PROD) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


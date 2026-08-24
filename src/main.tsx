// Prevent third-party scripts or polyfills from throwing when setting window.fetch
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    let _fetch = typeof originalFetch === 'function' ? originalFetch.bind(window) : originalFetch;

    const fetchDescriptor = {
      get() {
        return _fetch;
      },
      set(val: any) {
        _fetch = val;
      },
      configurable: true,
      enumerable: true
    };

    // First, define on Window.prototype if available (where native fetch getter lives)
    const proto = Object.getPrototypeOf(window) || (window as any).Window?.prototype;
    if (proto) {
      try {
        Object.defineProperty(proto, 'fetch', fetchDescriptor);
      } catch {
        // ignore
      }
    }

    // Also define directly on window instance
    try {
      Object.defineProperty(window, 'fetch', fetchDescriptor);
    } catch {
      // ignore
    }

    // Suppress benign fetch property assignment errors if thrown by external scripts
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('fetch') && event.message.includes('getter')) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  } catch (e) {
    // ignore if environment prevents property modification
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle custom Google OAuth redirect callback in the popup window
if (window.location.hash) {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = params.get('access_token');
  if (accessToken && window.opener) {
    window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', accessToken }, window.location.origin);
    // Render a simple notification while closing
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.innerHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 40px; color: #1e293b; background: #f8fafc; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; margin: 0; box-sizing: border-box;">
          <h3 style="margin-top: 0; font-size: 18px; font-weight: 700;">Authentication Successful!</h3>
          <p style="font-size: 14px; color: #64748b; margin-top: 8px;">You can close this window now.</p>
        </div>
      `;
    }
    // Attempt to close the popup
    try {
      window.close();
    } catch (e) { /* ignore */ }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


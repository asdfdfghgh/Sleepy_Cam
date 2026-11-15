import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Ensure window.fetch is writable and handle any setter collisions gracefully
try {
  let activeFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      get() {
        return activeFetch;
      },
      set(fn) {
        activeFetch = fn;
      },
      configurable: true,
      enumerable: true
    });
  } catch {
    // ignore read-only fetch hosts
  }
} catch {
  // ignore
}

window.addEventListener('error', (event) => {
  if (event?.message?.includes('fetch') && event?.message?.includes('getter')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

// Register PWA Service Worker for offline shell + bundled MediaPipe assets
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('SleepyCam AI is cached for offline use.');
  }
});

createRoot(document.getElementById('root')!).render(<App />);

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure window.fetch is writable and handle any setter collisions gracefully
try {
  let activeFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      get() { return activeFetch; },
      set(fn) { activeFetch = fn; },
      configurable: true,
      enumerable: true
    });
  } catch (_) {}
} catch (_) {}

window.addEventListener('error', (event) => {
  if (event?.message?.includes('fetch') && event?.message?.includes('getter')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

createRoot(document.getElementById('root')!).render(<App />);

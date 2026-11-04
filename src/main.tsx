import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
  if (desc && desc.configurable && !desc.writable && !desc.set) {
    let currentFetch = window.fetch.bind(window);
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get: () => currentFetch,
      set: (v) => {
        currentFetch = v;
      },
    });
  }
} catch {
  // Ignore if descriptor cannot be modified
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

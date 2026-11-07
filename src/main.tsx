import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorScreen from './components/ErrorScreen';
import './i18n';
import './index.css';

// Tidy the address after a self-repair reload (?_r=…)
try {
  const u = new URL(window.location.href);
  if (u.searchParams.has('_r')) {
    u.searchParams.delete('_r');
    window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorScreen>
      <App />
    </ErrorScreen>
  </StrictMode>
);

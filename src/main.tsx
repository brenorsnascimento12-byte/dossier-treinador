import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

// O y-webrtc (via simple-peer) espera algumas globais de Node.
// Estas duas linhas são o suficiente para funcionar no browser.
const g = globalThis as unknown as Record<string, unknown>;
g.global ??= globalThis;
g.process ??= { env: {}, nextTick: (f: () => void) => queueMicrotask(f) };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);

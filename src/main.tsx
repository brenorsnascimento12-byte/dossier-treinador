/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

// O y-webrtc (via simple-peer) espera algumas globais de Node.
// Estas duas linhas são o suficiente para funcionar no browser.
const g = globalThis as unknown as Record<string, unknown>;
g.global ??= globalThis;
g.process ??= { env: {}, nextTick: (f: () => void) => queueMicrotask(f) };

/**
 * Recarrega uma única vez.
 *
 * Depois de uma atualização, uma página que ficou aberta continua a pedir
 * pedaços de código da versão antiga, que já não existem no servidor. Recarregar
 * resolve — mas se a versão nova também falhasse entrávamos num ciclo, por isso
 * só tentamos uma vez por sessão.
 */
function recarregarUmaVez(motivo: string) {
  if (sessionStorage.getItem('dt.recarregado')) return false;
  sessionStorage.setItem('dt.recarregado', motivo);
  location.reload();
  return true;
}

// O Vite avisa quando não consegue ir buscar um pedaço de código carregado a
// pedido (é o caso do leitor de PDFs, que só é descarregado ao importar).
window.addEventListener('vite:preloadError', (evento) => {
  evento.preventDefault();
  if (!recarregarUmaVez('preload')) {
    alert(
      'Não foi possível carregar esta parte da aplicação.\n\n' +
        'Fecha e volta a abrir a app. Se continuar, limpa a cache do browser.',
    );
  }
});

// Assim que houver versão nova, entra em vigor sem o utilizador ter de fazer nada.
registerSW({
  immediate: true,
  onNeedRefresh() {
    recarregarUmaVez('sw');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);

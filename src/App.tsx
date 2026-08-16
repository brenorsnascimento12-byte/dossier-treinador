import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { aplicarConvite, estadoSync, subscreverSync, type EstadoSync } from './lib/doc';
import { useDefinicoes, usePronto } from './lib/store';

import Inicio from './paginas/Inicio';
import Plantel from './paginas/Plantel';
import Exercicios from './paginas/Exercicios';
import Treinos from './paginas/Treinos';
import Periodizacao from './paginas/Periodizacao';
import Jogos from './paginas/Jogos';
import Observacoes from './paginas/Observacoes';
import Definicoes from './paginas/Definicoes';
import Importar from './paginas/Importar';

const MENU = [
  { grupo: 'Equipa' },
  { p: '/', ic: '🏠', t: 'Início', exato: true },
  { p: '/plantel', ic: '👥', t: 'Plantel' },
  { grupo: 'Treino' },
  { p: '/exercicios', ic: '⚽', t: 'Exercícios' },
  { p: '/treinos', ic: '📋', t: 'Sessões de treino' },
  { p: '/periodizacao', ic: '📆', t: 'Periodização' },
  { grupo: 'Competição' },
  { p: '/jogos', ic: '🏆', t: 'Jogos' },
  { p: '/observacoes', ic: '🔍', t: 'Observações' },
  { grupo: 'Sistema' },
  { p: '/importar', ic: '📥', t: 'Importar' },
  { p: '/definicoes', ic: '⚙️', t: 'Definições' },
] as const;

const MENU_MOVEL = [
  { p: '/', ic: '🏠', t: 'Início', exato: true },
  { p: '/plantel', ic: '👥', t: 'Plantel' },
  { p: '/exercicios', ic: '⚽', t: 'Exercícios' },
  { p: '/treinos', ic: '📋', t: 'Treinos' },
  { p: '/jogos', ic: '🏆', t: 'Jogos' },
] as const;

function PontoSync() {
  const [e, setE] = useState<EstadoSync>(estadoSync());
  useEffect(() => subscreverSync(setE), []);
  const cls = e.erro ? 'erro' : e.ligado && e.pares > 0 ? 'on' : 'off';
  const titulo = e.erro
    ? `Erro de sincronização: ${e.erro}`
    : !e.ligado
      ? 'Sincronização desligada — dados só neste dispositivo'
      : e.pares > 0
        ? `Ligado a ${e.pares} dispositivo(s)`
        : 'À espera do outro dispositivo';
  return (
    <NavLink to="/definicoes" className="linha sem-imprimir" title={titulo} style={{ gap: 6 }}>
      <span className={`ponto ${cls}`} />
      <span className="mini" style={{ display: 'none' }}>
        {e.pares}
      </span>
    </NavLink>
  );
}

function tituloDaRota(p: string) {
  if (p === '/') return 'Início';
  const item = MENU.find((m) => 'p' in m && m.p !== '/' && p.startsWith(m.p));
  return item && 't' in item ? item.t : 'Dossier';
}

export default function App() {
  const defs = useDefinicoes();
  const pronto = usePronto();
  const loc = useLocation();

  // Convite de emparelhamento vindo do QR code: #par=SALA.CHAVE
  useEffect(() => {
    const h = window.location.hash;
    const m = h.match(/[#&]par=([A-Z0-9]+\.[A-Z0-9]+)/i);
    if (m && aplicarConvite(m[1])) {
      history.replaceState(null, '', window.location.pathname);
      alert('Dispositivo emparelhado. A sincronizar…');
    }
  }, []);

  useEffect(() => {
    if (defs.corPrimaria)
      document.documentElement.style.setProperty('--acento', defs.corPrimaria);
  }, [defs.corPrimaria]);

  const iniciais =
    (defs.clube || 'Dossier')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || 'DT';

  if (!pronto) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <p className="mudo">A carregar o dossier…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="lateral sem-imprimir">
        <div className="marca">
          {defs.emblema ? (
            <img className="marca-emblema" src={defs.emblema} alt="" />
          ) : (
            <div className="marca-emblema">{iniciais}</div>
          )}
          <div className="marca-txt">
            <b>{defs.clube || 'Dossier do Treinador'}</b>
            <span>
              {[defs.escalao, defs.epoca].filter(Boolean).join(' · ') || 'Configura a equipa'}
            </span>
          </div>
        </div>

        {MENU.map((m, i) =>
          'grupo' in m ? (
            <div key={i} className="nav-grupo">
              {m.grupo}
            </div>
          ) : (
            <NavLink
              key={m.p}
              to={m.p}
              end={'exato' in m && m.exato}
              className={({ isActive }) => 'nav-item' + (isActive ? ' ativo' : '')}
            >
              <span className="ic">{m.ic}</span>
              {m.t}
            </NavLink>
          ),
        )}
      </aside>

      <div className="principal">
        <header className="barra sem-imprimir">
          <h1>{tituloDaRota(loc.pathname)}</h1>
          <PontoSync />
        </header>

        <main className="conteudo">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/plantel/*" element={<Plantel />} />
            <Route path="/exercicios/*" element={<Exercicios />} />
            <Route path="/treinos/*" element={<Treinos />} />
            <Route path="/periodizacao" element={<Periodizacao />} />
            <Route path="/jogos/*" element={<Jogos />} />
            <Route path="/observacoes" element={<Observacoes />} />
            <Route path="/importar" element={<Importar />} />
            <Route path="/definicoes" element={<Definicoes />} />
          </Routes>
        </main>
      </div>

      <nav className="nav-fundo">
        {MENU_MOVEL.map((m) => (
          <NavLink
            key={m.p}
            to={m.p}
            end={'exato' in m && m.exato}
            className={({ isActive }) => (isActive ? 'ativo' : '')}
          >
            <span className="ic">{m.ic}</span>
            {m.t}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Marcacoes, NOME_CAMPO, VISTA } from './campo';
import type { BoardItem, Desenho, TipoCampo } from '../lib/types';

export const DESENHO_VAZIO: Desenho = { campo: 'completo', itens: [] };

/**
 * Ordem de desenho: zonas ao fundo, depois setas, e por cima os elementos
 * concretos — assim os números dos jogadores nunca ficam tapados por uma seta.
 */
const CAMADA: Record<BoardItem['tipo'], number> = {
  zona: 0,
  seta: 1,
  baliza: 2,
  minibaliza: 2,
  escada: 2,
  cone: 3,
  poste: 3,
  bola: 4,
  jogador: 5,
  texto: 6,
};

function porCamada(itens: BoardItem[]): BoardItem[] {
  return itens
    .map((it, i) => ({ it, i }))
    .sort((a, b) => CAMADA[a.it.tipo] - CAMADA[b.it.tipo] || a.i - b.i)
    .map(({ it }) => it);
}

const COR_A = '#1d4ed8';
const COR_B = '#dc2626';
const COR_N = '#f59e0b';

function corEquipa(e: 'a' | 'b' | 'neutro') {
  return e === 'a' ? COR_A : e === 'b' ? COR_B : COR_N;
}

/** Caminho ondulado ao longo de uma polilinha (condução de bola). */
function ondulado(pts: { x: number; y: number }[], amp: number) {
  if (pts.length < 2) return '';
  const passo = amp * 1.6;
  let d = '';
  let acumulado = 0;
  let ini = pts[0];
  d = `M ${ini.x} ${ini.y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const comp = Math.hypot(dx, dy);
    if (comp < 0.001) continue;
    const ux = dx / comp;
    const uy = dy / comp;
    const nx = -uy;
    const ny = ux;
    let t = 0;
    while (t < comp) {
      const t2 = Math.min(t + passo, comp);
      const meio = (t + t2) / 2;
      const lado = Math.floor(acumulado / passo) % 2 === 0 ? 1 : -1;
      d += ` Q ${a.x + ux * meio + nx * amp * lado} ${a.y + uy * meio + ny * amp * lado} ${
        a.x + ux * t2
      } ${a.y + uy * t2}`;
      acumulado += t2 - t;
      t = t2;
    }
  }
  return d;
}

function polilinha(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
}

// ---------------------------------------------------------------------------
// Render de um item
// ---------------------------------------------------------------------------

function Item({
  item,
  w,
  h,
  u,
  selecionado,
  onPointerDown,
}: {
  item: BoardItem;
  w: number;
  h: number;
  u: number;
  selecionado?: boolean;
  onPointerDown?: (e: RPointerEvent<SVGGElement>) => void;
}) {
  const px = (v: number) => (v / 100) * w;
  const py = (v: number) => (v / 100) * h;
  const traco = selecionado
    ? { stroke: '#0ea5e9', strokeWidth: u * 0.16, strokeDasharray: `${u * 0.2} ${u * 0.15}` }
    : {};

  const comum = {
    onPointerDown,
    style: { cursor: onPointerDown ? 'move' : 'default' } as const,
  };

  switch (item.tipo) {
    case 'jogador': {
      const c = corEquipa(item.equipa);
      return (
        <g {...comum}>
          <circle
            cx={px(item.x)}
            cy={py(item.y)}
            r={u}
            fill={c}
            stroke="#fff"
            strokeWidth={u * 0.14}
          />
          <text
            x={px(item.x)}
            y={py(item.y)}
            fill="#fff"
            fontSize={u * 1.15}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
            pointerEvents="none"
          >
            {item.rotulo}
          </text>
          {selecionado && (
            <circle cx={px(item.x)} cy={py(item.y)} r={u * 1.5} fill="none" {...traco} />
          )}
        </g>
      );
    }
    case 'bola':
      return (
        <g {...comum}>
          <circle
            cx={px(item.x)}
            cy={py(item.y)}
            r={u * 0.52}
            fill="#fff"
            stroke="#111"
            strokeWidth={u * 0.11}
          />
          <circle cx={px(item.x)} cy={py(item.y)} r={u * 0.19} fill="#111" />
          {selecionado && (
            <circle cx={px(item.x)} cy={py(item.y)} r={u * 1.1} fill="none" {...traco} />
          )}
        </g>
      );
    case 'cone':
      return (
        <g {...comum}>
          <polygon
            points={`${px(item.x)},${py(item.y) - u * 0.75} ${px(item.x) - u * 0.6},${
              py(item.y) + u * 0.55
            } ${px(item.x) + u * 0.6},${py(item.y) + u * 0.55}`}
            fill={item.cor}
            stroke="#00000055"
            strokeWidth={u * 0.07}
          />
          {selecionado && (
            <circle cx={px(item.x)} cy={py(item.y)} r={u * 1.2} fill="none" {...traco} />
          )}
        </g>
      );
    case 'poste':
      return (
        <g {...comum}>
          <line
            x1={px(item.x)}
            y1={py(item.y) - u}
            x2={px(item.x)}
            y2={py(item.y) + u * 0.6}
            stroke="#f59e0b"
            strokeWidth={u * 0.28}
            strokeLinecap="round"
          />
          <ellipse
            cx={px(item.x)}
            cy={py(item.y) + u * 0.6}
            rx={u * 0.45}
            ry={u * 0.18}
            fill="#b45309"
          />
          {selecionado && (
            <circle cx={px(item.x)} cy={py(item.y)} r={u * 1.3} fill="none" {...traco} />
          )}
        </g>
      );
    case 'escada':
      return (
        <g {...comum}>
          <rect
            x={px(item.x) - u * 0.7}
            y={py(item.y) - u * 1.8}
            width={u * 1.4}
            height={u * 3.6}
            fill="none"
            stroke="#eab308"
            strokeWidth={u * 0.14}
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1={px(item.x) - u * 0.7}
              y1={py(item.y) - u * 1.8 + (i + 1) * u * 0.6}
              x2={px(item.x) + u * 0.7}
              y2={py(item.y) - u * 1.8 + (i + 1) * u * 0.6}
              stroke="#eab308"
              strokeWidth={u * 0.12}
            />
          ))}
          {selecionado && (
            <circle cx={px(item.x)} cy={py(item.y)} r={u * 2.1} fill="none" {...traco} />
          )}
        </g>
      );
    case 'minibaliza':
      return (
        <g {...comum}>
          <rect
            x={px(item.x) - u * 1.5}
            y={py(item.y) - u * 0.45}
            width={u * 3}
            height={u * 0.9}
            fill="#ffffff33"
            stroke="#fff"
            strokeWidth={u * 0.18}
          />
          {selecionado && (
            <circle cx={px(item.x)} cy={py(item.y)} r={u * 2} fill="none" {...traco} />
          )}
        </g>
      );
    case 'baliza':
      return (
        <g {...comum}>
          <rect
            x={px(item.x) - px(item.w) / 2}
            y={py(item.y) - py(item.h) / 2}
            width={px(item.w)}
            height={py(item.h)}
            fill="#ffffff2b"
            stroke="#fff"
            strokeWidth={u * 0.2}
          />
          {selecionado && (
            <rect
              x={px(item.x) - px(item.w) / 2}
              y={py(item.y) - py(item.h) / 2}
              width={px(item.w)}
              height={py(item.h)}
              fill="none"
              {...traco}
            />
          )}
        </g>
      );
    case 'zona':
      return (
        <g {...comum}>
          <rect
            x={px(item.x)}
            y={py(item.y)}
            width={px(item.w)}
            height={py(item.h)}
            fill={item.cor + '3a'}
            stroke={item.cor}
            strokeWidth={u * 0.13}
            strokeDasharray={`${u * 0.45} ${u * 0.3}`}
          />
          {selecionado && (
            <rect
              x={px(item.x)}
              y={py(item.y)}
              width={px(item.w)}
              height={py(item.h)}
              fill="none"
              {...traco}
            />
          )}
        </g>
      );
    case 'texto':
      return (
        <g {...comum}>
          <text
            x={px(item.x)}
            y={py(item.y)}
            fill={item.cor}
            fontSize={u * 1.2}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
            stroke="#00000055"
            strokeWidth={u * 0.06}
            paintOrder="stroke"
          >
            {item.texto}
          </text>
          {selecionado && (
            <circle cx={px(item.x)} cy={py(item.y)} r={u * 1.6} fill="none" {...traco} />
          )}
        </g>
      );
    case 'seta': {
      const pts = item.pontos.map((p) => ({ x: px(p.x), y: py(p.y) }));
      if (pts.length < 2) return null;
      const largura =
        item.estilo === 'remate' ? u * 0.32 : item.estilo === 'passe' ? u * 0.2 : u * 0.22;
      const d =
        item.estilo === 'conducao' ? ondulado(pts, u * 0.34) : polilinha(pts);
      const seta = `seta-${item.estilo}-${item.cor.replace('#', '')}`;
      return (
        <g {...comum}>
          <defs>
            <marker
              id={seta}
              markerWidth={4}
              markerHeight={4}
              refX={3.2}
              refY={2}
              orient="auto"
            >
              <path d="M0,0 L4,2 L0,4 z" fill={item.cor} />
            </marker>
          </defs>
          {/* Zona de toque invisível, mais larga que a linha */}
          <path
            d={polilinha(pts)}
            fill="none"
            stroke="transparent"
            strokeWidth={u * 1.4}
          />
          <path
            d={d}
            fill="none"
            stroke={item.cor}
            strokeWidth={largura}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={
              item.estilo === 'passe' ? `${u * 0.6} ${u * 0.42}` : undefined
            }
            markerEnd={`url(#${seta})`}
          />
          {selecionado && (
            <path
              d={polilinha(pts)}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth={u * 0.55}
              strokeOpacity={0.35}
              strokeLinecap="round"
            />
          )}
        </g>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Visualização (só leitura) — usada em miniaturas, sessões e impressão
// ---------------------------------------------------------------------------

export function VerDesenho({
  desenho,
  className,
}: {
  desenho?: Desenho;
  className?: string;
}) {
  const d = desenho ?? DESENHO_VAZIO;
  const { w, h } = VISTA[d.campo] ?? VISTA.completo;
  const u = Math.min(w, h) * 0.045;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} style={{ display: 'block' }}>
      <Marcacoes tipo={d.campo} />
      {porCamada(d.itens).map((it) => (
        <Item key={it.id} item={it} w={w} h={h} u={u} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

type Ferramenta =
  | 'mover'
  | 'jogador-a'
  | 'jogador-b'
  | 'jogador-n'
  | 'bola'
  | 'cone'
  | 'poste'
  | 'escada'
  | 'minibaliza'
  | 'baliza'
  | 'zona'
  | 'texto'
  | 'movimento'
  | 'passe'
  | 'conducao'
  | 'remate';

const FERRAMENTAS: { f: Ferramenta; ic: string; t: string }[] = [
  { f: 'mover', ic: '✋', t: 'Mover' },
  { f: 'jogador-a', ic: '🔵', t: 'Equipa A' },
  { f: 'jogador-b', ic: '🔴', t: 'Equipa B' },
  { f: 'jogador-n', ic: '🟡', t: 'Neutro' },
  { f: 'bola', ic: '⚽', t: 'Bola' },
  { f: 'cone', ic: '🔺', t: 'Cone' },
  { f: 'poste', ic: '🎽', t: 'Poste' },
  { f: 'escada', ic: '🪜', t: 'Escada' },
  { f: 'minibaliza', ic: '🥅', t: 'Mini-baliza' },
  { f: 'zona', ic: '⬜', t: 'Zona' },
  { f: 'texto', ic: '🅣', t: 'Texto' },
  { f: 'movimento', ic: '→', t: 'Movimento' },
  { f: 'passe', ic: '⇢', t: 'Passe' },
  { f: 'conducao', ic: '∿', t: 'Condução' },
  { f: 'remate', ic: '⇉', t: 'Remate' },
];

const ESTILO_SETA: Partial<Record<Ferramenta, 'movimento' | 'passe' | 'conducao' | 'remate'>> =
  {
    movimento: 'movimento',
    passe: 'passe',
    conducao: 'conducao',
    remate: 'remate',
  };

const CORES = ['#ffffff', '#facc15', '#f97316', '#ef4444', '#22d3ee', '#111827'];

function id() {
  return crypto.randomUUID();
}

export function EditorQuadro({
  desenho,
  aoMudar,
}: {
  desenho: Desenho;
  aoMudar: (d: Desenho) => void;
}) {
  const [ferramenta, setFerramenta] = useState<Ferramenta>('mover');
  const [cor, setCor] = useState('#ffffff');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<BoardItem | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const arrasto = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const inicio = useRef<{ x: number; y: number } | null>(null);

  const { w, h } = VISTA[desenho.campo] ?? VISTA.completo;
  const u = Math.min(w, h) * 0.045;

  /** Converte um evento de ponteiro em coordenadas 0-100 do desenho. */
  function pos(e: { clientX: number; clientY: number }) {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  }

  /** Alguns browsers recusam a captura do ponteiro; nunca deve travar a ação. */
  function capturar(pointerId: number) {
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      /* sem captura: o arrasto continua a funcionar dentro do SVG */
    }
  }

  function setItens(itens: BoardItem[]) {
    aoMudar({ ...desenho, itens });
  }

  function adicionar(it: BoardItem) {
    setItens([...desenho.itens, it]);
    setSelecionado(it.id);
  }

  function proximoNumero(equipa: 'a' | 'b' | 'neutro') {
    const n = desenho.itens.filter(
      (i) => i.tipo === 'jogador' && i.equipa === equipa,
    ).length;
    return String(n + 1);
  }

  function aoPremerFundo(e: RPointerEvent<SVGSVGElement>) {
    if (ferramenta === 'mover') {
      setSelecionado(null);
      return;
    }
    const p = pos(e);
    capturar(e.pointerId);

    const estilo = ESTILO_SETA[ferramenta];
    if (estilo) {
      inicio.current = p;
      setRascunho({ id: id(), tipo: 'seta', pontos: [p, p], estilo, cor });
      return;
    }

    switch (ferramenta) {
      case 'jogador-a':
      case 'jogador-b':
      case 'jogador-n': {
        const equipa =
          ferramenta === 'jogador-a' ? 'a' : ferramenta === 'jogador-b' ? 'b' : 'neutro';
        adicionar({
          id: id(),
          tipo: 'jogador',
          x: p.x,
          y: p.y,
          equipa,
          rotulo: proximoNumero(equipa),
        });
        break;
      }
      case 'bola':
        adicionar({ id: id(), tipo: 'bola', x: p.x, y: p.y });
        break;
      case 'cone':
        adicionar({ id: id(), tipo: 'cone', x: p.x, y: p.y, cor: '#f97316' });
        break;
      case 'poste':
        adicionar({ id: id(), tipo: 'poste', x: p.x, y: p.y });
        break;
      case 'escada':
        adicionar({ id: id(), tipo: 'escada', x: p.x, y: p.y });
        break;
      case 'minibaliza':
        adicionar({ id: id(), tipo: 'minibaliza', x: p.x, y: p.y });
        break;
      case 'texto': {
        const t = prompt('Texto a colocar no campo:');
        if (t) adicionar({ id: id(), tipo: 'texto', x: p.x, y: p.y, texto: t, cor });
        break;
      }
      case 'zona':
        inicio.current = p;
        setRascunho({
          id: id(),
          tipo: 'zona',
          x: p.x,
          y: p.y,
          w: 0,
          h: 0,
          cor: cor === '#ffffff' ? '#facc15' : cor,
        });
        break;
    }
  }

  function aoMover(e: RPointerEvent<SVGSVGElement>) {
    const p = pos(e);

    if (arrasto.current) {
      const { id: aid, dx, dy } = arrasto.current;
      setItens(
        desenho.itens.map((it) => {
          if (it.id !== aid) return it;
          if (it.tipo === 'seta') {
            const base = it.pontos[0];
            return {
              ...it,
              pontos: it.pontos.map((pt) => ({
                x: pt.x + (p.x - dx - base.x),
                y: pt.y + (p.y - dy - base.y),
              })),
            };
          }
          return { ...it, x: p.x - dx, y: p.y - dy };
        }),
      );
      return;
    }

    if (!rascunho || !inicio.current) return;

    if (rascunho.tipo === 'seta') {
      const pts = rascunho.pontos;
      const ultimo = pts[pts.length - 1];
      // Regista pontos intermédios só quando o traço se afasta o suficiente,
      // para a seta ficar suave sem guardar centenas de pontos.
      const anterior = pts[pts.length - 2] ?? pts[0];
      if (Math.hypot(p.x - anterior.x, p.y - anterior.y) > 4) {
        setRascunho({ ...rascunho, pontos: [...pts, p] });
      } else {
        setRascunho({
          ...rascunho,
          pontos: [...pts.slice(0, -1), p],
        });
      }
      void ultimo;
    } else if (rascunho.tipo === 'zona') {
      const i = inicio.current;
      setRascunho({
        ...rascunho,
        x: Math.min(i.x, p.x),
        y: Math.min(i.y, p.y),
        w: Math.abs(p.x - i.x),
        h: Math.abs(p.y - i.y),
      });
    }
  }

  function aoLargar() {
    arrasto.current = null;
    if (rascunho) {
      const valido =
        rascunho.tipo === 'seta'
          ? Math.hypot(
              rascunho.pontos[rascunho.pontos.length - 1].x - rascunho.pontos[0].x,
              rascunho.pontos[rascunho.pontos.length - 1].y - rascunho.pontos[0].y,
            ) > 2
          : rascunho.tipo === 'zona'
            ? rascunho.w > 2 && rascunho.h > 2
            : true;
      if (valido) adicionar(rascunho);
      setRascunho(null);
      inicio.current = null;
    }
  }

  function pegar(it: BoardItem) {
    return (e: RPointerEvent<SVGGElement>) => {
      if (ferramenta !== 'mover') return;
      e.stopPropagation();
      setSelecionado(it.id);
      const p = pos(e);
      const base = it.tipo === 'seta' ? it.pontos[0] : { x: it.x, y: it.y };
      arrasto.current = { id: it.id, dx: p.x - base.x, dy: p.y - base.y };
      capturar(e.pointerId);
    };
  }

  const sel = desenho.itens.find((i) => i.id === selecionado);

  function atualizarSel(patch: Record<string, unknown>) {
    if (!sel) return;
    setItens(
      desenho.itens.map((i) => (i.id === sel.id ? ({ ...i, ...patch } as BoardItem) : i)),
    );
  }

  return (
    <div className="coluna">
      <div className="paleta">
        {FERRAMENTAS.map((f) => (
          <button
            key={f.f}
            className={'fer' + (ferramenta === f.f ? ' ativo' : '')}
            onClick={() => setFerramenta(f.f)}
            title={f.t}
          >
            <span className="ic">{f.ic}</span>
            {f.t}
          </button>
        ))}
      </div>

      <div className="linha envolve" style={{ gap: 10 }}>
        <div className="linha" style={{ gap: 4 }}>
          <span className="mini">Cor:</span>
          {CORES.map((c) => (
            <button
              key={c}
              onClick={() => setCor(c)}
              aria-label={`Cor ${c}`}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: c,
                border:
                  cor === c ? '2px solid var(--acento)' : '1px solid var(--borda-forte)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <select
          value={desenho.campo}
          onChange={(e) => aoMudar({ ...desenho, campo: e.target.value as TipoCampo })}
          style={{ width: 'auto' }}
        >
          {(Object.keys(VISTA) as TipoCampo[]).map((t) => (
            <option key={t} value={t}>
              {NOME_CAMPO[t]}
            </option>
          ))}
        </select>
        <div className="espaco" />
        <button
          className="btn pq"
          disabled={!desenho.itens.length}
          onClick={() => setItens(desenho.itens.slice(0, -1))}
        >
          ↶ Anular
        </button>
        <button
          className="btn pq perigo"
          disabled={!desenho.itens.length}
          onClick={() => {
            if (confirm('Limpar todo o desenho?')) setItens([]);
          }}
        >
          Limpar
        </button>
      </div>

      <div className="quadro-envolvente">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          style={{ display: 'block', width: '100%', touchAction: 'none' }}
          onPointerDown={aoPremerFundo}
          onPointerMove={aoMover}
          onPointerUp={aoLargar}
          onPointerCancel={aoLargar}
        >
          <Marcacoes tipo={desenho.campo} />
          {porCamada(desenho.itens).map((it) => (
            <Item
              key={it.id}
              item={it}
              w={w}
              h={h}
              u={u}
              selecionado={it.id === selecionado}
              onPointerDown={pegar(it)}
            />
          ))}
          {rascunho && <Item item={rascunho} w={w} h={h} u={u} />}
        </svg>
      </div>

      {sel ? (
        <div className="cartao cartao-p linha envolve" style={{ gap: 8 }}>
          <span className="eti azul">Selecionado</span>
          {sel.tipo === 'jogador' && (
            <input
              value={sel.rotulo}
              onChange={(e) => atualizarSel({ rotulo: e.target.value.slice(0, 3) })}
              style={{ width: 70 }}
              aria-label="Rótulo"
            />
          )}
          {sel.tipo === 'texto' && (
            <input
              value={sel.texto}
              onChange={(e) => atualizarSel({ texto: e.target.value })}
              style={{ flex: 1, minWidth: 120 }}
              aria-label="Texto"
            />
          )}
          {(sel.tipo === 'cone' || sel.tipo === 'zona' || sel.tipo === 'seta') && (
            <input
              type="color"
              value={sel.cor}
              onChange={(e) => atualizarSel({ cor: e.target.value })}
              style={{ width: 44 }}
              aria-label="Cor"
            />
          )}
          <div className="espaco" />
          <button
            className="btn pq"
            onClick={() => {
              const copia = { ...sel, id: id() } as BoardItem;
              if (copia.tipo === 'seta')
                copia.pontos = copia.pontos.map((p) => ({ x: p.x + 4, y: p.y + 4 }));
              else {
                copia.x += 4;
                copia.y += 4;
              }
              adicionar(copia);
            }}
          >
            Duplicar
          </button>
          <button
            className="btn pq perigo"
            onClick={() => {
              setItens(desenho.itens.filter((i) => i.id !== sel.id));
              setSelecionado(null);
            }}
          >
            Apagar
          </button>
        </div>
      ) : (
        <p className="mini">
          Escolhe uma ferramenta e toca no campo para colocar. Com <b>Mover</b>, arrasta os
          elementos. As setas desenham-se arrastando.
        </p>
      )}
    </div>
  );
}

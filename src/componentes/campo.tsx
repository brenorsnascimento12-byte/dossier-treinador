import type { TipoCampo } from '../lib/types';

/** Dimensões do sistema de coordenadas de cada tipo de campo. */
export const VISTA: Record<TipoCampo, { w: number; h: number }> = {
  completo: { w: 105, h: 68 },
  'meio-campo': { w: 68, h: 55 },
  quarto: { w: 68, h: 34 },
  retangulo: { w: 100, h: 62 },
  vazio: { w: 100, h: 62 },
};

export const NOME_CAMPO: Record<TipoCampo, string> = {
  completo: 'Campo inteiro',
  'meio-campo': 'Meio-campo',
  quarto: 'Último terço',
  retangulo: 'Retângulo',
  vazio: 'Sem marcações',
};

const RELVA = '#3f9c53';
const RELVA_2 = '#39914b';
const LINHA = 'rgba(255,255,255,0.92)';

function Baliza({
  cx,
  y,
  largura,
  para,
}: {
  cx: number;
  y: number;
  largura: number;
  para: 'cima' | 'baixo' | 'esq' | 'dir';
}) {
  const p = 1.6;
  if (para === 'cima' || para === 'baixo') {
    const dy = para === 'cima' ? -p : p;
    return (
      <rect
        x={cx - largura / 2}
        y={Math.min(y, y + dy)}
        width={largura}
        height={p}
        fill="none"
        stroke={LINHA}
        strokeWidth={0.45}
      />
    );
  }
  const dx = para === 'esq' ? -p : p;
  return (
    <rect
      x={Math.min(cx, cx + dx)}
      y={y - largura / 2}
      width={p}
      height={largura}
      fill="none"
      stroke={LINHA}
      strokeWidth={0.45}
    />
  );
}

/** Marcações do campo, desenhadas no sistema de coordenadas de VISTA[tipo]. */
export function Marcacoes({ tipo }: { tipo: TipoCampo }) {
  const { w, h } = VISTA[tipo];
  const l = { fill: 'none', stroke: LINHA, strokeWidth: 0.35 } as const;

  const fundo = (
    <>
      <rect x={0} y={0} width={w} height={h} fill={RELVA} />
      {/* Faixas de corte de relva */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={(i * w) / 8}
          y={0}
          width={w / 8}
          height={h}
          fill={i % 2 ? RELVA_2 : 'transparent'}
        />
      ))}
    </>
  );

  if (tipo === 'vazio') {
    return <rect x={0} y={0} width={w} height={h} fill="transparent" />;
  }

  if (tipo === 'retangulo') {
    return (
      <>
        {fundo}
        <rect x={1.5} y={1.5} width={w - 3} height={h - 3} {...l} />
      </>
    );
  }

  if (tipo === 'completo') {
    const m = 2;
    const cw = w - m * 2;
    const ch = h - m * 2;
    const gaW = (5.5 / 105) * cw; // profundidade da pequena área
    const gaH = (18.32 / 68) * ch;
    const paW = (16.5 / 105) * cw;
    const paH = (40.32 / 68) * ch;
    const balizaH = (7.32 / 68) * ch;
    const pen = (11 / 105) * cw;
    const raio = (9.15 / 68) * ch;
    return (
      <>
        {fundo}
        <rect x={m} y={m} width={cw} height={ch} {...l} />
        <line x1={w / 2} y1={m} x2={w / 2} y2={h - m} {...l} />
        <circle cx={w / 2} cy={h / 2} r={raio} {...l} />
        <circle cx={w / 2} cy={h / 2} r={0.5} fill={LINHA} />
        {/* Áreas esquerda */}
        <rect x={m} y={(h - paH) / 2} width={paW} height={paH} {...l} />
        <rect x={m} y={(h - gaH) / 2} width={gaW} height={gaH} {...l} />
        <circle cx={m + pen} cy={h / 2} r={0.5} fill={LINHA} />
        <path
          d={`M ${m + paW} ${h / 2 - raio * 0.78} A ${raio} ${raio} 0 0 1 ${m + paW} ${h / 2 + raio * 0.78}`}
          {...l}
        />
        {/* Áreas direita */}
        <rect x={w - m - paW} y={(h - paH) / 2} width={paW} height={paH} {...l} />
        <rect x={w - m - gaW} y={(h - gaH) / 2} width={gaW} height={gaH} {...l} />
        <circle cx={w - m - pen} cy={h / 2} r={0.5} fill={LINHA} />
        <path
          d={`M ${w - m - paW} ${h / 2 - raio * 0.78} A ${raio} ${raio} 0 0 0 ${w - m - paW} ${h / 2 + raio * 0.78}`}
          {...l}
        />
        <Baliza cx={m} y={h / 2} largura={balizaH} para="esq" />
        <Baliza cx={w - m} y={h / 2} largura={balizaH} para="dir" />
      </>
    );
  }

  // meio-campo e quarto: baliza em cima
  const m = 2;
  const cw = w - m * 2;
  const ch = h - m * 2;
  const gaW = (18.32 / 68) * cw;
  const gaH = (5.5 / 68) * cw;
  const paW = (40.32 / 68) * cw;
  const paH = (16.5 / 68) * cw;
  const balizaW = (7.32 / 68) * cw;
  const pen = (11 / 68) * cw;
  const raio = (9.15 / 68) * cw;

  return (
    <>
      {fundo}
      <rect x={m} y={m} width={cw} height={ch} {...l} />
      <rect x={(w - paW) / 2} y={m} width={paW} height={paH} {...l} />
      <rect x={(w - gaW) / 2} y={m} width={gaW} height={gaH} {...l} />
      <circle cx={w / 2} cy={m + pen} r={0.5} fill={LINHA} />
      <path
        d={`M ${w / 2 - raio * 0.78} ${m + paH} A ${raio} ${raio} 0 0 0 ${w / 2 + raio * 0.78} ${m + paH}`}
        {...l}
      />
      <Baliza cx={w / 2} y={m} largura={balizaW} para="cima" />
      {tipo === 'meio-campo' && (
        <>
          <line x1={m} y1={h - m} x2={w - m} y2={h - m} {...l} strokeWidth={0.5} />
          <path
            d={`M ${w / 2 - raio} ${h - m} A ${raio} ${raio} 0 0 0 ${w / 2 + raio} ${h - m}`}
            {...l}
          />
        </>
      )}
    </>
  );
}

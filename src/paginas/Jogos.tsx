import { useMemo, useRef, useState } from 'react';
import {
  Abas,
  Area,
  Avatar,
  BotaoApagar,
  Escolha,
  Modal,
  Segmentado,
  Texto,
  Vazio,
} from '../componentes/ui';
import { Marcacoes, VISTA } from '../componentes/campo';
import { jogos, novoId, useColecao } from '../lib/store';
import { formatar, hoje } from '../lib/datas';
import { POSICAO_XY, type EventoJogo, type Jogador, type Jogo } from '../lib/types';

const SISTEMAS = [
  '1-4-3-3',
  '1-4-4-2',
  '1-4-2-3-1',
  '1-4-3-1-2',
  '1-3-5-2',
  '1-3-4-3',
  '1-5-3-2',
  '1-4-1-4-1',
];

const TIPOS_EVENTO: { v: EventoJogo['tipo']; t: string }[] = [
  { v: 'golo', t: '⚽ Golo' },
  { v: 'assistencia', t: '🅰️ Assistência' },
  { v: 'golo-sofrido', t: '🥅 Golo sofrido' },
  { v: 'amarelo', t: '🟨 Amarelo' },
  { v: 'vermelho', t: '🟥 Vermelho' },
  { v: 'substituicao', t: '🔄 Substituição' },
  { v: 'nota', t: '📝 Nota' },
];

function jogoNovo(): Jogo {
  return {
    id: novoId(),
    data: hoje(),
    hora: '10:00',
    adversario: '',
    casa: true,
    competicao: 'Campeonato',
    sistema: '1-4-3-3',
    convocados: [],
    onze: [],
    suplentes: [],
    posicoesOnze: {},
    eventos: [],
    avaliacoes: {},
    minutos: {},
    estado: 'agendado',
    criadoEm: Date.now(),
  };
}

function resultado(g: Jogo) {
  if (g.estado !== 'realizado' || g.golosPro == null || g.golosContra == null) return null;
  return g.golosPro > g.golosContra ? 'V' : g.golosPro === g.golosContra ? 'E' : 'D';
}

export default function Jogos() {
  const lista = useColecao<Jogo>('jogos');
  const plantel = useColecao<Jogador>('jogadores');
  const [aberto, setAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'Próximos' | 'Realizados' | 'Todos'>('Todos');

  const ordenados = useMemo(
    () => [...lista].sort((a, b) => b.data.localeCompare(a.data)),
    [lista],
  );
  const visiveis = ordenados.filter((g) =>
    filtro === 'Todos'
      ? true
      : filtro === 'Realizados'
        ? g.estado === 'realizado'
        : g.estado === 'agendado',
  );

  const realizados = lista.filter((g) => g.estado === 'realizado');
  const v = realizados.filter((g) => resultado(g) === 'V').length;
  const e = realizados.filter((g) => resultado(g) === 'E').length;
  const d = realizados.filter((g) => resultado(g) === 'D').length;
  const marcados = realizados.reduce((a, g) => a + (g.golosPro ?? 0), 0);
  const sofridos = realizados.reduce((a, g) => a + (g.golosContra ?? 0), 0);

  const jogo = lista.find((g) => g.id === aberto);

  function criar() {
    const g = jogoNovo();
    jogos.guardar(g);
    setAberto(g.id);
  }

  return (
    <div className="coluna">
      {realizados.length > 0 && (
        <div className="grelha g4">
          <div className="cartao estat">
            <div className="v">
              {v}-{e}-{d}
            </div>
            <div className="r">V–E–D em {realizados.length} jogos</div>
          </div>
          <div className="cartao estat">
            <div className="v">{marcados}</div>
            <div className="r">Golos marcados</div>
          </div>
          <div className="cartao estat">
            <div className="v" style={{ color: 'var(--perigo)' }}>
              {sofridos}
            </div>
            <div className="r">Golos sofridos</div>
          </div>
          <div className="cartao estat">
            <div className="v">
              {Math.round(((v * 3 + e) / Math.max(1, realizados.length * 3)) * 100)}%
            </div>
            <div className="r">Pontos conquistados</div>
          </div>
        </div>
      )}

      <div className="linha envolve sem-imprimir">
        <Segmentado
          opcoes={['Todos', 'Próximos', 'Realizados'] as const}
          valor={filtro}
          aoMudar={setFiltro}
        />
        <div className="espaco" />
        <button className="btn primario" onClick={criar}>
          + Jogo
        </button>
      </div>

      {!lista.length ? (
        <Vazio
          emo="🏆"
          titulo="Sem jogos"
          texto="Agenda os jogos da época, faz a convocatória e regista o relatório no fim."
          acao={
            <button className="btn primario" onClick={criar}>
              Agendar jogo
            </button>
          }
        />
      ) : (
        <div className="coluna" style={{ gap: 8 }}>
          {visiveis.map((g) => {
            const r = resultado(g);
            return (
              <button
                key={g.id}
                className="cartao cartao-p clicavel linha envolve"
                onClick={() => setAberto(g.id)}
                style={{ textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
              >
                <div style={{ width: 62 }}>
                  <div className="mini">{formatar(g.data).slice(0, 3)}</div>
                  <b>{formatar(g.data).slice(4, 9)}</b>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b className="truncar">
                    {g.casa ? 'Nós' : g.adversario || 'Adversário'} vs{' '}
                    {g.casa ? g.adversario || 'Adversário' : 'Nós'}
                  </b>
                  <div className="mini">
                    {g.competicao}
                    {g.jornada ? ` · J${g.jornada}` : ''} · {g.casa ? 'Casa' : 'Fora'}
                  </div>
                </div>
                {g.estado === 'realizado' ? (
                  <>
                    <b style={{ fontSize: 18 }}>
                      {g.golosPro ?? 0}–{g.golosContra ?? 0}
                    </b>
                    <span
                      className={
                        'eti ' + (r === 'V' ? 'verde' : r === 'E' ? 'amarelo' : 'vermelho')
                      }
                    >
                      {r}
                    </span>
                  </>
                ) : (
                  <span className="eti azul">{g.hora ?? 'Agendado'}</span>
                )}
              </button>
            );
          })}
          {!visiveis.length && <p className="vazio mudo">Sem jogos neste filtro.</p>}
        </div>
      )}

      {jogo && <EditorJogo jogo={jogo} plantel={plantel} aoFechar={() => setAberto(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function EditorJogo({
  jogo,
  plantel,
  aoFechar,
}: {
  jogo: Jogo;
  plantel: Jogador[];
  aoFechar: () => void;
}) {
  const [g, setG] = useState(jogo);
  const [aba, setAba] = useState<'Dados' | 'Convocatória' | 'Onze' | 'Jogo' | 'Relatório'>(
    'Dados',
  );
  const p = <K extends keyof Jogo>(k: K, v: Jogo[K]) => setG((a) => ({ ...a, [k]: v }));

  const ordenados = plantel
    .slice()
    .sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome));
  const nome = (id: string) => {
    const j = plantel.find((x) => x.id === id);
    return j ? j.alcunha || j.nome : '?';
  };

  function alternarConvocado(id: string) {
    const on = g.convocados.includes(id);
    if (on) {
      p('convocados', g.convocados.filter((x) => x !== id));
      p('onze', g.onze.filter((x) => x !== id));
      p('suplentes', g.suplentes.filter((x) => x !== id));
    } else {
      p('convocados', [...g.convocados, id]);
    }
  }

  function alternarOnze(id: string) {
    if (g.onze.includes(id)) {
      p('onze', g.onze.filter((x) => x !== id));
      p('suplentes', [...g.suplentes.filter((x) => x !== id), id]);
    } else if (g.onze.length < 11) {
      p('onze', [...g.onze, id]);
      p('suplentes', g.suplentes.filter((x) => x !== id));
    } else {
      alert('O onze já tem 11 jogadores.');
    }
  }

  return (
    <Modal
      titulo={`${g.casa ? 'Casa' : 'Fora'} · vs ${g.adversario || '…'} · ${formatar(g.data)}`}
      aoFechar={aoFechar}
      largo
      rodape={
        <>
          <BotaoApagar
            aoConfirmar={() => {
              jogos.remover(g.id);
              aoFechar();
            }}
          />
          <div className="espaco" />
          <button className="btn" onClick={() => window.print()}>
            Imprimir
          </button>
          <button
            className="btn primario"
            onClick={() => {
              jogos.guardar(g);
              aoFechar();
            }}
          >
            Guardar
          </button>
        </>
      }
    >
      <Abas
        abas={['Dados', 'Convocatória', 'Onze', 'Jogo', 'Relatório'] as const}
        ativa={aba}
        aoMudar={setAba}
      />

      {aba === 'Dados' && (
        <div className="forma">
          <Texto
            label="Adversário"
            valor={g.adversario}
            aoMudar={(v) => p('adversario', v)}
            largo
          />
          <Texto label="Data" tipo="date" valor={g.data} aoMudar={(v) => p('data', v)} />
          <Texto label="Hora" tipo="time" valor={g.hora} aoMudar={(v) => p('hora', v)} />
          <Escolha
            label="Local"
            valor={g.casa ? 'Casa' : 'Fora'}
            opcoes={['Casa', 'Fora'] as const}
            aoMudar={(v) => p('casa', v === 'Casa')}
          />
          <Texto label="Campo" valor={g.local} aoMudar={(v) => p('local', v)} />
          <Texto
            label="Competição"
            valor={g.competicao}
            aoMudar={(v) => p('competicao', v)}
          />
          <Texto label="Jornada" valor={g.jornada} aoMudar={(v) => p('jornada', v)} />
          <Escolha
            label="Sistema tático"
            valor={g.sistema ?? '1-4-3-3'}
            opcoes={SISTEMAS}
            aoMudar={(v) => p('sistema', v)}
          />
          <Escolha
            label="Estado"
            valor={g.estado}
            opcoes={[
              { v: 'agendado' as const, t: 'Agendado' },
              { v: 'realizado' as const, t: 'Realizado' },
            ]}
            aoMudar={(v) => p('estado', v)}
          />
          {g.estado === 'realizado' && (
            <>
              <Texto
                label="Golos marcados"
                tipo="number"
                valor={g.golosPro}
                aoMudar={(v) => p('golosPro', v === '' ? undefined : Number(v))}
                min={0}
              />
              <Texto
                label="Golos sofridos"
                tipo="number"
                valor={g.golosContra}
                aoMudar={(v) => p('golosContra', v === '' ? undefined : Number(v))}
                min={0}
              />
            </>
          )}
        </div>
      )}

      {aba === 'Convocatória' && (
        <div className="coluna">
          <div className="linha envolve">
            <span className="eti azul">{g.convocados.length} convocados</span>
            <div className="espaco" />
            <button
              className="btn pq"
              onClick={() =>
                p(
                  'convocados',
                  ordenados.filter((j) => j.estado === 'Disponível').map((j) => j.id),
                )
              }
            >
              Convocar disponíveis
            </button>
            <button className="btn pq fantasma" onClick={() => p('convocados', [])}>
              Limpar
            </button>
          </div>
          <div className="cartao">
            {ordenados.map((j) => {
              const on = g.convocados.includes(j.id);
              return (
                <div
                  key={j.id}
                  className="linha clicavel"
                  onClick={() => alternarConvocado(j.id)}
                  style={{
                    padding: 8,
                    borderBottom: '1px solid var(--borda)',
                    cursor: 'pointer',
                    background: on ? 'var(--acento-suave)' : undefined,
                  }}
                >
                  <input type="checkbox" checked={on} readOnly />
                  <div className="dorsal">{j.numero ?? '–'}</div>
                  <Avatar nome={j.nome} foto={j.foto} />
                  <b className="truncar" style={{ flex: 1 }}>
                    {j.nome}
                  </b>
                  <span className="eti">{j.posicao}</span>
                  {j.estado !== 'Disponível' && (
                    <span className="eti vermelho">{j.estado}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {aba === 'Onze' && (
        <div className="coluna">
          {!g.convocados.length ? (
            <p className="mudo">Faz primeiro a convocatória.</p>
          ) : (
            <>
              <div className="linha envolve">
                <span className="eti azul">{g.onze.length}/11 no onze</span>
                <span className="eti">{g.sistema}</span>
                <div className="espaco" />
                <button
                  className="btn pq"
                  onClick={() => {
                    const pos: Jogo['posicoesOnze'] = {};
                    for (const id of g.onze) {
                      const j = plantel.find((x) => x.id === id);
                      if (j) pos[id] = POSICAO_XY[j.posicao];
                    }
                    p('posicoesOnze', pos);
                  }}
                >
                  Arrumar por posição
                </button>
              </div>

              <CampoOnze
                onze={g.onze}
                posicoes={g.posicoesOnze}
                plantel={plantel}
                aoMover={(id, x, y) =>
                  p('posicoesOnze', { ...g.posicoesOnze, [id]: { x, y } })
                }
              />

              <h3>Convocados</h3>
              <div className="linha envolve" style={{ gap: 5 }}>
                {g.convocados.map((id) => {
                  const titular = g.onze.includes(id);
                  return (
                    <button
                      key={id}
                      className={'eti clicavel' + (titular ? ' verde' : '')}
                      style={{ cursor: 'pointer' }}
                      onClick={() => alternarOnze(id)}
                    >
                      {titular ? '★ ' : ''}
                      {nome(id)}
                    </button>
                  );
                })}
              </div>
              <p className="mini">
                Clica para pôr/tirar do onze. Arrasta os jogadores no campo para ajustar a posição.
              </p>
            </>
          )}
        </div>
      )}

      {aba === 'Jogo' && (
        <div className="coluna">
          <h3>Eventos</h3>
          <RegistoEventos
            g={g}
            plantel={plantel}
            aoMudar={(evs) => p('eventos', evs)}
          />

          <h3 style={{ marginTop: 10 }}>Minutos e avaliação</h3>
          {!g.convocados.length ? (
            <p className="mudo">Sem convocados.</p>
          ) : (
            <div className="cartao rolar">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Jogador</th>
                    <th style={{ width: 90 }}>Minutos</th>
                    <th style={{ width: 150 }}>Avaliação</th>
                  </tr>
                </thead>
                <tbody>
                  {g.convocados.map((id) => (
                    <tr key={id}>
                      <td>
                        {g.onze.includes(id) && <span className="eti verde">XI</span>} {nome(id)}
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={g.minutos[id] ?? ''}
                          onChange={(e) =>
                            p('minutos', {
                              ...g.minutos,
                              [id]: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td>
                        <div className="linha" style={{ gap: 3 }}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              className={'eti clicavel' + ((g.avaliacoes[id] ?? 0) >= n ? ' verde' : '')}
                              style={{ cursor: 'pointer', minWidth: 24, justifyContent: 'center' }}
                              onClick={() =>
                                p('avaliacoes', {
                                  ...g.avaliacoes,
                                  [id]: g.avaliacoes[id] === n ? 0 : n,
                                })
                              }
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {aba === 'Relatório' && (
        <div className="forma">
          <Area
            label="Pontos positivos"
            valor={g.pontosPositivos}
            aoMudar={(v) => p('pontosPositivos', v)}
            linhas={4}
          />
          <Area
            label="Aspetos a melhorar"
            valor={g.pontosMelhorar}
            aoMudar={(v) => p('pontosMelhorar', v)}
            linhas={4}
          />
          <Area
            label="Relatório do jogo"
            valor={g.relatorio}
            aoMudar={(v) => p('relatorio', v)}
            linhas={12}
            placeholder="Análise dos quatro momentos, comportamento coletivo, decisões táticas, conclusões para o treino…"
          />
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function CampoOnze({
  onze,
  posicoes,
  plantel,
  aoMover,
}: {
  onze: string[];
  posicoes: Jogo['posicoesOnze'];
  plantel: Jogador[];
  aoMover: (id: string, x: number, y: number) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const arrasto = useRef<string | null>(null);
  // Campo na vertical: trocamos os eixos da vista completa.
  const w = VISTA.completo.h;
  const h = VISTA.completo.w;

  function pos(e: { clientX: number; clientY: number }) {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.max(3, Math.min(97, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(3, Math.min(97, ((e.clientY - r.top) / r.height) * 100)),
    };
  }

  return (
    <div className="quadro-envolvente" style={{ maxWidth: 460, margin: '0 auto' }}>
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: 'block', width: '100%', touchAction: 'none' }}
        onPointerMove={(e) => {
          if (!arrasto.current) return;
          const q = pos(e);
          aoMover(arrasto.current, q.x, q.y);
        }}
        onPointerUp={() => (arrasto.current = null)}
        onPointerCancel={() => (arrasto.current = null)}
      >
        {/* O campo é desenhado deitado (105x68) e rodado para ficar na vertical. */}
        <g transform={`translate(0 ${h}) rotate(-90)`}>
          <Marcacoes tipo="completo" />
        </g>
        {onze.map((id) => {
          const j = plantel.find((x) => x.id === id);
          if (!j) return null;
          const pt = posicoes[id] ?? POSICAO_XY[j.posicao];
          const cx = (pt.x / 100) * w;
          const cy = (pt.y / 100) * h;
          return (
            <g
              key={id}
              style={{ cursor: 'move' }}
              onPointerDown={(e) => {
                arrasto.current = id;
                ref.current?.setPointerCapture(e.pointerId);
              }}
            >
              <circle cx={cx} cy={cy} r={4.4} fill="var(--acento)" stroke="#fff" strokeWidth={0.6} />
              <text
                x={cx}
                y={cy}
                fill="#fff"
                fontSize={4.2}
                fontWeight={800}
                textAnchor="middle"
                dominantBaseline="central"
                pointerEvents="none"
              >
                {j.numero ?? j.posicao}
              </text>
              <text
                x={cx}
                y={cy + 7.4}
                fill="#fff"
                fontSize={3.2}
                fontWeight={700}
                textAnchor="middle"
                stroke="#00000077"
                strokeWidth={0.5}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {(j.alcunha || j.nome.split(' ')[0]).slice(0, 11)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------

function RegistoEventos({
  g,
  plantel,
  aoMudar,
}: {
  g: Jogo;
  plantel: Jogador[];
  aoMudar: (e: EventoJogo[]) => void;
}) {
  const [minuto, setMinuto] = useState(1);
  const [tipo, setTipo] = useState<EventoJogo['tipo']>('golo');
  const [jogadorId, setJogadorId] = useState('');
  const [entraId, setEntraId] = useState('');
  const [desc, setDesc] = useState('');

  const convocados = g.convocados
    .map((id) => plantel.find((j) => j.id === id))
    .filter(Boolean) as Jogador[];
  const nome = (id?: string) => {
    const j = plantel.find((x) => x.id === id);
    return j ? j.alcunha || j.nome : '';
  };

  function adicionar() {
    aoMudar(
      [
        ...g.eventos,
        {
          id: novoId(),
          minuto,
          tipo,
          jogadorId: jogadorId || undefined,
          jogadorEntraId: tipo === 'substituicao' ? entraId || undefined : undefined,
          descricao: desc || undefined,
        },
      ].sort((a, b) => a.minuto - b.minuto),
    );
    setDesc('');
  }

  return (
    <>
      <div className="cartao cartao-p">
        <div className="forma">
          <Texto
            label="Minuto"
            tipo="number"
            valor={minuto}
            aoMudar={(v) => setMinuto(Number(v) || 0)}
            min={0}
            max={130}
          />
          <Escolha label="Tipo" valor={tipo} opcoes={TIPOS_EVENTO} aoMudar={setTipo} />
          <Escolha
            label={tipo === 'substituicao' ? 'Sai' : 'Jogador'}
            valor={jogadorId}
            opcoes={[
              { v: '', t: '— nenhum —' },
              ...convocados.map((j) => ({ v: j.id, t: j.nome })),
            ]}
            aoMudar={setJogadorId}
          />
          {tipo === 'substituicao' && (
            <Escolha
              label="Entra"
              valor={entraId}
              opcoes={[
                { v: '', t: '— nenhum —' },
                ...convocados.map((j) => ({ v: j.id, t: j.nome })),
              ]}
              aoMudar={setEntraId}
            />
          )}
          <Texto label="Descrição" valor={desc} aoMudar={setDesc} largo />
        </div>
        <button className="btn primario" style={{ marginTop: 10 }} onClick={adicionar}>
          + Adicionar evento
        </button>
      </div>

      {g.eventos.length > 0 && (
        <div className="cartao">
          {g.eventos.map((e) => (
            <div key={e.id} className="linha" style={{ padding: 8, borderBottom: '1px solid var(--borda)' }}>
              <b style={{ width: 38 }}>{e.minuto}′</b>
              <span className="eti">{TIPOS_EVENTO.find((t) => t.v === e.tipo)?.t}</span>
              <span className="truncar" style={{ flex: 1 }}>
                {e.tipo === 'substituicao'
                  ? `${nome(e.jogadorId)} ⇄ ${nome(e.jogadorEntraId)}`
                  : nome(e.jogadorId)}
                {e.descricao ? ` — ${e.descricao}` : ''}
              </span>
              <button
                className="btn pq perigo"
                onClick={() => aoMudar(g.eventos.filter((x) => x.id !== e.id))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

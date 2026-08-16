import { useMemo, useState } from 'react';
import {
  Abas,
  Area,
  Avatar,
  BotaoApagar,
  Escolha,
  Intensidade,
  Modal,
  Segmentado,
  Texto,
  Vazio,
} from '../componentes/ui';
import { VerDesenho } from '../componentes/quadro';
import { novoId, sessoes, useColecao } from '../lib/store';
import { formatar, hoje } from '../lib/datas';
import type {
  BlocoSessao,
  Exercicio,
  Jogador,
  Microciclo,
  Sessao,
} from '../lib/types';

const PARTES = ['Inicial', 'Fundamental', 'Final'] as const;

const PRESENCA_ETI: Record<string, string> = {
  presente: 'verde',
  falta: 'vermelho',
  justificada: 'amarelo',
  lesionado: 'azul',
};
const PRESENCA_TXT: Record<string, string> = {
  presente: 'P',
  falta: 'F',
  justificada: 'J',
  lesionado: 'L',
};

function sessaoNova(numero: number, microcicloId?: string): Sessao {
  return {
    id: novoId(),
    numero,
    data: hoje(),
    hora: '19:00',
    microcicloId,
    blocos: [],
    presencas: {},
    cargaPrevista: 3,
    criadoEm: Date.now(),
  };
}

export default function Treinos() {
  const lista = useColecao<Sessao>('sessoes');
  const micros = useColecao<Microciclo>('microciclos');
  const [aberta, setAberta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'Próximas' | 'Todas'>('Próximas');

  const ordenadas = useMemo(
    () => [...lista].sort((a, b) => b.data.localeCompare(a.data)),
    [lista],
  );
  const visiveis =
    filtro === 'Todas' ? ordenadas : ordenadas.filter((s) => s.data >= hoje());

  const sessao = lista.find((s) => s.id === aberta);

  function criar() {
    const s = sessaoNova(lista.length + 1);
    sessoes.guardar(s);
    setAberta(s.id);
  }

  const totalMin = (s: Sessao) => s.blocos.reduce((a, b) => a + (b.duracaoMin || 0), 0);

  return (
    <div className="coluna">
      <div className="linha envolve sem-imprimir">
        <Segmentado
          opcoes={['Próximas', 'Todas'] as const}
          valor={filtro}
          aoMudar={setFiltro}
        />
        <div className="espaco" />
        <button className="btn primario" onClick={criar}>
          + Sessão
        </button>
      </div>

      {!lista.length ? (
        <Vazio
          emo="📋"
          titulo="Sem sessões de treino"
          texto="Cria uma sessão e arrasta para lá os exercícios da tua biblioteca."
          acao={
            <button className="btn primario" onClick={criar}>
              Criar primeira sessão
            </button>
          }
        />
      ) : (
        <div className="grelha g2">
          {visiveis.map((s) => {
            const micro = micros.find((m) => m.id === s.microcicloId);
            const presentes = Object.values(s.presencas).filter((v) => v === 'presente').length;
            return (
              <button
                key={s.id}
                className="cartao cartao-p clicavel"
                onClick={() => setAberta(s.id)}
                style={{ textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
              >
                <div className="linha">
                  <span className="eti azul">Sessão {s.numero ?? '—'}</span>
                  <div className="espaco" />
                  <span className="mini">{formatar(s.data)}</span>
                </div>
                <h3 style={{ marginTop: 8 }}>{s.objetivoGeral || 'Sem objetivo definido'}</h3>
                <div className="linha envolve" style={{ gap: 5, marginTop: 8 }}>
                  <span className="eti">{s.blocos.length} exercícios</span>
                  <span className="eti">{totalMin(s)}′</span>
                  <span className="eti">Carga {s.cargaPrevista}/5</span>
                  {presentes > 0 && <span className="eti verde">{presentes} presentes</span>}
                  {micro && <span className="eti">{micro.nome}</span>}
                </div>
              </button>
            );
          })}
          {!visiveis.length && (
            <p className="vazio mudo">Sem sessões futuras. Muda o filtro para "Todas".</p>
          )}
        </div>
      )}

      {sessao && <EditorSessao sessao={sessao} aoFechar={() => setAberta(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function EditorSessao({ sessao, aoFechar }: { sessao: Sessao; aoFechar: () => void }) {
  const [s, setS] = useState(sessao);
  const [aba, setAba] = useState<'Plano' | 'Presenças' | 'Balanço'>('Plano');
  const [seletor, setSeletor] = useState<(typeof PARTES)[number] | null>(null);
  const exs = useColecao<Exercicio>('exercicios');
  const micros = useColecao<Microciclo>('microciclos');
  const plantel = useColecao<Jogador>('jogadores');

  const p = <K extends keyof Sessao>(k: K, v: Sessao[K]) => setS((a) => ({ ...a, [k]: v }));

  function guardar() {
    sessoes.guardar(s);
    aoFechar();
  }

  function addBloco(parte: (typeof PARTES)[number], ex?: Exercicio) {
    const b: BlocoSessao = {
      id: novoId(),
      parte,
      exercicioId: ex?.id,
      titulo: ex?.nome ?? 'Novo bloco',
      duracaoMin: ex?.duracaoMin ?? 10,
    };
    p('blocos', [...s.blocos, b]);
  }

  function moverBloco(id: string, dir: -1 | 1) {
    const i = s.blocos.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.blocos.length) return;
    const copia = [...s.blocos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    p('blocos', copia);
  }

  const total = s.blocos.reduce((a, b) => a + (b.duracaoMin || 0), 0);
  const ordenados = plantel
    .slice()
    .sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome));

  return (
    <Modal
      titulo={`Sessão ${s.numero ?? ''} · ${formatar(s.data)}`}
      aoFechar={aoFechar}
      largo
      rodape={
        <>
          <BotaoApagar
            aoConfirmar={() => {
              sessoes.remover(s.id);
              aoFechar();
            }}
          />
          <div className="espaco" />
          <button className="btn" onClick={() => window.print()}>
            Imprimir
          </button>
          <button className="btn primario" onClick={guardar}>
            Guardar
          </button>
        </>
      }
    >
      <Abas abas={['Plano', 'Presenças', 'Balanço'] as const} ativa={aba} aoMudar={setAba} />

      {aba === 'Plano' && (
        <div className="coluna">
          <div className="forma">
            <Texto
              label="Nº da sessão"
              tipo="number"
              valor={s.numero}
              aoMudar={(v) => p('numero', v === '' ? undefined : Number(v))}
            />
            <Texto label="Data" tipo="date" valor={s.data} aoMudar={(v) => p('data', v)} />
            <Texto label="Hora" tipo="time" valor={s.hora} aoMudar={(v) => p('hora', v)} />
            <Texto label="Local" valor={s.local} aoMudar={(v) => p('local', v)} />
            <Escolha
              label="Microciclo"
              valor={s.microcicloId ?? ''}
              opcoes={[
                { v: '', t: '— nenhum —' },
                ...micros.map((m) => ({ v: m.id, t: m.nome })),
              ]}
              aoMudar={(v) => p('microcicloId', v || undefined)}
            />
            <Intensidade
              label="Carga prevista"
              valor={s.cargaPrevista}
              aoMudar={(n) => p('cargaPrevista', n)}
            />
            <Area
              label="Objetivo geral da sessão"
              valor={s.objetivoGeral}
              aoMudar={(v) => p('objetivoGeral', v)}
              linhas={2}
            />
            <Texto
              label="Momento do jogo trabalhado"
              valor={s.momento}
              aoMudar={(v) => p('momento', v)}
              placeholder="ex.: organização ofensiva — construção"
              largo
            />
          </div>

          <div className="linha">
            <h3>Plano da sessão</h3>
            <div className="espaco" />
            <span className="eti">{total} min no total</span>
          </div>

          {PARTES.map((parte) => {
            const blocos = s.blocos.filter((b) => b.parte === parte);
            const min = blocos.reduce((a, b) => a + (b.duracaoMin || 0), 0);
            return (
              <div className="cartao cartao-p" key={parte}>
                <div className="linha" style={{ marginBottom: 8 }}>
                  <b>Parte {parte.toLowerCase()}</b>
                  <span className="eti">{min}′</span>
                  <div className="espaco" />
                  <button className="btn pq" onClick={() => setSeletor(parte)}>
                    + Da biblioteca
                  </button>
                  <button className="btn pq fantasma" onClick={() => addBloco(parte)}>
                    + Bloco livre
                  </button>
                </div>

                {!blocos.length && <p className="mini">Sem exercícios nesta parte.</p>}

                <div className="coluna" style={{ gap: 8 }}>
                  {blocos.map((b) => {
                    const ex = exs.find((e) => e.id === b.exercicioId);
                    return (
                      <div
                        key={b.id}
                        className="linha linha-topo"
                        style={{
                          gap: 10,
                          padding: 8,
                          border: '1px solid var(--borda)',
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ width: 78, flex: '0 0 78px' }}>
                          <div className="miniatura" style={{ aspectRatio: '4/3' }}>
                            {ex?.imagem ? (
                              <img src={ex.imagem} alt="" />
                            ) : ex ? (
                              <VerDesenho desenho={ex.desenho} />
                            ) : (
                              <span className="mini">—</span>
                            )}
                          </div>
                        </div>
                        <div className="coluna" style={{ flex: 1, gap: 6, minWidth: 0 }}>
                          <input
                            value={b.titulo}
                            onChange={(e) =>
                              p(
                                'blocos',
                                s.blocos.map((x) =>
                                  x.id === b.id ? { ...x, titulo: e.target.value } : x,
                                ),
                              )
                            }
                          />
                          <div className="linha" style={{ gap: 6 }}>
                            <input
                              type="number"
                              value={b.duracaoMin}
                              min={1}
                              onChange={(e) =>
                                p(
                                  'blocos',
                                  s.blocos.map((x) =>
                                    x.id === b.id
                                      ? { ...x, duracaoMin: Number(e.target.value) || 0 }
                                      : x,
                                  ),
                                )
                              }
                              style={{ width: 74 }}
                              aria-label="Duração"
                            />
                            <span className="mini">min</span>
                            <div className="espaco" />
                            <button
                              className="btn pq fantasma"
                              onClick={() => moverBloco(b.id, -1)}
                            >
                              ↑
                            </button>
                            <button className="btn pq fantasma" onClick={() => moverBloco(b.id, 1)}>
                              ↓
                            </button>
                            <button
                              className="btn pq perigo"
                              onClick={() =>
                                p(
                                  'blocos',
                                  s.blocos.filter((x) => x.id !== b.id),
                                )
                              }
                            >
                              ✕
                            </button>
                          </div>
                          <input
                            placeholder="Notas / condicionantes deste bloco"
                            value={b.notas ?? ''}
                            onChange={(e) =>
                              p(
                                'blocos',
                                s.blocos.map((x) =>
                                  x.id === b.id ? { ...x, notas: e.target.value } : x,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {aba === 'Presenças' && (
        <div className="coluna">
          {!ordenados.length ? (
            <p className="mudo">Sem jogadores no plantel.</p>
          ) : (
            <>
              <div className="linha envolve">
                <button
                  className="btn pq"
                  onClick={() =>
                    p(
                      'presencas',
                      Object.fromEntries(ordenados.map((j) => [j.id, 'presente'])) as Sessao['presencas'],
                    )
                  }
                >
                  Marcar todos presentes
                </button>
                <button className="btn pq fantasma" onClick={() => p('presencas', {})}>
                  Limpar
                </button>
                <div className="espaco" />
                <span className="eti verde">
                  {Object.values(s.presencas).filter((v) => v === 'presente').length} presentes
                </span>
              </div>
              <div className="cartao">
                {ordenados.map((j) => (
                  <div
                    key={j.id}
                    className="linha"
                    style={{ padding: 8, borderBottom: '1px solid var(--borda)' }}
                  >
                    <div className="dorsal">{j.numero ?? '–'}</div>
                    <Avatar nome={j.nome} foto={j.foto} />
                    <b className="truncar" style={{ flex: 1 }}>
                      {j.nome}
                    </b>
                    <div className="linha" style={{ gap: 3 }}>
                      {(['presente', 'falta', 'justificada', 'lesionado'] as const).map((v) => (
                        <button
                          key={v}
                          className={
                            'eti clicavel' + (s.presencas[j.id] === v ? ' ' + PRESENCA_ETI[v] : '')
                          }
                          style={{ cursor: 'pointer', minWidth: 28, justifyContent: 'center' }}
                          title={v}
                          onClick={() =>
                            p('presencas', {
                              ...s.presencas,
                              [j.id]: s.presencas[j.id] === v ? undefined! : v,
                            })
                          }
                        >
                          {PRESENCA_TXT[v]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mini">P = presente · F = falta · J = justificada · L = lesionado</p>
            </>
          )}
        </div>
      )}

      {aba === 'Balanço' && (
        <div className="forma">
          <Area
            label="Balanço da sessão"
            valor={s.observacoes}
            aoMudar={(v) => p('observacoes', v)}
            linhas={10}
            placeholder="O que correu bem, o que ajustar, comportamento do grupo, notas individuais…"
          />
        </div>
      )}

      {seletor && (
        <SeletorExercicio
          exercicios={exs}
          aoFechar={() => setSeletor(null)}
          aoEscolher={(ex) => {
            addBloco(seletor, ex);
            setSeletor(null);
          }}
        />
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function SeletorExercicio({
  exercicios: exs,
  aoFechar,
  aoEscolher,
}: {
  exercicios: Exercicio[];
  aoFechar: () => void;
  aoEscolher: (e: Exercicio) => void;
}) {
  const [q, setQ] = useState('');
  const filtrados = exs.filter(
    (e) =>
      !q.trim() ||
      e.nome.toLowerCase().includes(q.toLowerCase()) ||
      e.categoria.toLowerCase().includes(q.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Modal titulo="Escolher exercício" aoFechar={aoFechar} largo>
      <input
        placeholder="Procurar…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 12 }}
        autoFocus
      />
      {!exs.length ? (
        <p className="mudo">A tua biblioteca está vazia. Cria exercícios primeiro.</p>
      ) : (
        <div className="grelha g3">
          {filtrados.map((e) => (
            <button
              key={e.id}
              className="cartao clicavel"
              onClick={() => aoEscolher(e)}
              style={{
                padding: 8,
                textAlign: 'left',
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
              }}
            >
              <div className="miniatura">
                {e.imagem ? <img src={e.imagem} alt="" /> : <VerDesenho desenho={e.desenho} />}
              </div>
              <b className="truncar" style={{ display: 'block', marginTop: 6, fontSize: 13 }}>
                {e.nome}
              </b>
              <span className="mini">
                {e.categoria} · {e.duracaoMin}′
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

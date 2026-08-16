import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  BotaoApagar,
  Escolha,
  Intensidade,
  Modal,
  Texto,
  Vazio,
} from '../componentes/ui';
import {
  macrociclos,
  mesociclos,
  microciclos,
  novoId,
  useColecao,
  useDefinicoes,
} from '../lib/store';
import {
  DIAS,
  diasEntre,
  formatarCurto,
  hoje,
  iso,
  maisDias,
  segunda,
} from '../lib/datas';
import type {
  Jogo,
  Macrociclo,
  Mesociclo,
  Microciclo,
  Sessao,
} from '../lib/types';

const TIPOS_MESO = [
  'Pré-época',
  'Competitivo',
  'Recuperação',
  'Transição',
  'Preparatório',
] as const;

const COR_TIPO: Record<string, string> = {
  'Pré-época': '#f59e0b',
  Competitivo: '#16a34a',
  Recuperação: '#0ea5e9',
  Transição: '#8b5cf6',
  Preparatório: '#f97316',
};

export default function Periodizacao() {
  const defs = useDefinicoes();
  const macros = useColecao<Macrociclo>('macrociclos');
  const mesos = useColecao<Mesociclo>('mesociclos');
  const micros = useColecao<Microciclo>('microciclos');
  const sessoes = useColecao<Sessao>('sessoes');
  const jogos = useColecao<Jogo>('jogos');

  const [macroSel, setMacroSel] = useState<string>('');
  const [editMacro, setEditMacro] = useState<Macrociclo | null>(null);
  const [editMeso, setEditMeso] = useState<Mesociclo | null>(null);
  const [editMicro, setEditMicro] = useState<Microciclo | null>(null);

  useEffect(() => {
    if (!macroSel && macros.length) setMacroSel(macros[0].id);
  }, [macros, macroSel]);

  const macro = macros.find((m) => m.id === macroSel);
  const meusMesos = useMemo(
    () => mesos.filter((m) => m.macrocicloId === macroSel).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [mesos, macroSel],
  );

  function criarMacro() {
    const ano = new Date().getFullYear();
    setEditMacro({
      id: novoId(),
      nome: 'Época ' + defs.epoca,
      epoca: defs.epoca,
      inicio: `${ano}-08-01`,
      fim: `${ano + 1}-06-30`,
      criadoEm: Date.now(),
    });
  }

  if (!macros.length) {
    return (
      <Vazio
        emo="📆"
        titulo="Sem planeamento"
        texto="Cria o macrociclo da época. Depois divides em mesociclos (blocos de semanas) e microciclos (semanas de treino)."
        acao={
          <>
            <button className="btn primario" onClick={criarMacro}>
              Criar macrociclo
            </button>
            {editMacro && (
              <EditorMacro
                m={editMacro}
                aoFechar={() => setEditMacro(null)}
                aoGuardar={(x) => {
                  macrociclos.guardar(x);
                  setMacroSel(x.id);
                  setEditMacro(null);
                }}
              />
            )}
          </>
        }
      />
    );
  }

  return (
    <div className="coluna">
      <div className="linha envolve sem-imprimir">
        <select
          value={macroSel}
          onChange={(e) => setMacroSel(e.target.value)}
          style={{ maxWidth: 280 }}
        >
          {macros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
        {macro && (
          <button className="btn" onClick={() => setEditMacro(macro)}>
            Editar
          </button>
        )}
        <div className="espaco" />
        <button className="btn" onClick={criarMacro}>
          + Macrociclo
        </button>
        <button
          className="btn primario"
          disabled={!macro}
          onClick={() =>
            macro &&
            setEditMeso({
              id: novoId(),
              macrocicloId: macro.id,
              nome: `Mesociclo ${meusMesos.length + 1}`,
              inicio: meusMesos.length ? maisDias(meusMesos[meusMesos.length - 1].fim, 1) : macro.inicio,
              fim: maisDias(
                meusMesos.length ? maisDias(meusMesos[meusMesos.length - 1].fim, 1) : macro.inicio,
                27,
              ),
              tipo: 'Competitivo',
              criadoEm: Date.now(),
            })
          }
        >
          + Mesociclo
        </button>
      </div>

      {macro && (
        <div className="cartao cartao-p">
          <div className="linha envolve">
            <h2>{macro.nome}</h2>
            <span className="eti">
              {formatarCurto(macro.inicio)} → {formatarCurto(macro.fim)}
            </span>
            <span className="eti azul">
              {Math.round(diasEntre(macro.inicio, macro.fim) / 7)} semanas
            </span>
            <div className="espaco" />
            <span className="eti">{meusMesos.length} mesociclos</span>
          </div>
          {macro.objetivos && (
            <p className="mudo" style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
              {macro.objetivos}
            </p>
          )}
          {meusMesos.length > 0 && (
            <BarraTemporal macro={macro} mesos={meusMesos} />
          )}
        </div>
      )}

      {meusMesos.map((meso) => {
        const meusMicros = micros
          .filter((m) => m.mesocicloId === meso.id)
          .sort((a, b) => a.inicio.localeCompare(b.inicio));
        return (
          <div className="cartao cartao-p" key={meso.id}>
            <div className="linha envolve">
              <span
                className="eti"
                style={{
                  background: COR_TIPO[meso.tipo] + '22',
                  color: COR_TIPO[meso.tipo],
                  borderColor: 'transparent',
                }}
              >
                {meso.tipo}
              </span>
              <h3>{meso.nome}</h3>
              <span className="mini">
                {formatarCurto(meso.inicio)} → {formatarCurto(meso.fim)}
              </span>
              <div className="espaco" />
              <button className="btn pq fantasma" onClick={() => setEditMeso(meso)}>
                Editar
              </button>
              <button
                className="btn pq"
                onClick={() => {
                  const inicio = meusMicros.length
                    ? maisDias(meusMicros[meusMicros.length - 1].fim, 1)
                    : segunda(meso.inicio);
                  setEditMicro({
                    id: novoId(),
                    mesocicloId: meso.id,
                    nome: `MC ${meusMicros.length + 1}`,
                    inicio,
                    fim: maisDias(inicio, 6),
                    cargaAlvo: 3,
                    criadoEm: Date.now(),
                  });
                }}
              >
                + Microciclo
              </button>
            </div>

            {meso.objetivos && (
              <p className="mudo" style={{ whiteSpace: 'pre-wrap' }}>
                {meso.objetivos}
              </p>
            )}

            {!meusMicros.length ? (
              <p className="mini">Sem microciclos. Adiciona as semanas de trabalho.</p>
            ) : (
              <div className="coluna" style={{ gap: 8, marginTop: 10 }}>
                {meusMicros.map((mc) => (
                  <SemanaMicro
                    key={mc.id}
                    mc={mc}
                    sessoes={sessoes}
                    jogos={jogos}
                    aoEditar={() => setEditMicro(mc)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {editMacro && (
        <EditorMacro
          m={editMacro}
          aoFechar={() => setEditMacro(null)}
          aoGuardar={(x) => {
            macrociclos.guardar(x);
            setMacroSel(x.id);
            setEditMacro(null);
          }}
        />
      )}
      {editMeso && (
        <EditorMeso
          m={editMeso}
          aoFechar={() => setEditMeso(null)}
          aoGuardar={(x) => {
            mesociclos.guardar(x);
            setEditMeso(null);
          }}
        />
      )}
      {editMicro && (
        <EditorMicro
          m={editMicro}
          aoFechar={() => setEditMicro(null)}
          aoGuardar={(x) => {
            microciclos.guardar(x);
            setEditMicro(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function BarraTemporal({ macro, mesos }: { macro: Macrociclo; mesos: Mesociclo[] }) {
  const total = Math.max(1, diasEntre(macro.inicio, macro.fim));
  const posHoje = diasEntre(macro.inicio, hoje());
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          height: 30,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--borda)',
        }}
      >
        {mesos.map((m) => {
          const largura = (Math.max(1, diasEntre(m.inicio, m.fim)) / total) * 100;
          return (
            <div
              key={m.id}
              title={`${m.nome} (${m.tipo})`}
              style={{
                width: `${largura}%`,
                background: COR_TIPO[m.tipo] ?? 'var(--acento)',
                opacity: 0.85,
                display: 'grid',
                placeItems: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                borderRight: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              {largura > 6 ? m.nome : ''}
            </div>
          );
        })}
        {posHoje >= 0 && posHoje <= total && (
          <div
            title="Hoje"
            style={{
              position: 'absolute',
              left: `${(posHoje / total) * 100}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: '#111',
              boxShadow: '0 0 0 1px #fff',
            }}
          />
        )}
      </div>
    </div>
  );
}

function SemanaMicro({
  mc,
  sessoes,
  jogos,
  aoEditar,
}: {
  mc: Microciclo;
  sessoes: Sessao[];
  jogos: Jogo[];
  aoEditar: () => void;
}) {
  const dias = Array.from({ length: 7 }, (_, i) => maisDias(mc.inicio, i));
  const h = hoje();
  return (
    <div
      style={{
        border: '1px solid var(--borda)',
        borderRadius: 10,
        padding: 10,
        background: 'var(--superficie-2)',
      }}
    >
      <div className="linha envolve" style={{ marginBottom: 8 }}>
        <b>{mc.nome}</b>
        <span className="mini">
          {formatarCurto(mc.inicio)} – {formatarCurto(mc.fim)}
        </span>
        <div className="espaco" />
        <span className="eti">Carga alvo {mc.cargaAlvo}/5</span>
        <button className="btn pq fantasma" onClick={aoEditar}>
          Editar
        </button>
      </div>
      {mc.objetivos && (
        <p className="mini" style={{ whiteSpace: 'pre-wrap', marginTop: 0 }}>
          {mc.objetivos}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {dias.map((d) => {
          const ss = sessoes.filter((s) => s.data === d);
          const gg = jogos.filter((g) => g.data === d);
          return (
            <div
              key={d}
              style={{
                background: 'var(--superficie)',
                border: d === h ? '2px solid var(--acento)' : '1px solid var(--borda)',
                borderRadius: 8,
                padding: 5,
                minHeight: 62,
                fontSize: 11,
              }}
            >
              <div className="mini" style={{ fontWeight: 700 }}>
                {DIAS[new Date(d).getDay()]} {formatarCurto(d).slice(0, 2)}
              </div>
              {gg.map((g) => (
                <div
                  key={g.id}
                  className="eti amarelo"
                  style={{ fontSize: 9.5, marginTop: 3, maxWidth: '100%' }}
                >
                  🏆 {g.adversario.slice(0, 8)}
                </div>
              ))}
              {ss.map((s) => (
                <div
                  key={s.id}
                  className="eti verde"
                  style={{ fontSize: 9.5, marginTop: 3, maxWidth: '100%' }}
                >
                  T{s.numero ?? ''} · {s.cargaPrevista}/5
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EditorMacro({
  m,
  aoFechar,
  aoGuardar,
}: {
  m: Macrociclo;
  aoFechar: () => void;
  aoGuardar: (m: Macrociclo) => void;
}) {
  const [x, setX] = useState(m);
  return (
    <Modal
      titulo="Macrociclo"
      aoFechar={aoFechar}
      rodape={
        <>
          <BotaoApagar
            aoConfirmar={() => {
              macrociclos.remover(m.id);
              aoFechar();
            }}
          />
          <div className="espaco" />
          <button className="btn primario" onClick={() => aoGuardar(x)}>
            Guardar
          </button>
        </>
      }
    >
      <div className="forma">
        <Texto label="Nome" valor={x.nome} aoMudar={(v) => setX({ ...x, nome: v })} largo />
        <Texto label="Época" valor={x.epoca} aoMudar={(v) => setX({ ...x, epoca: v })} />
        <Texto
          label="Início"
          tipo="date"
          valor={x.inicio}
          aoMudar={(v) => setX({ ...x, inicio: v })}
        />
        <Texto label="Fim" tipo="date" valor={x.fim} aoMudar={(v) => setX({ ...x, fim: v })} />
        <Area
          label="Objetivos da época"
          valor={x.objetivos}
          aoMudar={(v) => setX({ ...x, objetivos: v })}
          linhas={5}
        />
      </div>
    </Modal>
  );
}

function EditorMeso({
  m,
  aoFechar,
  aoGuardar,
}: {
  m: Mesociclo;
  aoFechar: () => void;
  aoGuardar: (m: Mesociclo) => void;
}) {
  const [x, setX] = useState(m);
  return (
    <Modal
      titulo="Mesociclo"
      aoFechar={aoFechar}
      rodape={
        <>
          <BotaoApagar
            aoConfirmar={() => {
              mesociclos.remover(m.id);
              aoFechar();
            }}
          />
          <div className="espaco" />
          <button className="btn primario" onClick={() => aoGuardar(x)}>
            Guardar
          </button>
        </>
      }
    >
      <div className="forma">
        <Texto label="Nome" valor={x.nome} aoMudar={(v) => setX({ ...x, nome: v })} largo />
        <Escolha
          label="Tipo"
          valor={x.tipo}
          opcoes={TIPOS_MESO}
          aoMudar={(v) => setX({ ...x, tipo: v })}
        />
        <Texto
          label="Início"
          tipo="date"
          valor={x.inicio}
          aoMudar={(v) => setX({ ...x, inicio: v })}
        />
        <Texto label="Fim" tipo="date" valor={x.fim} aoMudar={(v) => setX({ ...x, fim: v })} />
        <Area
          label="Objetivos do mesociclo"
          valor={x.objetivos}
          aoMudar={(v) => setX({ ...x, objetivos: v })}
          linhas={4}
        />
      </div>
    </Modal>
  );
}

function EditorMicro({
  m,
  aoFechar,
  aoGuardar,
}: {
  m: Microciclo;
  aoFechar: () => void;
  aoGuardar: (m: Microciclo) => void;
}) {
  const [x, setX] = useState(m);
  return (
    <Modal
      titulo="Microciclo (semana)"
      aoFechar={aoFechar}
      rodape={
        <>
          <BotaoApagar
            aoConfirmar={() => {
              microciclos.remover(m.id);
              aoFechar();
            }}
          />
          <div className="espaco" />
          <button className="btn primario" onClick={() => aoGuardar(x)}>
            Guardar
          </button>
        </>
      }
    >
      <div className="forma">
        <Texto label="Nome" valor={x.nome} aoMudar={(v) => setX({ ...x, nome: v })} />
        <Texto
          label="Segunda-feira"
          tipo="date"
          valor={x.inicio}
          aoMudar={(v) => {
            const s = segunda(v);
            setX({ ...x, inicio: s, fim: maisDias(s, 6) });
          }}
        />
        <Intensidade
          label="Carga alvo"
          valor={x.cargaAlvo}
          aoMudar={(n) => setX({ ...x, cargaAlvo: n })}
        />
        <Area
          label="Objetivos da semana"
          valor={x.objetivos}
          aoMudar={(v) => setX({ ...x, objetivos: v })}
          linhas={4}
        />
      </div>
      <p className="mini">
        Semana: {formatarCurto(x.inicio)} a {formatarCurto(x.fim)} (
        {iso(new Date()) >= x.inicio && iso(new Date()) <= x.fim ? 'semana atual' : 'outra semana'})
      </p>
    </Modal>
  );
}

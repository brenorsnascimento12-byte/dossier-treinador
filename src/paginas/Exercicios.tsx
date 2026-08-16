import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Abas,
  Area,
  BotaoApagar,
  Escolha,
  Intensidade,
  Modal,
  SelectorImagem,
  Texto,
  Vazio,
} from '../componentes/ui';
import { DESENHO_VAZIO, EditorQuadro, VerDesenho } from '../componentes/quadro';
import { exercicios, novoId, pastas, useColecao } from '../lib/store';
import { CATEGORIAS_EX, type CategoriaEx, type Exercicio, type Pasta } from '../lib/types';

export function exercicioNovo(patch: Partial<Exercicio> = {}): Exercicio {
  return {
    id: novoId(),
    nome: '',
    categoria: 'Posse de bola',
    duracaoMin: 15,
    intensidade: 3,
    tags: [],
    desenho: { ...DESENHO_VAZIO, itens: [] },
    criadoEm: Date.now(),
    ...patch,
  };
}

export default function Exercicios() {
  const lista = useColecao<Exercicio>('exercicios');
  const listaPastas = useColecao<Pasta>('pastas');
  const [procura, setProcura] = useState('');
  const [pasta, setPasta] = useState<string>('todas');
  const [categoria, setCategoria] = useState<'Todas' | CategoriaEx>('Todas');
  const [edicao, setEdicao] = useState<Exercicio | null>(null);
  const [verId, setVerId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const p = procura.trim().toLowerCase();
    return lista
      .filter((e) =>
        pasta === 'todas' ? true : pasta === 'sem' ? !e.pastaId : e.pastaId === pasta,
      )
      .filter((e) => categoria === 'Todas' || e.categoria === categoria)
      .filter(
        (e) =>
          !p ||
          e.nome.toLowerCase().includes(p) ||
          (e.objetivos ?? '').toLowerCase().includes(p) ||
          (e.descricao ?? '').toLowerCase().includes(p) ||
          e.tags.some((t) => t.toLowerCase().includes(p)),
      )
      .sort((a, b) => b.criadoEm - a.criadoEm);
  }, [lista, procura, pasta, categoria]);

  const aVer = lista.find((e) => e.id === verId);

  function novaPasta() {
    const nome = prompt('Nome da nova pasta:');
    if (nome?.trim())
      pastas.guardar({ id: novoId(), nome: nome.trim(), criadoEm: Date.now() });
  }

  return (
    <div className="coluna">
      <div className="linha envolve sem-imprimir">
        <input
          placeholder="Procurar exercício…"
          value={procura}
          onChange={(e) => setProcura(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <select value={pasta} onChange={(e) => setPasta(e.target.value)} style={{ width: 'auto' }}>
          <option value="todas">Todas as pastas</option>
          <option value="sem">Sem pasta</option>
          {listaPastas.map((p) => (
            <option key={p.id} value={p.id}>
              📁 {p.nome}
            </option>
          ))}
        </select>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaEx | 'Todas')}
          style={{ width: 'auto' }}
        >
          <option value="Todas">Todas as categorias</option>
          {CATEGORIAS_EX.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="espaco" />
        <Link to="/importar" className="btn">
          📥 Importar
        </Link>
        <button className="btn" onClick={novaPasta}>
          + Pasta
        </button>
        <button className="btn primario" onClick={() => setEdicao(exercicioNovo())}>
          + Exercício
        </button>
      </div>

      {listaPastas.length > 0 && (
        <div className="linha envolve" style={{ gap: 6 }}>
          {listaPastas.map((p) => {
            const n = lista.filter((e) => e.pastaId === p.id).length;
            return (
              <button
                key={p.id}
                className={'eti clicavel' + (pasta === p.id ? ' azul' : '')}
                style={{ cursor: 'pointer' }}
                onClick={() => setPasta(pasta === p.id ? 'todas' : p.id)}
                onDoubleClick={() => {
                  if (confirm(`Eliminar a pasta "${p.nome}"? Os exercícios não são apagados.`)) {
                    lista
                      .filter((e) => e.pastaId === p.id)
                      .forEach((e) => exercicios.atualizar(e.id, { pastaId: undefined }));
                    pastas.remover(p.id);
                    setPasta('todas');
                  }
                }}
                title="Duplo-clique para eliminar a pasta"
              >
                📁 {p.nome} · {n}
              </button>
            );
          })}
        </div>
      )}

      {!lista.length ? (
        <Vazio
          emo="⚽"
          titulo="Sem exercícios"
          texto="Cria exercícios com desenho no campo, ou importa os que já tens do teu dossier."
          acao={
            <div className="linha" style={{ justifyContent: 'center' }}>
              <Link to="/importar" className="btn">
                Importar existentes
              </Link>
              <button className="btn primario" onClick={() => setEdicao(exercicioNovo())}>
                Criar exercício
              </button>
            </div>
          }
        />
      ) : (
        <div className="grelha g3">
          {filtrados.map((e) => (
            <CartaoExercicio key={e.id} ex={e} aoAbrir={() => setVerId(e.id)} />
          ))}
        </div>
      )}
      {lista.length > 0 && !filtrados.length && (
        <p className="vazio mudo">Nenhum exercício corresponde aos filtros.</p>
      )}

      {edicao && (
        <EditorExercicio
          ex={edicao}
          aoFechar={() => setEdicao(null)}
          aoGuardar={(x) => {
            exercicios.guardar(x);
            setEdicao(null);
          }}
        />
      )}

      {aVer && (
        <VerExercicio
          ex={aVer}
          aoFechar={() => setVerId(null)}
          aoEditar={() => {
            setEdicao(aVer);
            setVerId(null);
          }}
        />
      )}
    </div>
  );
}

export function CartaoExercicio({ ex, aoAbrir }: { ex: Exercicio; aoAbrir: () => void }) {
  return (
    <button
      className="cartao clicavel"
      onClick={aoAbrir}
      style={{
        padding: 10,
        textAlign: 'left',
        cursor: 'pointer',
        font: 'inherit',
        color: 'inherit',
        display: 'block',
      }}
    >
      <div className="miniatura">
        {ex.imagem ? <img src={ex.imagem} alt="" /> : <VerDesenho desenho={ex.desenho} />}
      </div>
      <b className="truncar" style={{ display: 'block', marginTop: 8 }}>
        {ex.nome || 'Sem nome'}
      </b>
      <div className="linha envolve" style={{ gap: 4, marginTop: 6 }}>
        <span className="eti azul">{ex.categoria}</span>
        <span className="eti">{ex.duracaoMin}′</span>
        <span className="eti">Int. {ex.intensidade}</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------

function EditorExercicio({
  ex,
  aoFechar,
  aoGuardar,
}: {
  ex: Exercicio;
  aoFechar: () => void;
  aoGuardar: (e: Exercicio) => void;
}) {
  const [x, setX] = useState(ex);
  const listaPastas = useColecao<Pasta>('pastas');
  const [aba, setAba] = useState<'Desenho' | 'Ficha' | 'Detalhes'>('Desenho');
  const p = <K extends keyof Exercicio>(k: K, v: Exercicio[K]) =>
    setX((a) => ({ ...a, [k]: v }));

  return (
    <Modal
      titulo={ex.nome ? `Editar: ${ex.nome}` : 'Novo exercício'}
      aoFechar={aoFechar}
      largo
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            className="btn primario"
            disabled={!x.nome.trim()}
            onClick={() => aoGuardar(x)}
          >
            Guardar
          </button>
        </>
      }
    >
      <Abas abas={['Desenho', 'Ficha', 'Detalhes'] as const} ativa={aba} aoMudar={setAba} />

      {aba === 'Desenho' && (
        <div className="coluna">
          {x.imagem ? (
            <>
              <img
                src={x.imagem}
                alt=""
                style={{ width: '100%', borderRadius: 10, border: '1px solid var(--borda)' }}
              />
              <p className="mini">
                Este exercício usa uma imagem importada. Remove-a para desenhar no quadro tático.
              </p>
              <button className="btn perigo" onClick={() => p('imagem', undefined)}>
                Remover imagem e usar o quadro
              </button>
            </>
          ) : (
            <>
              <EditorQuadro desenho={x.desenho} aoMudar={(d) => p('desenho', d)} />
              <SelectorImagem
                label="…ou usar uma imagem em vez do desenho"
                valor={x.imagem}
                aoMudar={(v) => p('imagem', v)}
                max={1400}
              />
            </>
          )}
        </div>
      )}

      {aba === 'Ficha' && (
        <div className="forma">
          <Texto label="Nome do exercício" valor={x.nome} aoMudar={(v) => p('nome', v)} largo />
          <Escolha
            label="Categoria"
            valor={x.categoria}
            opcoes={CATEGORIAS_EX}
            aoMudar={(v) => p('categoria', v)}
          />
          <Escolha
            label="Pasta"
            valor={x.pastaId ?? ''}
            opcoes={[
              { v: '', t: '— sem pasta —' },
              ...listaPastas.map((f) => ({ v: f.id, t: f.nome })),
            ]}
            aoMudar={(v) => p('pastaId', v || undefined)}
          />
          <Area label="Objetivos" valor={x.objetivos} aoMudar={(v) => p('objetivos', v)} />
          <Area
            label="Descrição / organização"
            valor={x.descricao}
            aoMudar={(v) => p('descricao', v)}
            linhas={5}
          />
          <Area label="Regras / condicionantes" valor={x.regras} aoMudar={(v) => p('regras', v)} />
          <Area label="Variantes / progressões" valor={x.variantes} aoMudar={(v) => p('variantes', v)} />
          <Area label="Critérios de êxito" valor={x.criterios} aoMudar={(v) => p('criterios', v)} />
        </div>
      )}

      {aba === 'Detalhes' && (
        <div className="forma">
          <Texto
            label="Duração (min)"
            tipo="number"
            valor={x.duracaoMin}
            aoMudar={(v) => p('duracaoMin', Number(v) || 0)}
            min={1}
          />
          <Texto
            label="Séries"
            tipo="number"
            valor={x.series}
            aoMudar={(v) => p('series', v === '' ? undefined : Number(v))}
            min={1}
          />
          <Texto
            label="Repetições"
            valor={x.repeticoes}
            aoMudar={(v) => p('repeticoes', v)}
            placeholder="ex.: 4 x 3'"
          />
          <Texto
            label="Recuperação"
            valor={x.recuperacao}
            aoMudar={(v) => p('recuperacao', v)}
            placeholder="ex.: 90 s passiva"
          />
          <Texto
            label="Nº de jogadores"
            valor={x.numJogadores}
            aoMudar={(v) => p('numJogadores', v)}
            placeholder="ex.: 8+2 GR"
          />
          <Texto
            label="Espaço"
            valor={x.espaco}
            aoMudar={(v) => p('espaco', v)}
            placeholder="ex.: 40x30 m"
          />
          <Texto
            label="Material"
            valor={x.material}
            aoMudar={(v) => p('material', v)}
            placeholder="ex.: 8 cones, 4 coletes, 6 bolas"
          />
          <Intensidade valor={x.intensidade} aoMudar={(n) => p('intensidade', n)} />
          <Texto
            label="Etiquetas (separadas por vírgula)"
            valor={x.tags.join(', ')}
            aoMudar={(v) =>
              p(
                'tags',
                v
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              )
            }
            largo
          />
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

export function VerExercicio({
  ex,
  aoFechar,
  aoEditar,
}: {
  ex: Exercicio;
  aoFechar: () => void;
  aoEditar?: () => void;
}) {
  const campos: [string, string | undefined][] = [
    ['Objetivos', ex.objetivos],
    ['Descrição / organização', ex.descricao],
    ['Regras', ex.regras],
    ['Variantes', ex.variantes],
    ['Critérios de êxito', ex.criterios],
  ];
  const meta: [string, string | number | undefined][] = [
    ['Duração', `${ex.duracaoMin} min`],
    ['Séries', ex.series],
    ['Repetições', ex.repeticoes],
    ['Recuperação', ex.recuperacao],
    ['Jogadores', ex.numJogadores],
    ['Espaço', ex.espaco],
    ['Material', ex.material],
    ['Intensidade', `${ex.intensidade}/5`],
  ];

  return (
    <Modal
      titulo={ex.nome}
      aoFechar={aoFechar}
      largo
      rodape={
        <>
          <BotaoApagar
            aoConfirmar={() => {
              exercicios.remover(ex.id);
              aoFechar();
            }}
          />
          <div className="espaco" />
          <button
            className="btn"
            onClick={() => {
              exercicios.guardar({
                ...ex,
                id: novoId(),
                nome: `${ex.nome} (cópia)`,
                criadoEm: Date.now(),
              });
              aoFechar();
            }}
          >
            Duplicar
          </button>
          <button className="btn" onClick={() => window.print()}>
            Imprimir
          </button>
          {aoEditar && (
            <button className="btn primario" onClick={aoEditar}>
              Editar
            </button>
          )}
        </>
      }
    >
      <div className="miniatura" style={{ aspectRatio: 'auto', marginBottom: 14 }}>
        {ex.imagem ? <img src={ex.imagem} alt="" /> : <VerDesenho desenho={ex.desenho} />}
      </div>

      <div className="linha envolve" style={{ gap: 5, marginBottom: 12 }}>
        <span className="eti azul">{ex.categoria}</span>
        {ex.tags.map((t) => (
          <span key={t} className="eti">
            #{t}
          </span>
        ))}
      </div>

      <div className="grelha g4" style={{ marginBottom: 14 }}>
        {meta
          .filter(([, v]) => v !== undefined && v !== '' && v !== null)
          .map(([t, v]) => (
            <div className="cartao cartao-p" key={t}>
              <div className="mini">{t}</div>
              <b>{v}</b>
            </div>
          ))}
      </div>

      <div className="coluna">
        {campos
          .filter(([, v]) => v?.trim())
          .map(([t, v]) => (
            <div className="cartao cartao-p" key={t}>
              <h3 style={{ marginBottom: 5 }}>{t}</h3>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{v}</p>
            </div>
          ))}
      </div>
    </Modal>
  );
}

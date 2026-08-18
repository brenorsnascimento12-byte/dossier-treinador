import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatarCurto, hoje } from '../lib/datas';
import { Area, Campo, Escolha, Segmentado, Texto } from '../componentes/ui';
import { exercicios, novoId, pastas, sessoes, useColecao } from '../lib/store';
import type { PlanoTreino } from '../lib/dossier';
import {
  analisarTabela,
  analisarTexto,
  brutoParaExercicio,
  dividirTexto,
  linhaParaExercicio,
  mapearColunas,
  marcarRepetidos,
  representantes,
  type ChaveRepetido,
  type ExercicioBruto,
  type Separador,
} from '../lib/importar';
import {
  CATEGORIAS_EX,
  type BlocoSessao,
  type CategoriaEx,
  type Exercicio,
  type Pasta,
} from '../lib/types';

type Modo = 'PDF' | 'Imagens' | 'Texto' | 'Tabela';

/** Reduz uma imagem para caber confortavelmente no armazenamento local. */
function reduzirImagem(f: File, max = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const l = new FileReader();
    l.onerror = reject;
    l.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const e = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * e);
        c.height = Math.round(img.height * e);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = l.result as string;
    };
    l.readAsDataURL(f);
  });
}

export default function Importar() {
  const [modo, setModo] = useState<Modo>('PDF');
  const [revisao, setRevisao] = useState<ExercicioBruto[] | null>(null);
  const [planos, setPlanos] = useState<PlanoTreino[] | null>(null);
  const [chave, setChave] = useState<ChaveRepetido>('nome e conteúdo');
  const [criarSessoes, setCriarSessoes] = useState(true);
  const [pastaId, setPastaId] = useState('');
  const listaPastas = useColecao<Pasta>('pastas');
  const naBiblioteca = useColecao<Exercicio>('exercicios');
  const navegar = useNavigate();

  const escolherPasta = (v: string) => {
    if (v !== '__nova__') return setPastaId(v);
    const nome = prompt('Nome da pasta:', 'Importados');
    if (!nome?.trim()) return;
    const p = { id: novoId(), nome: nome.trim(), criadoEm: Date.now() };
    pastas.guardar(p);
    setPastaId(p.id);
  };

  const opcoesPasta = [
    { v: '', t: '— sem pasta —' },
    ...listaPastas.map((p) => ({ v: p.id, t: p.nome })),
    { v: '__nova__', t: '+ Nova pasta…' },
  ];

  // ---------------------------------------------------------------- planos
  if (planos) {
    return (
      <RevisaoPlanos
        planos={planos}
        chave={chave}
        aoMudarChave={setChave}
        criarSessoes={criarSessoes}
        aoMudarCriarSessoes={setCriarSessoes}
        naBiblioteca={naBiblioteca}
        pastaId={pastaId}
        opcoesPasta={opcoesPasta}
        aoEscolherPasta={escolherPasta}
        aoCancelar={() => setPlanos(null)}
        aoConcluir={(destino) => {
          setPlanos(null);
          navegar(destino);
        }}
      />
    );
  }

  // ---------------------------------------------------------- exercicios soltos
  if (revisao) {
    const n = revisao.filter((b) => b.incluir).length;
    const importar = () => {
      for (const b of revisao.filter((x) => x.incluir))
        exercicios.guardar(brutoParaExercicio(b, pastaId || undefined));
      setRevisao(null);
      navegar('/exercicios');
    };

    return (
      <div className="coluna">
        <div className="cartao cartao-p linha envolve">
          <div>
            <h2>Rever antes de importar</h2>
            <p className="mudo" style={{ margin: 0 }}>
              {n} de {revisao.length} selecionados. Corrige o que estiver mal — depois é sempre
              editável na biblioteca.
            </p>
          </div>
          <div className="espaco" />
          <Escolha
            label="Guardar na pasta"
            valor={pastaId}
            opcoes={opcoesPasta}
            aoMudar={escolherPasta}
          />
          <button className="btn" onClick={() => setRevisao(null)}>
            Cancelar
          </button>
          <button className="btn primario" disabled={!n} onClick={importar}>
            Importar {n} exercícios
          </button>
        </div>

        <div className="linha envolve sem-imprimir">
          <button
            className="btn pq"
            onClick={() => setRevisao(revisao.map((b) => ({ ...b, incluir: true })))}
          >
            Selecionar todos
          </button>
          <button
            className="btn pq fantasma"
            onClick={() => setRevisao(revisao.map((b) => ({ ...b, incluir: false })))}
          >
            Nenhum
          </button>
        </div>

        <div className="coluna">
          {revisao.map((b, i) => (
            <FichaRevisao
              key={i}
              b={b}
              aoMudar={(novo) => setRevisao(revisao.map((x, j) => (j === i ? novo : x)))}
            />
          ))}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ escolha
  return (
    <div className="coluna">
      <div className="cartao cartao-p">
        <h2 style={{ marginBottom: 6 }}>Importar o que já tens</h2>
        <p className="mudo" style={{ marginBottom: 0 }}>
          Tudo é processado no teu dispositivo — nenhum ficheiro é enviado para lado nenhum.
          Escolhe o formato que consegues obter da tua aplicação atual.
        </p>
      </div>

      <div className="linha sem-imprimir">
        <Segmentado
          opcoes={['PDF', 'Imagens', 'Texto', 'Tabela'] as const}
          valor={modo}
          aoMudar={setModo}
        />
      </div>

      {modo === 'PDF' && <ModoPdf aoConcluirPlanos={setPlanos} aoConcluir={setRevisao} />}
      {modo === 'Imagens' && <ModoImagens aoConcluir={setRevisao} />}
      {modo === 'Texto' && <ModoTexto aoConcluir={setRevisao} />}
      {modo === 'Tabela' && <ModoTabela aoConcluir={setRevisao} />}
    </div>
  );
}


// ---------------------------------------------------------------------------

/**
 * Revisão dos planos de treino lidos.
 *
 * O mesmo exercício repete-se muito entre planos (o aquecimento é quase sempre
 * o mesmo), por isso importamos cada um uma só vez e as sessões apontam todas
 * para essa cópia única.
 */
function RevisaoPlanos({
  planos,
  chave,
  aoMudarChave,
  criarSessoes,
  aoMudarCriarSessoes,
  naBiblioteca,
  pastaId,
  opcoesPasta,
  aoEscolherPasta,
  aoCancelar,
  aoConcluir,
}: {
  planos: PlanoTreino[];
  chave: ChaveRepetido;
  aoMudarChave: (c: ChaveRepetido) => void;
  criarSessoes: boolean;
  aoMudarCriarSessoes: (v: boolean) => void;
  naBiblioteca: Exercicio[];
  pastaId: string;
  opcoesPasta: { v: string; t: string }[];
  aoEscolherPasta: (v: string) => void;
  aoCancelar: () => void;
  aoConcluir: (destino: string) => void;
}) {
  // Todos os exercícios de todos os planos, achatados e pela ordem do papel.
  const achatado = useMemo(
    () => planos.flatMap((p, iPlano) => p.exercicios.map((e) => ({ ...e, iPlano }))),
    [planos],
  );

  const [marcados, setMarcados] = useState<(ExercicioBruto & { iPlano?: number })[]>([]);
  const [reps, setReps] = useState<number[]>([]);

  // Recalcula sempre que a regra de comparação muda.
  useEffect(() => {
    setMarcados(marcarRepetidos(achatado, naBiblioteca, chave));
    setReps(representantes(achatado, chave));
    // A biblioteca só interessa no arranque: não queremos remarcar a meio da revisão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achatado, chave]);

  const unicos = marcados.map((b, i) => ({ b, i })).filter(({ i }) => reps[i] === i);
  const aImportar = unicos.filter(({ b }) => b.incluir).length;
  const jaExistiam = marcados.filter((b) => b.repetido === 'biblioteca').length;
  const repetidosNoLote = marcados.filter((b) => b.repetido === 'lote').length;
  const semData = planos.filter((p) => !p.data).length;

  function importar() {
    // 1) Cria os exercícios distintos e guarda o id de cada posição do lote.
    const idPorIndice = new Map<number, string>();
    for (const { b, i } of unicos) {
      if (!b.incluir) continue;
      const ex = brutoParaExercicio(b, pastaId || undefined);
      exercicios.guardar(ex);
      idPorIndice.set(i, ex.id);
    }

    // 2) Cria uma sessão por plano, a apontar para os exercícios criados.
    if (criarSessoes) {
      let n = 0;
      for (const [iPlano, plano] of planos.entries()) {
        const blocos: BlocoSessao[] = [];
        marcados.forEach((b, i) => {
          if (b.iPlano !== iPlano) return;
          blocos.push({
            id: novoId(),
            exercicioId: idPorIndice.get(reps[i]),
            titulo: b.nome,
            duracaoMin: b.duracaoMin ?? 0,
            parte: blocos.length === 0 ? 'Inicial' : 'Fundamental',
          });
        });
        if (!blocos.length) continue;

        const notas = [
          plano.microciclo && `Microciclo ${plano.microciclo}`,
          plano.mesociclo && `Mesociclo ${plano.mesociclo}`,
          plano.periodo,
          plano.volume && `Volume ${plano.volume}`,
          plano.material && `Material: ${plano.material}`,
          plano.objetivosEspecificos &&
            `Objetivos específicos:\n${plano.objetivosEspecificos}`,
        ]
          .filter(Boolean)
          .join('\n');

        sessoes.guardar({
          id: novoId(),
          numero: ++n,
          data: plano.data ?? hoje(),
          hora: plano.hora,
          objetivoGeral: plano.objetivosGerais,
          blocos,
          presencas: {},
          cargaPrevista: 3,
          observacoes: notas || undefined,
          criadoEm: Date.now(),
        });
      }
    }

    aoConcluir(criarSessoes ? '/treinos' : '/exercicios');
  }

  return (
    <div className="coluna">
      <div className="cartao cartao-p coluna">
        <div className="linha envolve">
          <div>
            <h2>
              {planos.length} planos lidos · {achatado.length} exercícios
            </h2>
            <p className="mudo" style={{ margin: 0 }}>
              <b>{aImportar}</b> exercícios distintos a importar
              {repetidosNoLote > 0 && ` · ${repetidosNoLote} repetições entre planos`}
              {jaExistiam > 0 && ` · ${jaExistiam} já estavam na biblioteca`}
            </p>
          </div>
          <div className="espaco" />
          <button className="btn" onClick={aoCancelar}>
            Cancelar
          </button>
          <button
            className="btn primario"
            disabled={!aImportar && !criarSessoes}
            onClick={importar}
          >
            Importar
          </button>
        </div>

        <div className="forma">
          <Escolha
            label="Considerar repetido quando coincide"
            valor={chave}
            opcoes={['nome e conteúdo', 'nome'] as ChaveRepetido[]}
            aoMudar={aoMudarChave}
          />
          <Escolha
            label="Guardar exercícios na pasta"
            valor={pastaId}
            opcoes={opcoesPasta}
            aoMudar={aoEscolherPasta}
          />
          <Campo label="Sessões de treino">
            <label className="linha" style={{ gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={criarSessoes}
                onChange={(e) => aoMudarCriarSessoes(e.target.checked)}
              />
              <span className="mini">Criar também uma sessão por plano</span>
            </label>
          </Campo>
        </div>

        <p className="mini" style={{ margin: 0 }}>
          {chave === 'nome'
            ? 'Exercícios com o mesmo nome contam como o mesmo, mesmo que a descrição mude.'
            : 'Só contam como repetidos os que têm o mesmo nome e o mesmo conteúdo.'}
          {semData > 0 &&
            ` ${semData} ${semData === 1 ? 'plano não tinha' : 'planos não tinham'} data preenchida — essas sessões ficam com a data de hoje.`}
        </p>
      </div>

      {criarSessoes && (
        <div className="cartao">
          <div className="cartao-p" style={{ paddingBottom: 4 }}>
            <h3>Sessões que vão ser criadas</h3>
          </div>
          <div className="rolar" style={{ maxHeight: 260 }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ficheiro</th>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Exercícios</th>
                </tr>
              </thead>
              <tbody>
                {planos.map((p) => (
                  <tr key={p.ficheiro}>
                    <td className="truncar">{p.ficheiro}</td>
                    <td>
                      {p.data ? (
                        formatarCurto(p.data)
                      ) : (
                        <span className="eti amarelo">sem data</span>
                      )}
                    </td>
                    <td className="mudo">{p.hora ?? '—'}</td>
                    <td>{p.exercicios.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h3>Exercícios distintos ({unicos.length})</h3>
      <div className="coluna">
        {unicos.map(({ b, i }) => (
          <FichaRevisao
            key={i}
            b={b}
            vezes={reps.filter((r) => r === i).length}
            aoMudar={(novo) => setMarcados(marcados.map((x, j) => (j === i ? { ...x, ...novo } : x)))}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ModoPdf({
  aoConcluirPlanos,
  aoConcluir,
}: {
  aoConcluirPlanos: (p: PlanoTreino[]) => void;
  aoConcluir: (b: ExercicioBruto[]) => void;
}) {
  const [estado, setEstado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  async function abrir(files: File[]) {
    setErro(null);
    setEstado('A abrir…');
    try {
      // O pdf.js só é descarregado quando alguém importa mesmo um PDF.
      const { lerPdf, recortar } = await import('../lib/pdf');
      const { analisarPlano, pareceDossier } = await import('../lib/dossier');

      const planos: PlanoTreino[] = [];
      const soltos: ExercicioBruto[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setEstado(`A ler ${i + 1} de ${files.length}: ${f.name}`);
        let paginas;
        try {
          paginas = await lerPdf(f);
        } catch (e) {
          // Um ficheiro problemático não deve travar os restantes.
          console.warn(`Ignorado ${f.name}:`, e);
          continue;
        }
        if (!paginas.length) continue;

        if (pareceDossier(paginas)) {
          const plano = analisarPlano(paginas, f.name);
          for (const ex of plano.exercicios) {
            if (!ex.recorte) continue;
            const pg = paginas.find((p) => p.numero === ex.recorte!.pagina);
            if (pg) ex.imagem = await recortar(pg.pagina, pg.largura, ex.recorte);
          }
          planos.push(plano);
        } else {
          // Formato desconhecido: uma página, um exercício.
          for (const p of paginas) {
            const b = analisarTexto(p.texto);
            b.imagem = p.imagem || p.pagina;
            if (!b.nome.trim()) b.nome = `${f.name} — página ${p.numero}`;
            soltos.push(b);
          }
        }
      }

      setEstado(null);
      if (planos.length) aoConcluirPlanos(planos);
      else if (soltos.length) aoConcluir(soltos);
      else setErro('Não consegui ler nenhum exercício destes ficheiros.');
    } catch (e) {
      setEstado(null);
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="cartao cartao-p coluna">
      <p className="mudo">
        Escolhe os <b>planos de treino em PDF</b> exportados do Dossier do Treinador — podes
        selecionar dezenas de uma vez. Cada plano vira uma sessão de treino, e os exercícios que
        lá estão vão para a tua biblioteca com o desenho, os objetivos e a descrição. Os
        exercícios repetidos entre planos são detetados e importados uma só vez.
      </p>

      <div className="linha envolve">
        <button
          className="btn primario"
          disabled={!!estado}
          onClick={() => ref.current?.click()}
        >
          {estado ? 'A processar…' : 'Escolher ficheiros PDF'}
        </button>
        {estado && <span className="mudo">{estado}</span>}
        <input
          ref={ref}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            const f = Array.from(e.target.files ?? []);
            if (f.length) abrir(f);
            e.target.value = '';
          }}
        />
      </div>

      {erro && (
        <div
          className="cartao cartao-p"
          style={{ background: 'var(--perigo-suave)', borderColor: 'transparent' }}
        >
          <b>Não foi possível ler:</b>
          <p className="mini" style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
            {erro}
          </p>
        </div>
      )}

      <p className="mini">
        Se o PDF não for do Dossier do Treinador, cada página é tratada como um exercício.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ModoImagens({ aoConcluir }: { aoConcluir: (b: ExercicioBruto[]) => void }) {
  const [ocupado, setOcupado] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function escolher(files: FileList) {
    setOcupado(true);
    const brutos: ExercicioBruto[] = [];
    for (const f of Array.from(files)) {
      const imagem = await reduzirImagem(f);
      brutos.push({
        nome: f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim(),
        imagem,
        incluir: true,
      });
    }
    setOcupado(false);
    aoConcluir(brutos);
  }

  return (
    <div className="cartao cartao-p coluna">
      <p className="mudo">
        Tens os exercícios em imagens ou capturas de ecrã? Escolhe-as todas de uma vez — cada
        imagem vira um exercício, já com o desenho. Depois é só dar nome e preencher o que
        interessar. O nome do ficheiro é usado como nome inicial.
      </p>
      <button
        className="btn primario"
        disabled={ocupado}
        onClick={() => ref.current?.click()}
        style={{ alignSelf: 'start' }}
      >
        {ocupado ? 'A processar…' : 'Escolher imagens'}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) escolher(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ModoTexto({ aoConcluir }: { aoConcluir: (b: ExercicioBruto[]) => void }) {
  const [texto, setTexto] = useState('');
  const [sep, setSep] = useState<Separador>('rótulo de nome');

  const previsao = texto.trim()
    ? dividirTexto(texto, sep).filter((b) => b.trim()).length
    : 0;

  return (
    <div className="cartao cartao-p coluna">
      <p className="mudo">
        Cola aqui o texto dos exercícios (de um Word, de um PDF, do site). A app procura rótulos
        como <b>Objetivos:</b>, <b>Descrição:</b>, <b>Material:</b>, <b>Duração:</b> e arruma cada
        parte no campo certo.
      </p>

      <Escolha
        label="Separar exercícios por"
        valor={sep}
        opcoes={['rótulo de nome', 'traços', 'linha em branco'] as Separador[]}
        aoMudar={setSep}
      />

      <Area
        label="Texto dos exercícios"
        valor={texto}
        aoMudar={setTexto}
        linhas={16}
        placeholder={`Nome: Rondo 5x2\nObjetivos: Circulação rápida de bola sob pressão\nDescrição: Cinco jogadores em círculo, dois no meio...\nEspaço: 12x12 m\nDuração: 12 min\nMaterial: 6 coletes, 4 bolas\n\nNome: Finalização em zona\nObjetivos: ...`}
      />

      <div className="linha">
        <span className="eti">{previsao} exercícios detetados</span>
        <div className="espaco" />
        <button
          className="btn primario"
          disabled={!previsao}
          onClick={() =>
            aoConcluir(
              dividirTexto(texto, sep)
                .filter((b) => b.trim())
                .map(analisarTexto),
            )
          }
        >
          Continuar para revisão
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ModoTabela({ aoConcluir }: { aoConcluir: (b: ExercicioBruto[]) => void }) {
  const [texto, setTexto] = useState('');
  const linhas = texto.trim() ? analisarTabela(texto) : [];
  const cabecalho = linhas[0] ?? [];
  const [mapa, setMapa] = useState<string[]>([]);
  const mapaEfetivo = mapa.length === cabecalho.length ? mapa : mapearColunas(cabecalho);

  const CAMPOS = [
    { v: '', t: '— ignorar —' },
    { v: 'nome', t: 'Nome' },
    { v: 'categoria', t: 'Categoria' },
    { v: 'objetivos', t: 'Objetivos' },
    { v: 'descricao', t: 'Descrição' },
    { v: 'regras', t: 'Regras' },
    { v: 'variantes', t: 'Variantes' },
    { v: 'criterios', t: 'Critérios de êxito' },
    { v: 'duracaoMin', t: 'Duração' },
    { v: 'series', t: 'Séries' },
    { v: 'repeticoes', t: 'Repetições' },
    { v: 'recuperacao', t: 'Recuperação' },
    { v: 'numJogadores', t: 'Nº jogadores' },
    { v: 'espaco', t: 'Espaço' },
    { v: 'material', t: 'Material' },
  ];

  return (
    <div className="cartao cartao-p coluna">
      <p className="mudo">
        Se conseguires exportar uma lista para Excel ou CSV, abre-a, copia as células (com a linha
        de cabeçalho) e cola aqui. A app deteta o separador e tenta associar as colunas sozinha.
      </p>

      <Area
        label="Cola aqui a tabela (CSV, ponto-e-vírgula ou colado do Excel)"
        valor={texto}
        aoMudar={(v) => {
          setTexto(v);
          setMapa([]);
        }}
        linhas={8}
      />

      {cabecalho.length > 0 && (
        <>
          <h3>Colunas detetadas</h3>
          <div className="grelha g3">
            {cabecalho.map((h, i) => (
              <Campo key={i} label={h || `Coluna ${i + 1}`}>
                <select
                  value={mapaEfetivo[i] ?? ''}
                  onChange={(e) => {
                    const novo = [...mapaEfetivo];
                    novo[i] = e.target.value;
                    setMapa(novo);
                  }}
                >
                  {CAMPOS.map((c) => (
                    <option key={c.v} value={c.v}>
                      {c.t}
                    </option>
                  ))}
                </select>
              </Campo>
            ))}
          </div>
          <div className="linha">
            <span className="eti">{Math.max(0, linhas.length - 1)} linhas de dados</span>
            <div className="espaco" />
            <button
              className="btn primario"
              disabled={linhas.length < 2 || !mapaEfetivo.includes('nome')}
              onClick={() =>
                aoConcluir(
                  linhas
                    .slice(1)
                    .map((l) => linhaParaExercicio(l, mapaEfetivo as never))
                    .filter((b) => b.nome.trim()),
                )
              }
            >
              Continuar para revisão
            </button>
          </div>
          {!mapaEfetivo.includes('nome') && (
            <p className="mini" style={{ color: 'var(--perigo)' }}>
              Escolhe qual é a coluna do <b>Nome</b>.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FichaRevisao({
  b,
  aoMudar,
  vezes,
}: {
  b: ExercicioBruto;
  aoMudar: (b: ExercicioBruto) => void;
  /** Quantas vezes este exercicio aparece nos planos importados. */
  vezes?: number;
}) {
  const [expandido, setExpandido] = useState(false);
  const p = <K extends keyof ExercicioBruto>(k: K, v: ExercicioBruto[K]) =>
    aoMudar({ ...b, [k]: v });

  return (
    <div
      className="cartao cartao-p"
      style={{ opacity: b.incluir ? 1 : 0.5, borderColor: b.incluir ? 'var(--acento)' : undefined }}
    >
      <div className="linha linha-topo" style={{ gap: 12 }}>
        <input
          type="checkbox"
          checked={b.incluir}
          onChange={(e) => p('incluir', e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 6 }}
        />
        {b.imagem && (
          <div style={{ width: 110, flex: '0 0 110px' }}>
            <div className="miniatura">
              <img src={b.imagem} alt="" />
            </div>
          </div>
        )}
        <div className="coluna" style={{ flex: 1, minWidth: 0, gap: 8 }}>
          {(vezes ?? 0) > 1 && (
            <span className="eti azul" style={{ alignSelf: 'flex-start' }}>
              Usado em {vezes} sessoes
            </span>
          )}
          <div className="forma">
            <Texto label="Nome" valor={b.nome} aoMudar={(v) => p('nome', v)} largo />
            <Escolha
              label="Categoria"
              valor={b.categoria ?? 'Posse de bola'}
              opcoes={CATEGORIAS_EX}
              aoMudar={(v) => p('categoria', v as CategoriaEx)}
            />
            <Texto
              label="Duração (min)"
              tipo="number"
              valor={b.duracaoMin ?? ''}
              aoMudar={(v) => p('duracaoMin', v === '' ? undefined : Number(v))}
            />
          </div>

          <button className="btn pq fantasma" onClick={() => setExpandido(!expandido)} style={{ alignSelf: 'start' }}>
            {expandido ? '▾ Menos' : '▸ Ver e corrigir todos os campos'}
          </button>

          {expandido && (
            <div className="forma">
              <Area label="Objetivos" valor={b.objetivos} aoMudar={(v) => p('objetivos', v)} />
              <Area
                label="Descrição"
                valor={b.descricao}
                aoMudar={(v) => p('descricao', v)}
                linhas={5}
              />
              <Area label="Regras" valor={b.regras} aoMudar={(v) => p('regras', v)} />
              <Area label="Variantes" valor={b.variantes} aoMudar={(v) => p('variantes', v)} />
              <Area label="Critérios de êxito" valor={b.criterios} aoMudar={(v) => p('criterios', v)} />
              <Texto label="Nº jogadores" valor={b.numJogadores} aoMudar={(v) => p('numJogadores', v)} />
              <Texto label="Espaço" valor={b.espaco} aoMudar={(v) => p('espaco', v)} />
              <Texto label="Material" valor={b.material} aoMudar={(v) => p('material', v)} />
              <Texto label="Repetições" valor={b.repeticoes} aoMudar={(v) => p('repeticoes', v)} />
              <Texto label="Recuperação" valor={b.recuperacao} aoMudar={(v) => p('recuperacao', v)} />
              {b.textoOriginal && (
                <Campo label="Texto original lido (para conferires)" largo>
                  <textarea readOnly rows={6} value={b.textoOriginal} className="mono" />
                </Campo>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, Campo, Escolha, Segmentado, Texto } from '../componentes/ui';
import { exercicios, novoId, pastas, useColecao } from '../lib/store';
import type { PaginaPdf } from '../lib/pdf';
import {
  analisarTabela,
  analisarTexto,
  brutoParaExercicio,
  dividirTexto,
  linhaParaExercicio,
  mapearColunas,
  type ExercicioBruto,
  type Separador,
} from '../lib/importar';
import { CATEGORIAS_EX, type CategoriaEx, type Pasta } from '../lib/types';

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
  const [pastaId, setPastaId] = useState('');
  const listaPastas = useColecao<Pasta>('pastas');
  const navegar = useNavigate();

  function importar() {
    const escolhidos = (revisao ?? []).filter((b) => b.incluir);
    if (!escolhidos.length) return;
    for (const b of escolhidos) exercicios.guardar(brutoParaExercicio(b, pastaId || undefined));
    setRevisao(null);
    navegar('/exercicios');
  }

  if (revisao) {
    const n = revisao.filter((b) => b.incluir).length;
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
            opcoes={[
              { v: '', t: '— sem pasta —' },
              ...listaPastas.map((p) => ({ v: p.id, t: p.nome })),
              { v: '__nova__', t: '+ Nova pasta…' },
            ]}
            aoMudar={(v) => {
              if (v === '__nova__') {
                const nome = prompt('Nome da pasta:', 'Importados');
                if (nome?.trim()) {
                  const p = { id: novoId(), nome: nome.trim(), criadoEm: Date.now() };
                  pastas.guardar(p);
                  setPastaId(p.id);
                }
              } else setPastaId(v);
            }}
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

  return (
    <div className="coluna">
      <div className="cartao cartao-p">
        <h2 style={{ marginBottom: 6 }}>Importar exercícios que já tens</h2>
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

      {modo === 'PDF' && <ModoPdf aoConcluir={setRevisao} />}
      {modo === 'Imagens' && <ModoImagens aoConcluir={setRevisao} />}
      {modo === 'Texto' && <ModoTexto aoConcluir={setRevisao} />}
      {modo === 'Tabela' && <ModoTabela aoConcluir={setRevisao} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ModoPdf({ aoConcluir }: { aoConcluir: (b: ExercicioBruto[]) => void }) {
  const [estado, setEstado] = useState<string | null>(null);
  const [paginas, setPaginas] = useState<PaginaPdf[] | null>(null);
  const [usarRecorte, setUsarRecorte] = useState(true);
  const ref = useRef<HTMLInputElement>(null);

  async function abrir(f: File) {
    setEstado('A abrir o PDF…');
    try {
      // O pdf.js só é descarregado quando alguém importa mesmo um PDF.
      const { lerPdf } = await import('../lib/pdf');
      const p = await lerPdf(f, (feito, total) => setEstado(`A ler página ${feito} de ${total}…`));
      setPaginas(p);
      setEstado(null);
    } catch (e) {
      setEstado(`Não foi possível ler o PDF: ${e instanceof Error ? e.message : e}`);
    }
  }

  function converter() {
    if (!paginas) return;
    const brutos = paginas
      .map((p) => {
        const b = analisarTexto(p.texto);
        b.imagem = (usarRecorte && p.imagem) || p.pagina;
        b.incluir = !!p.texto.trim();
        if (!b.nome.trim()) b.nome = `Exercício — página ${p.numero}`;
        return b;
      })
      .filter((b) => b.textoOriginal?.trim() || b.imagem);
    aoConcluir(brutos);
  }

  return (
    <div className="cartao cartao-p coluna">
      <p className="mudo">
        No Dossier do Treinador (ou noutra app), imprime ou exporta os exercícios para PDF —
        normalmente <b>uma ficha por página</b>. Aqui, cada página vira um exercício: o texto é
        lido e distribuído pelos campos, e o desenho fica como imagem.
      </p>

      <div className="linha envolve">
        <button className="btn primario" onClick={() => ref.current?.click()}>
          Escolher ficheiro PDF
        </button>
        {estado && <span className="mudo">{estado}</span>}
        <input
          ref={ref}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) abrir(f);
            e.target.value = '';
          }}
        />
      </div>

      {paginas && (
        <>
          <div className="linha envolve">
            <span className="eti verde">{paginas.length} páginas lidas</span>
            <label className="linha" style={{ gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={usarRecorte}
                onChange={(e) => setUsarRecorte(e.target.checked)}
              />
              <span className="mini">
                Usar só o desenho quando for detetado (senão, a página inteira)
              </span>
            </label>
            <div className="espaco" />
            <button className="btn primario" onClick={converter}>
              Continuar para revisão
            </button>
          </div>

          <div className="grelha g4">
            {paginas.slice(0, 8).map((p) => (
              <div className="cartao cartao-p" key={p.numero}>
                <div className="miniatura">
                  <img src={(usarRecorte && p.imagem) || p.pagina} alt={`Página ${p.numero}`} />
                </div>
                <div className="mini" style={{ marginTop: 6 }}>
                  Página {p.numero} · {p.texto.split('\n').length} linhas de texto
                </div>
              </div>
            ))}
          </div>
          {paginas.length > 8 && <p className="mini">…e mais {paginas.length - 8} páginas.</p>}
        </>
      )}
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
}: {
  b: ExercicioBruto;
  aoMudar: (b: ExercicioBruto) => void;
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

import type { ItemTexto, PaginaPdf } from './pdf';
import type { ExercicioBruto } from './importar';

/**
 * Leitor do formato "Plano de Treino" exportado pelo Dossier do Treinador.
 *
 * O PDF nao e uma ficha por pagina: e uma sessao inteira, com os exercicios
 * dispostos em duas colunas e blocos que continuam na pagina seguinte. Ler o
 * texto linha a linha cola as colunas uma na outra, por isso aqui trabalhamos
 * com as coordenadas de cada fragmento.
 *
 * Estrutura de cada celula de exercicio, de cima para baixo:
 *   titulo -> desenho -> caixas (tempo, jogadores, series, espaco) ->
 *   "Objetivo(s) especifico(s)" -> "Descricao e Organizacao Metodologica"
 */

const RE_OBJETIVOS = /^objetivo\(s\)\s*espec/i;
const RE_DESCRICAO = /^descri[cç][aã]o\s+e\s+organiza/i;
const RE_FIM = /^observa[cç][oõ]es\s*\/\s*balan/i;
const ACENTOS = /[̀-ͯ]/g;

/** Rotulos do cabecalho, que nunca sao titulos de exercicio. */
const ROTULOS_CABECALHO = [
  'no jogadores',
  'n jogadores',
  'microciclo',
  'mesociclo',
  'periodo',
  'data',
  'hora',
  'clima',
  'volume',
  'material',
  'objetivos gerais',
  'objetivos especificos',
  'plano de treino',
];

export interface PlanoTreino {
  ficheiro: string;
  clube?: string;
  data?: string;
  hora?: string;
  microciclo?: string;
  mesociclo?: string;
  periodo?: string;
  numJogadores?: string;
  volume?: string;
  material?: string;
  objetivosGerais?: string;
  objetivosEspecificos?: string;
  exercicios: ExercicioBruto[];
}

/** Um fragmento com a pagina a que pertence e uma altura continua entre paginas. */
interface Frag extends ItemTexto {
  pagina: number;
  /** Cresce de cima para baixo e ao longo das paginas, para ordenar tudo de uma vez. */
  ordem: number;
}

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(ACENTOS, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function pareceDossier(paginas: PaginaPdf[]): boolean {
  return paginas.some(
    (p) => RE_DESCRICAO.test(p.texto) || /dossierdotreinador/i.test(p.texto),
  );
}

function fragmentos(paginas: PaginaPdf[]): Frag[] {
  const out: Frag[] = [];
  paginas.forEach((p, i) => {
    for (const it of p.itens) {
      out.push({ ...it, pagina: p.numero, ordem: i * 100000 + (p.altura - it.y) });
    }
  });
  return out.sort((a, b) => a.ordem - b.ordem || a.x - b.x);
}

/** Junta fragmentos em linhas de texto legiveis, pela ordem em que aparecem. */
function texto(frags: Frag[]): string {
  const linhas: { ordem: number; partes: Frag[] }[] = [];
  for (const f of frags) {
    const l = linhas.find((x) => Math.abs(x.ordem - f.ordem) < 4);
    if (l) l.partes.push(f);
    else linhas.push({ ordem: f.ordem, partes: [f] });
  }
  return linhas
    .sort((a, b) => a.ordem - b.ordem)
    .map((l) =>
      l.partes
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}

/** Agrupa as caixas de metadados por proximidade horizontal. */
function caixas(frags: Frag[]): string[] {
  const grupos: { x: number; partes: Frag[] }[] = [];
  for (const f of [...frags].sort((a, b) => a.x - b.x || a.ordem - b.ordem)) {
    const g = grupos.find((x) => Math.abs(x.x - f.x) < 32);
    if (g) g.partes.push(f);
    else grupos.push({ x: f.x, partes: [f] });
  }
  return grupos
    .sort((a, b) => a.x - b.x)
    .map((g) =>
      g.partes
        .sort((a, b) => a.ordem - b.ordem)
        .map((p) => p.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/\s*\+\s*$/, '')
        .trim(),
    )
    .filter(Boolean);
}

/**
 * Converte uma expressao de series em minutos.
 * Ex.: "9 x 1'30\" + 20\"" -> 9 series de 110 s -> 17 min.
 * Muitos exercicios nao trazem duracao total, so o esquema de series.
 */
export function duracaoDeSeries(expr?: string): number | undefined {
  if (!expr) return undefined;
  const m = expr.match(/^\s*(\d{1,2})\s*[x×]\s*(.+)$/i);
  if (!m) return undefined;
  // O multiplicador nao pode ele proprio ser um tempo ("10' x 10'" e ambiguo).
  if (/['"]/.test(m[1])) return undefined;
  const series = Number(m[1]);
  const resto = m[2];

  // minutos e segundos: 1'30"  |  2'  |  45"
  const min = [...resto.matchAll(/(\d{1,3})\s*'/g)].reduce((a, x) => a + Number(x[1]) * 60, 0);
  const seg = [...resto.matchAll(/(\d{1,3})\s*"/g)].reduce((a, x) => a + Number(x[1]), 0);
  const segundos = min + seg;
  if (!segundos) return undefined;
  return Math.round((series * segundos) / 60);
}

/** Distribui as caixas pelos campos certos, pelo formato do conteudo. */
function interpretarCaixas(cx: string[]) {
  const out: {
    duracaoMin?: number;
    repeticoes?: string;
    numJogadores?: string;
    espaco?: string;
    sobra: string[];
  } = { sobra: [] };

  for (const c of cx) {
    const t = c.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (!out.duracaoMin && /^\d{1,3}\s*'$/.test(t)) {
      out.duracaoMin = Number(t.replace(/\D/g, ''));
      continue;
    }
    if (!out.repeticoes && /['"]/.test(t) && /x/i.test(t)) {
      out.repeticoes = t;
      continue;
    }
    if (!out.numJogadores && /\d+\s*x\s*\d+\s*x\s*\d+/i.test(t)) {
      out.numJogadores = t;
      continue;
    }
    if (!out.espaco && /^\d{1,3}\s*x\s*\d{1,3}$/i.test(t)) {
      out.espaco = t;
      continue;
    }
    if (!out.numJogadores && /^\d{1,3}(\s*\+\s*\d+\s*GR)?$/i.test(t)) {
      out.numJogadores = t;
      continue;
    }
    // Espacos compostos, como "20 + 5 + 20 x 40" (corredores por zonas).
    if (!out.espaco && /\d\s*[x×]\s*\d/i.test(t) && !/['"]/.test(t)) {
      out.espaco = t;
      continue;
    }
    out.sobra.push(t);
  }
  return out;
}

/** "28-07-2025, segunda-feira" -> "2025-07-28" */
export function dataParaIso(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (!m) return undefined;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** Le o cabecalho da sessao: data, hora, ciclos, material e objetivos. */
function lerCabecalho(frags: Frag[], limite: number, largura: number) {
  const cab = frags.filter((f) => f.ordem < limite);

  const rotulo = (nome: string) => {
    const alvo = normalizar(nome);
    return cab.find((f) => normalizar(f.str) === alvo);
  };

  /**
   * Valor escrito a direita do rotulo, na mesma linha. Se o campo estiver
   * vazio, o item seguinte e o rotulo a seguir — nesse caso nao ha valor.
   */
  const valor = (nome: string): string | undefined => {
    const l = rotulo(nome);
    if (!l) return undefined;
    const seguinte = cab
      .filter((f) => Math.abs(f.ordem - l.ordem) < 4 && f.x > l.x + l.largura - 2)
      .sort((a, b) => a.x - b.x)[0];
    if (!seguinte) return undefined;
    if (ROTULOS_CABECALHO.includes(normalizar(seguinte.str))) return undefined;
    return seguinte.str.trim();
  };

  /** Bloco de texto por baixo do rotulo, sem invadir a coluna seguinte. */
  const bloco = (nome: string): string | undefined => {
    const l = rotulo(nome);
    if (!l) return undefined;
    const direita = cab
      .filter((f) => Math.abs(f.ordem - l.ordem) < 4 && f.x > l.x + 4)
      .sort((a, b) => a.x - b.x)[0];
    const limiteX = direita ? direita.x - 4 : largura;
    return (
      cab
        .filter((f) => f.ordem > l.ordem + 2 && f.x >= l.x - 4 && f.x < limiteX)
        .sort((a, b) => a.ordem - b.ordem)
        .map((f) => f.str.trim())
        .join('\n')
        .trim() || undefined
    );
  };

  return {
    numJogadores: valor('No Jogadores') ?? valor('N Jogadores'),
    microciclo: valor('Microciclo'),
    mesociclo: valor('Mesociclo'),
    periodo: valor('Periodo'),
    data: dataParaIso(valor('Data')),
    hora: (valor('Hora') ?? '').slice(0, 5) || undefined,
    volume: valor('Volume'),
    material: bloco('Material'),
    objetivosGerais: bloco('Objetivos Gerais'),
    objetivosEspecificos: bloco('Objetivos Especificos'),
  };
}

export function analisarPlano(paginas: PaginaPdf[], ficheiro: string): PlanoTreino {
  const frags = fragmentos(paginas);
  const largura = paginas[0]?.largura ?? 596;
  const alturaPagina = paginas[0]?.altura ?? 842;
  const meio = largura / 2;
  const colunas = [frags.filter((f) => f.x < meio), frags.filter((f) => f.x >= meio)];
  const limitesPorColuna: [number, number][] = [
    [6, meio - 6],
    [meio - 2, largura - 6],
  ];

  // O cabeçalho termina no bloco "Material / Objetivos". Nada acima disso pode
  // ser título de exercício — nomeadamente o nome do clube e o endereço do site.
  const fimCabecalho = Math.max(
    0,
    ...frags
      .filter((f) => ROTULOS_CABECALHO.includes(normalizar(f.str)))
      .map((f) => f.ordem),
  );

  const exercicios: ExercicioBruto[] = [];
  let primeiroTitulo = Infinity;

  colunas.forEach((col, iCol) => {
    if (!col.length) return;
    const [x0, x1] = limitesPorColuna[iCol];
    const margem = Math.min(...col.map((f) => f.x));

    /**
     * O texto dos campos está alinhado à margem da coluna. Os rótulos que
     * aparecem dentro dos desenhos táticos ("AV", "DC", "EE DD MC") caem em
     * posições arbitrárias, por isso este alinhamento é o que os separa.
     */
    const naMargem = (f: Frag) => f.x >= margem - 2 && f.x <= margem + 5;
    /** Os títulos aparecem indentados face à margem. */
    const indentado = (f: Frag) => f.x >= margem + 11 && f.x <= margem + 45;

    const marcosObj = col.filter((f) => RE_OBJETIVOS.test(f.str));
    const fimDaFicha = col.find((f) => RE_FIM.test(f.str))?.ordem ?? Infinity;
    let anteriorFim = fimCabecalho;

    marcosObj.forEach((obj, k) => {
      const limiteCelula = marcosObj[k + 1]?.ordem ?? Infinity;
      const desc = col.find(
        (f) => f.ordem > obj.ordem && f.ordem < limiteCelula && RE_DESCRICAO.test(f.str),
      );

      const entre = (a: number, b: number) =>
        col.filter((f) => f.ordem > a && f.ordem < b);

      const objetivos = texto(entre(obj.ordem, desc?.ordem ?? limiteCelula).filter(naMargem));
      const itensDesc = desc
        ? entre(desc.ordem, Math.min(limiteCelula, fimDaFicha)).filter(naMargem)
        : [];
      const descricao = texto(itensDesc);

      // O título é o primeiro item indentado depois do fim da célula anterior:
      // fica por cima do desenho, e os rótulos do desenho ficam por baixo.
      const titulo = entre(anteriorFim, obj.ordem).find(
        (f) => indentado(f) && !ROTULOS_CABECALHO.includes(normalizar(f.str)),
      );
      if (!titulo) return;
      primeiroTitulo = Math.min(primeiroTitulo, titulo.ordem);

      // As caixas de metadados ficam logo por cima de "Objetivo(s)".
      const itensCaixas = entre(titulo.ordem, obj.ordem).filter(
        (f) => f.ordem >= obj.ordem - 60,
      );
      const meta = interpretarCaixas(caixas(itensCaixas));
      const duracao = meta.duracaoMin ?? duracaoDeSeries(meta.repeticoes);

      // O desenho ocupa a faixa entre o título e as caixas.
      const yTitulo = alturaPagina - (titulo.ordem % 100000);
      const topoCaixas = itensCaixas.find((f) => f.pagina === titulo.pagina);
      const base = topoCaixas ? alturaPagina - (topoCaixas.ordem % 100000) + 10 : 4;
      const topo = yTitulo - 6;
      const recorte =
        topo - base > 40
          ? { pagina: titulo.pagina, x: x0, y: alturaPagina - topo, w: x1 - x0, h: topo - base }
          : undefined;

      exercicios.push({
        nome: titulo.str.trim(),
        objetivos: objetivos || undefined,
        descricao: descricao || undefined,
        duracaoMin: duracao,
        repeticoes: meta.repeticoes,
        numJogadores: meta.numJogadores,
        espaco: meta.espaco,
        // Guardamos a posição no papel: é a ordem do exercício na sessão.
        ordem: titulo.ordem,
        pagina: titulo.pagina,
        recorte,
        textoOriginal: [titulo.str, ...meta.sobra, objetivos, descricao]
          .filter(Boolean)
          .join('\n'),
        incluir: true,
      });

      anteriorFim = itensDesc.length
        ? itensDesc[itensDesc.length - 1].ordem
        : (desc?.ordem ?? obj.ordem);
    });
  });

  // A leitura é feita coluna a coluna, mas no papel lê-se linha a linha.
  exercicios.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  return {
    ficheiro,
    clube: frags.find((f) => f.ordem < 40 && f.x < meio)?.str.trim(),
    ...lerCabecalho(frags, primeiroTitulo, largura),
    exercicios,
  };
}

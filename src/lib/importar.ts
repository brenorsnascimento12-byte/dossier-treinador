import { CATEGORIAS_EX, type CategoriaEx, type Exercicio } from './types';

/**
 * Extração de exercícios a partir de material já existente (PDF impresso do
 * Dossier do Treinador, screenshots, texto colado, folhas de cálculo).
 *
 * Tudo corre no browser: nenhum ficheiro sai do dispositivo.
 */

export interface ExercicioBruto {
  nome: string;
  objetivos?: string;
  descricao?: string;
  regras?: string;
  variantes?: string;
  criterios?: string;
  duracaoMin?: number;
  series?: number;
  repeticoes?: string;
  recuperacao?: string;
  numJogadores?: string;
  espaco?: string;
  material?: string;
  categoria?: CategoriaEx;
  imagem?: string;
  textoOriginal?: string;
  /** Posicao original no documento, para manter a ordem da sessao. */
  ordem?: number;
  /** Pagina do PDF de onde veio, para recortar o desenho. */
  pagina?: number;
  /** Preenchido na revisao: este exercicio ja existe algures. */
  repetido?: 'lote' | 'biblioteca';
  /** Area do desenho na pagina do PDF, em pontos, para recortar depois. */
  recorte?: { pagina: number; x: number; y: number; w: number; h: number };
  /** Marcado pelo utilizador na revisão antes de importar. */
  incluir: boolean;
}

// ---------------------------------------------------------------------------
// Deteção de campos por rótulo
// ---------------------------------------------------------------------------

type Chave = keyof Omit<ExercicioBruto, 'incluir' | 'imagem' | 'textoOriginal'>;

/** Rótulos aceites para cada campo, em minúsculas e sem acentos. */
const ROTULOS: [Chave, string[]][] = [
  ['nome', ['nome', 'titulo', 'designacao', 'exercicio', 'nome do exercicio', 'tema']],
  ['objetivos', ['objetivo', 'objetivos', 'objectivo', 'objectivos', 'objetivo especifico']],
  [
    'descricao',
    [
      'descricao',
      'organizacao',
      'desenvolvimento',
      'dinamica',
      'descricao do exercicio',
      'organizacao do exercicio',
      'como se joga',
      'funcionamento',
    ],
  ],
  ['regras', ['regras', 'condicionantes', 'regras e condicionantes', 'condicionantes tecnicas']],
  ['variantes', ['variantes', 'progressoes', 'variaveis', 'progressao', 'evolucao']],
  ['criterios', ['criterios de exito', 'criterios', 'pontos chave', 'palavras chave', 'exito']],
  ['duracaoMin', ['duracao', 'tempo', 'tempo total', 'duracao total']],
  ['series', ['series', 'nr de series', 'n series']],
  ['repeticoes', ['repeticoes', 'reps', 'series e repeticoes']],
  ['recuperacao', ['recuperacao', 'descanso', 'pausa', 'intervalo']],
  [
    'numJogadores',
    ['jogadores', 'n jogadores', 'nr de jogadores', 'numero de jogadores', 'n de jogadores', 'efetivo'],
  ],
  ['espaco', ['espaco', 'dimensoes', 'area', 'campo', 'espaco de jogo', 'dimensao']],
  ['material', ['material', 'materiais', 'material necessario', 'recursos']],
  ['categoria', ['categoria', 'tipo', 'conteudo', 'momento', 'familia']],
];

/** Marcas de acentuação combinantes, para as podermos remover. */
const ACENTOS = /[̀-ͯ]/g;

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(ACENTOS, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Se a linha começa por um rótulo conhecido, devolve o campo e o resto do texto. */
function detetarRotulo(linha: string): { chave: Chave; resto: string } | null {
  const sep = linha.match(/^([^:]{2,40}):\s*(.*)$/);
  const candidato = sep ? sep[1] : linha;
  const norm = normalizar(candidato);
  if (!norm || norm.length > 40) return null;

  for (const [chave, variantes] of ROTULOS) {
    if (variantes.includes(norm)) {
      return { chave, resto: sep ? sep[2] : '' };
    }
  }
  // Sem dois pontos: só aceitamos se a linha inteira for o rótulo (cabeçalho).
  return null;
}

function paraMinutos(s: string): number | undefined {
  const m = s.match(/(\d+)\s*(?:'|min|minutos|m\b)?/i);
  return m ? Number(m[1]) : undefined;
}

function adivinharCategoria(texto: string): CategoriaEx | undefined {
  const n = normalizar(texto);
  const mapa: [CategoriaEx, string[]][] = [
    ['Aquecimento', ['aquecimento', 'ativacao']],
    ['Finalização', ['finalizacao', 'remate', 'golo']],
    ['Posse de bola', ['posse de bola', 'manutencao de bola', 'rondo', 'meinho']],
    ['Organização ofensiva', ['organizacao ofensiva', 'construcao', 'ataque posicional']],
    ['Organização defensiva', ['organizacao defensiva', 'pressao', 'bloco defensivo']],
    ['Transição ofensiva', ['transicao ofensiva', 'contra ataque']],
    ['Transição defensiva', ['transicao defensiva', 'reacao a perda']],
    ['Bolas paradas', ['bolas paradas', 'canto', 'livre', 'esquema tatico']],
    ['Guarda-redes', ['guarda redes', 'guarda-redes', 'gr ']],
    ['Jogo reduzido', ['jogo reduzido', 'gr gr', 'x4', 'x5', 'x3']],
    ['Físico', ['fisico', 'resistencia', 'velocidade', 'forca', 'condicao fisica']],
    ['Técnica', ['tecnica', 'passe', 'recepcao', 'conducao', 'drible']],
    ['Retorno à calma', ['retorno a calma', 'alongamento']],
  ];
  for (const [cat, chaves] of mapa) if (chaves.some((c) => n.includes(c))) return cat;
  return undefined;
}

/** Interpreta um bloco de texto de um único exercício. */
export function analisarTexto(texto: string): ExercicioBruto {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l, i, a) => l.trim() !== '' || (a[i - 1] ?? '').trim() !== '');

  const campos: Partial<Record<Chave, string[]>> = {};
  let atual: Chave | null = null;
  const preambulo: string[] = [];

  for (const linha of linhas) {
    const r = detetarRotulo(linha.trim());
    if (r) {
      atual = r.chave;
      campos[atual] ??= [];
      if (r.resto.trim()) campos[atual]!.push(r.resto.trim());
    } else if (atual) {
      campos[atual]!.push(linha.trim());
    } else if (linha.trim()) {
      preambulo.push(linha.trim());
    }
  }

  const t = (c: Chave) => campos[c]?.join('\n').trim() || undefined;

  // Se não apanhámos nome por rótulo, a primeira linha significativa serve.
  const nome = t('nome') || preambulo[0] || '';
  // O que sobrou do preâmbulo (sem a linha do nome) é descrição solta.
  const restoPreambulo = preambulo.slice(t('nome') ? 0 : 1).join('\n').trim();
  const descricao = [t('descricao'), restoPreambulo].filter(Boolean).join('\n\n') || undefined;

  const catTexto = t('categoria');
  const categoria =
    (catTexto && CATEGORIAS_EX.find((c) => normalizar(c) === normalizar(catTexto))) ||
    adivinharCategoria(`${nome} ${catTexto ?? ''} ${t('objetivos') ?? ''}`);

  return {
    nome: nome.slice(0, 120),
    objetivos: t('objetivos'),
    descricao,
    regras: t('regras'),
    variantes: t('variantes'),
    criterios: t('criterios'),
    duracaoMin: t('duracaoMin') ? paraMinutos(t('duracaoMin')!) : undefined,
    series: t('series') ? Number(t('series')!.match(/\d+/)?.[0]) || undefined : undefined,
    repeticoes: t('repeticoes'),
    recuperacao: t('recuperacao'),
    numJogadores: t('numJogadores'),
    espaco: t('espaco'),
    material: t('material'),
    categoria,
    textoOriginal: texto,
    incluir: !!nome.trim(),
  };
}

export type Separador = 'traços' | 'linha em branco' | 'rótulo de nome';

/** Divide texto colado em vários exercícios. */
export function dividirTexto(texto: string, sep: Separador): string[] {
  if (sep === 'traços') {
    return texto.split(/^\s*[-–—_=]{3,}\s*$/m);
  }
  if (sep === 'linha em branco') {
    return texto.split(/\r?\n\s*\r?\n\s*\r?\n/);
  }
  // Corta imediatamente antes de cada linha que começa por um rótulo de nome.
  const linhas = texto.split(/\r?\n/);
  const blocos: string[] = [];
  let atual: string[] = [];
  for (const l of linhas) {
    const r = detetarRotulo(l.trim());
    if (r?.chave === 'nome' && atual.some((x) => x.trim())) {
      blocos.push(atual.join('\n'));
      atual = [];
    }
    atual.push(l);
  }
  if (atual.length) blocos.push(atual.join('\n'));
  return blocos;
}

// ---------------------------------------------------------------------------
// CSV / folha de cálculo
// ---------------------------------------------------------------------------

/** Divide texto delimitado respeitando aspas. */
export function analisarTabela(texto: string, delim?: string): string[][] {
  const d =
    delim ??
    (() => {
      const primeira = texto.split(/\r?\n/)[0] ?? '';
      const tabs = (primeira.match(/\t/g) ?? []).length;
      const pv = (primeira.match(/;/g) ?? []).length;
      const vg = (primeira.match(/,/g) ?? []).length;
      return tabs >= pv && tabs >= vg ? '\t' : pv >= vg ? ';' : ',';
    })();

  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += c;
    } else if (c === '"') {
      aspas = true;
    } else if (c === d) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else if (c !== '\r') {
      campo += c;
    }
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim()));
}

/** Tenta associar cada coluna a um campo, pelo texto do cabeçalho. */
export function mapearColunas(cabecalho: string[]): (Chave | '')[] {
  return cabecalho.map((h) => {
    const norm = normalizar(h);
    for (const [chave, variantes] of ROTULOS) if (variantes.includes(norm)) return chave;
    return '' as const;
  });
}

export function linhaParaExercicio(
  linha: string[],
  mapa: (Chave | '')[],
): ExercicioBruto {
  const bruto: Record<string, string> = {};
  mapa.forEach((c, i) => {
    if (c && linha[i]?.trim()) bruto[c] = linha[i].trim();
  });
  return {
    nome: bruto.nome ?? '',
    objetivos: bruto.objetivos,
    descricao: bruto.descricao,
    regras: bruto.regras,
    variantes: bruto.variantes,
    criterios: bruto.criterios,
    duracaoMin: bruto.duracaoMin ? paraMinutos(bruto.duracaoMin) : undefined,
    series: bruto.series ? Number(bruto.series.match(/\d+/)?.[0]) || undefined : undefined,
    repeticoes: bruto.repeticoes,
    recuperacao: bruto.recuperacao,
    numJogadores: bruto.numJogadores,
    espaco: bruto.espaco,
    material: bruto.material,
    categoria:
      (bruto.categoria &&
        CATEGORIAS_EX.find((c) => normalizar(c) === normalizar(bruto.categoria))) ||
      adivinharCategoria(`${bruto.nome} ${bruto.categoria ?? ''} ${bruto.objetivos ?? ''}`),
    incluir: !!bruto.nome?.trim(),
  };
}

// ---------------------------------------------------------------------------
// Conversão final
// ---------------------------------------------------------------------------

export function brutoParaExercicio(b: ExercicioBruto, pastaId?: string): Exercicio {
  return {
    id: crypto.randomUUID(),
    nome: b.nome.trim() || 'Exercício importado',
    pastaId,
    categoria: b.categoria ?? 'Posse de bola',
    objetivos: b.objetivos,
    descricao: b.descricao,
    regras: b.regras,
    variantes: b.variantes,
    criterios: b.criterios,
    duracaoMin: b.duracaoMin ?? 15,
    series: b.series,
    repeticoes: b.repeticoes,
    recuperacao: b.recuperacao,
    numJogadores: b.numJogadores,
    espaco: b.espaco,
    material: b.material,
    intensidade: 3,
    tags: ['importado'],
    desenho: { campo: 'completo', itens: [] },
    imagem: b.imagem,
    criadoEm: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Deteção de repetidos
// ---------------------------------------------------------------------------

/** Como comparar dois exercícios para decidir se são o mesmo. */
export type ChaveRepetido = 'nome' | 'nome e conteúdo';

function resumo(s?: string) {
  return normalizar(s ?? '').slice(0, 400);
}

export function assinatura(
  e: { nome: string; objetivos?: string; descricao?: string },
  chave: ChaveRepetido,
): string {
  const nome = normalizar(e.nome);
  if (chave === 'nome') return nome;
  return `${nome}|${resumo(e.objetivos)}|${resumo(e.descricao)}`;
}

/**
 * Marca os exercícios que já existem — na biblioteca ou mais atrás no próprio
 * lote — e desmarca-os para não serem importados. A primeira ocorrência fica.
 */
export function marcarRepetidos(
  brutos: ExercicioBruto[],
  existentes: { nome: string; objetivos?: string; descricao?: string }[],
  chave: ChaveRepetido,
): ExercicioBruto[] {
  const naBiblioteca = new Set(existentes.map((e) => assinatura(e, chave)));
  const vistos = new Set<string>();

  return brutos.map((b) => {
    const a = assinatura(b, chave);
    let repetido: ExercicioBruto['repetido'];
    if (naBiblioteca.has(a)) repetido = 'biblioteca';
    else if (vistos.has(a)) repetido = 'lote';
    vistos.add(a);
    return { ...b, repetido, incluir: !repetido };
  });
}

/** Índice do exercício do lote que representa cada posição (para as sessões). */
export function representantes(
  brutos: ExercicioBruto[],
  chave: ChaveRepetido,
): number[] {
  const primeiro = new Map<string, number>();
  return brutos.map((b, i) => {
    const a = assinatura(b, chave);
    if (!primeiro.has(a)) primeiro.set(a, i);
    return primeiro.get(a)!;
  });
}

// Domínio: futebol de 11.

export type Pe = 'Direito' | 'Esquerdo' | 'Ambos';

export const POSICOES = [
  'GR',
  'DD',
  'DC',
  'DE',
  'MDC',
  'MC',
  'MOC',
  'ED',
  'EE',
  'PL',
] as const;
export type Posicao = (typeof POSICOES)[number];

export const POSICAO_NOME: Record<Posicao, string> = {
  GR: 'Guarda-redes',
  DD: 'Defesa direito',
  DC: 'Defesa central',
  DE: 'Defesa esquerdo',
  MDC: 'Médio defensivo',
  MC: 'Médio centro',
  MOC: 'Médio ofensivo',
  ED: 'Extremo direito',
  EE: 'Extremo esquerdo',
  PL: 'Ponta de lança',
};

/** Posição relativa no campo (0-100 em x e y) para cada posição, vista de baixo para cima. */
export const POSICAO_XY: Record<Posicao, { x: number; y: number }> = {
  GR: { x: 50, y: 94 },
  DD: { x: 82, y: 76 },
  DC: { x: 50, y: 80 },
  DE: { x: 18, y: 76 },
  MDC: { x: 50, y: 62 },
  MC: { x: 50, y: 50 },
  MOC: { x: 50, y: 36 },
  ED: { x: 84, y: 34 },
  EE: { x: 16, y: 34 },
  PL: { x: 50, y: 16 },
};

export interface Jogador {
  id: string;
  nome: string;
  alcunha?: string;
  numero?: number;
  posicao: Posicao;
  posicoesSec: Posicao[];
  pe: Pe;
  dataNascimento?: string; // ISO yyyy-mm-dd
  altura?: number; // cm
  peso?: number; // kg
  foto?: string; // data URL
  contacto?: string;
  email?: string;
  encarregado?: string;
  contactoEncarregado?: string;
  estado: 'Disponível' | 'Lesionado' | 'Castigado' | 'Inativo';
  notaLesao?: string;
  pontosFortes?: string;
  pontosMelhorar?: string;
  observacoes?: string;
  criadoEm: number;
}

export interface Pasta {
  id: string;
  nome: string;
  cor?: string;
  criadoEm: number;
}

export const CATEGORIAS_EX = [
  'Aquecimento',
  'Técnica',
  'Posse de bola',
  'Finalização',
  'Organização ofensiva',
  'Organização defensiva',
  'Transição ofensiva',
  'Transição defensiva',
  'Bolas paradas',
  'Físico',
  'Guarda-redes',
  'Jogo reduzido',
  'Retorno à calma',
] as const;
export type CategoriaEx = (typeof CATEGORIAS_EX)[number];

/** Elemento desenhado no quadro tático. */
export type BoardItem =
  | {
      id: string;
      tipo: 'jogador';
      x: number;
      y: number;
      equipa: 'a' | 'b' | 'neutro';
      rotulo: string;
    }
  | { id: string; tipo: 'bola'; x: number; y: number }
  | { id: string; tipo: 'cone'; x: number; y: number; cor: string }
  | { id: string; tipo: 'baliza'; x: number; y: number; w: number; h: number }
  | { id: string; tipo: 'minibaliza'; x: number; y: number }
  | { id: string; tipo: 'poste'; x: number; y: number }
  | { id: string; tipo: 'escada'; x: number; y: number }
  | {
      id: string;
      tipo: 'zona';
      x: number;
      y: number;
      w: number;
      h: number;
      cor: string;
    }
  | {
      id: string;
      tipo: 'texto';
      x: number;
      y: number;
      texto: string;
      cor: string;
    }
  | {
      id: string;
      tipo: 'seta';
      pontos: { x: number; y: number }[];
      estilo: 'movimento' | 'passe' | 'conducao' | 'remate';
      cor: string;
    };

export type TipoCampo =
  | 'completo'
  | 'meio-campo'
  | 'quarto'
  | 'vazio'
  | 'retangulo';

export interface Desenho {
  campo: TipoCampo;
  itens: BoardItem[];
}

export interface Exercicio {
  id: string;
  nome: string;
  pastaId?: string;
  categoria: CategoriaEx;
  objetivos?: string;
  descricao?: string;
  regras?: string;
  variantes?: string;
  criterios?: string; // critérios de êxito
  duracaoMin: number;
  series?: number;
  repeticoes?: string;
  recuperacao?: string;
  numJogadores?: string;
  espaco?: string;
  material?: string;
  intensidade: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  desenho: Desenho;
  imagem?: string; // data URL alternativa ao desenho
  criadoEm: number;
}

export interface BlocoSessao {
  id: string;
  exercicioId?: string;
  titulo: string;
  duracaoMin: number;
  notas?: string;
  parte: 'Inicial' | 'Fundamental' | 'Final';
}

export interface Sessao {
  id: string;
  numero?: number;
  data: string; // ISO yyyy-mm-dd
  hora?: string;
  local?: string;
  microcicloId?: string;
  objetivoGeral?: string;
  momento?: string;
  blocos: BlocoSessao[];
  presencas: Record<string, 'presente' | 'falta' | 'justificada' | 'lesionado'>;
  cargaPrevista: 1 | 2 | 3 | 4 | 5;
  observacoes?: string;
  criadoEm: number;
}

export interface Macrociclo {
  id: string;
  nome: string;
  epoca: string;
  inicio: string;
  fim: string;
  objetivos?: string;
  criadoEm: number;
}

export interface Mesociclo {
  id: string;
  macrocicloId: string;
  nome: string;
  inicio: string;
  fim: string;
  tipo:
    | 'Pré-época'
    | 'Competitivo'
    | 'Recuperação'
    | 'Transição'
    | 'Preparatório';
  objetivos?: string;
  criadoEm: number;
}

export interface Microciclo {
  id: string;
  mesocicloId: string;
  nome: string;
  inicio: string; // segunda-feira
  fim: string;
  objetivos?: string;
  cargaAlvo: 1 | 2 | 3 | 4 | 5;
  criadoEm: number;
}

export interface EventoJogo {
  id: string;
  minuto: number;
  tipo:
    | 'golo'
    | 'golo-sofrido'
    | 'assistencia'
    | 'amarelo'
    | 'vermelho'
    | 'substituicao'
    | 'nota';
  jogadorId?: string;
  jogadorEntraId?: string;
  descricao?: string;
}

export interface Jogo {
  id: string;
  data: string;
  hora?: string;
  adversario: string;
  casa: boolean;
  competicao: string;
  jornada?: string;
  local?: string;
  sistema?: string; // ex: 1-4-3-3
  convocados: string[];
  onze: string[];
  suplentes: string[];
  posicoesOnze: Record<string, { x: number; y: number }>;
  golosPro?: number;
  golosContra?: number;
  eventos: EventoJogo[];
  avaliacoes: Record<string, number>; // jogadorId -> 1..5
  minutos: Record<string, number>;
  relatorio?: string;
  pontosPositivos?: string;
  pontosMelhorar?: string;
  estado: 'agendado' | 'realizado';
  criadoEm: number;
}

export interface Observacao {
  id: string;
  tipo: 'adversario' | 'jogador';
  titulo: string;
  data: string;
  contexto?: string;
  sistema?: string;
  organizacaoOfensiva?: string;
  organizacaoDefensiva?: string;
  transicoes?: string;
  bolasParadas?: string;
  jogadoresDestaque?: string;
  conclusoes?: string;
  criadoEm: number;
}

export interface Reuniao {
  id: string;
  data: string;
  titulo: string;
  participantes?: string;
  assuntos?: string;
  decisoes?: string;
  criadoEm: number;
}

export interface Definicoes {
  clube: string;
  equipa: string;
  escalao: string;
  epoca: string;
  treinador: string;
  emblema?: string;
  corPrimaria: string;
}

export interface DBShape {
  jogadores: Jogador[];
  pastas: Pasta[];
  exercicios: Exercicio[];
  sessoes: Sessao[];
  macrociclos: Macrociclo[];
  mesociclos: Mesociclo[];
  microciclos: Microciclo[];
  jogos: Jogo[];
  observacoes: Observacao[];
  reunioes: Reuniao[];
  definicoes: Definicoes;
}

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';

/**
 * Documento único da aplicação.
 *
 * Tudo vive num Y.Doc (CRDT): cada coleção é um Y.Map de `id -> objeto JSON`.
 * Isto significa que duas edições feitas offline em dispositivos diferentes
 * fundem-se sem conflitos quando os dispositivos se voltam a encontrar.
 *
 * Persistência local: IndexedDB (funciona offline, sobrevive a fechar a app).
 * Sincronização: WebRTC ponto-a-ponto, ligação direta entre os dispositivos.
 * O servidor de signaling só serve para os dispositivos se descobrirem — os
 * dados vão cifrados com a palavra-passe da sala e nunca são guardados lá.
 */
export const doc = new Y.Doc();

export const COLECOES = [
  'jogadores',
  'pastas',
  'exercicios',
  'sessoes',
  'macrociclos',
  'mesociclos',
  'microciclos',
  'jogos',
  'observacoes',
  'reunioes',
] as const;
export type Colecao = (typeof COLECOES)[number];

export function mapa<T>(nome: Colecao): Y.Map<T> {
  return doc.getMap<T>(nome);
}

/** Definições da equipa/clube, num mapa à parte com chaves simples. */
export const defsMap = doc.getMap<unknown>('definicoes');

export const persistencia = new IndexeddbPersistence('dossier-treinador', doc);

let carregado = false;
const aoCarregar: (() => void)[] = [];
persistencia.on('synced', () => {
  carregado = true;
  aoCarregar.splice(0).forEach((f) => f());
});
export function quandoCarregado(f: () => void) {
  if (carregado) f();
  else aoCarregar.push(f);
}

// ---------------------------------------------------------------------------
// Sincronização entre dispositivos
// ---------------------------------------------------------------------------

const CFG_KEY = 'dt.sync';

export interface ConfigSync {
  ativo: boolean;
  sala: string;
  chave: string;
  servidores: string[];
}

/**
 * Servidores de signaling públicos e gratuitos.
 *
 * Só servem para dois dispositivos trocarem os endereços com que estabelecem
 * a ligação direta — não veem nem guardam dados. São de terceiros e podem
 * desaparecer, por isso as Definições têm um teste de ligação e permitem
 * apontar para um servidor próprio (ver README: `npx y-webrtc-signaling`).
 */
export const SERVIDORES_PADRAO = [
  'wss://yjs-signaling.fly.dev',
  'wss://signaling.yjs.dev',
];

/** Testa se um servidor de signaling está a responder. */
export function testarServidor(url: string, msTimeout = 6000) {
  return new Promise<boolean>((resolve) => {
    let ws: WebSocket;
    const t = setTimeout(() => {
      try {
        ws?.close();
      } catch {
        /* já fechado */
      }
      resolve(false);
    }, msTimeout);
    const terminar = (ok: boolean) => {
      clearTimeout(t);
      try {
        ws?.close();
      } catch {
        /* já fechado */
      }
      resolve(ok);
    };
    try {
      ws = new WebSocket(url);
    } catch {
      return terminar(false);
    }
    ws.onopen = () => terminar(true);
    ws.onerror = () => terminar(false);
  });
}

export function lerConfigSync(): ConfigSync {
  try {
    const bruto = localStorage.getItem(CFG_KEY);
    if (bruto) {
      const c = JSON.parse(bruto) as Partial<ConfigSync>;
      return {
        ativo: !!c.ativo,
        sala: c.sala ?? '',
        chave: c.chave ?? '',
        servidores: c.servidores?.length ? c.servidores : SERVIDORES_PADRAO,
      };
    }
  } catch {
    /* configuração corrompida — recomeça do zero */
  }
  return { ativo: false, sala: '', chave: '', servidores: SERVIDORES_PADRAO };
}

export function guardarConfigSync(c: ConfigSync) {
  localStorage.setItem(CFG_KEY, JSON.stringify(c));
}

export type EstadoSync = {
  ligado: boolean;
  pares: number;
  erro?: string;
};

let provider: WebrtcProvider | null = null;
const ouvintes = new Set<(e: EstadoSync) => void>();
let estado: EstadoSync = { ligado: false, pares: 0 };

function emitir(novo: Partial<EstadoSync>) {
  estado = { ...estado, ...novo };
  ouvintes.forEach((f) => f(estado));
}

export function estadoSync() {
  return estado;
}

export function subscreverSync(f: (e: EstadoSync) => void) {
  ouvintes.add(f);
  f(estado);
  return () => {
    ouvintes.delete(f);
  };
}

export function pararSync() {
  provider?.destroy();
  provider = null;
  emitir({ ligado: false, pares: 0, erro: undefined });
}

export function arrancarSync(cfg = lerConfigSync()) {
  pararSync();
  if (!cfg.ativo || !cfg.sala || !cfg.chave) return;
  try {
    provider = new WebrtcProvider(`dossier-treinador-${cfg.sala}`, doc, {
      signaling: cfg.servidores,
      password: cfg.chave,
      // Menos ligações simultâneas: normalmente só temos 2-3 dispositivos.
      maxConns: 12,
      filterBcConns: false,
      peerOpts: {},
    });
    provider.on('peers', (ev: { webrtcPeers: string[]; bcPeers: string[] }) => {
      const total = new Set([...ev.webrtcPeers, ...ev.bcPeers]).size;
      emitir({ pares: total, ligado: true });
    });
    emitir({ ligado: true, pares: 0, erro: undefined });
  } catch (e) {
    emitir({
      ligado: false,
      pares: 0,
      erro: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Código curto e legível para salas e chaves de emparelhamento. */
export function codigo(n = 10) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

/** Liga o par a partir de um convite `sala.chave` (vindo do QR code). */
export function aplicarConvite(convite: string): boolean {
  const [sala, chave] = convite.split('.');
  if (!sala || !chave) return false;
  const cfg = { ...lerConfigSync(), ativo: true, sala, chave };
  guardarConfigSync(cfg);
  arrancarSync(cfg);
  return true;
}

// Arranque automático assim que os dados locais estiverem carregados.
quandoCarregado(() => {
  const cfg = lerConfigSync();
  if (cfg.ativo) arrancarSync(cfg);
});

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import * as Y from 'yjs';
import { doc, defsMap, mapa, persistencia, type Colecao } from './doc';
import type {
  Definicoes,
  Exercicio,
  Jogador,
  Jogo,
  Macrociclo,
  Mesociclo,
  Microciclo,
  Observacao,
  Pasta,
  Reuniao,
  Sessao,
} from './types';

export function novoId() {
  return crypto.randomUUID();
}

/** Assina uma coleção e devolve os registos ordenados. */
export function useColecao<T extends { id: string }>(
  nome: Colecao,
  ordenar?: (a: T, b: T) => number,
): T[] {
  const m = useMemo(() => mapa<T>(nome), [nome]);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const f = () => setVersao((v) => v + 1);
    m.observeDeep(f);
    return () => m.unobserveDeep(f);
  }, [m]);

  return useMemo(() => {
    const arr = Array.from(m.values());
    return ordenar ? [...arr].sort(ordenar) : arr;
    // `versao` força o recálculo quando o Y.Map muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, versao, ordenar]);
}

export function useRegisto<T extends { id: string }>(
  nome: Colecao,
  id: string | undefined,
): T | undefined {
  const m = useMemo(() => mapa<T>(nome), [nome]);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const f = () => setVersao((v) => v + 1);
    m.observeDeep(f);
    return () => m.unobserveDeep(f);
  }, [m]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (id ? m.get(id) : undefined), [m, id, versao]);
}

/** Operações de escrita. Cada `set` substitui o registo inteiro. */
export function crud<T extends { id: string }>(nome: Colecao) {
  const m = mapa<T>(nome);
  return {
    todos: () => Array.from(m.values()),
    obter: (id: string) => m.get(id),
    guardar: (registo: T) => {
      doc.transact(() => m.set(registo.id, registo));
      return registo;
    },
    atualizar: (id: string, patch: Partial<T>) => {
      const atual = m.get(id);
      if (!atual) return;
      doc.transact(() => m.set(id, { ...atual, ...patch }));
    },
    remover: (id: string) => {
      doc.transact(() => m.delete(id));
    },
  };
}

export const jogadores = crud<Jogador>('jogadores');
export const pastas = crud<Pasta>('pastas');
export const exercicios = crud<Exercicio>('exercicios');
export const sessoes = crud<Sessao>('sessoes');
export const macrociclos = crud<Macrociclo>('macrociclos');
export const mesociclos = crud<Mesociclo>('mesociclos');
export const microciclos = crud<Microciclo>('microciclos');
export const jogos = crud<Jogo>('jogos');
export const observacoes = crud<Observacao>('observacoes');
export const reunioes = crud<Reuniao>('reunioes');

// ---------------------------------------------------------------------------
// Definições
// ---------------------------------------------------------------------------

export const DEFINICOES_PADRAO: Definicoes = {
  clube: '',
  equipa: '',
  escalao: '',
  epoca: `${new Date().getFullYear()}/${String(new Date().getFullYear() + 1).slice(2)}`,
  treinador: '',
  corPrimaria: '#16a34a',
};

export function lerDefinicoes(): Definicoes {
  const out = { ...DEFINICOES_PADRAO };
  for (const k of Object.keys(DEFINICOES_PADRAO) as (keyof Definicoes)[]) {
    const v = defsMap.get(k);
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export function guardarDefinicoes(patch: Partial<Definicoes>) {
  doc.transact(() => {
    for (const [k, v] of Object.entries(patch)) defsMap.set(k, v);
  });
}

export function useDefinicoes(): Definicoes {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const f = () => setVersao((v) => v + 1);
    defsMap.observe(f);
    return () => defsMap.unobserve(f);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => lerDefinicoes(), [versao]);
}

// ---------------------------------------------------------------------------
// Estado de carregamento inicial (IndexedDB)
// ---------------------------------------------------------------------------

let prontoCache = false;
const subsPronto = new Set<() => void>();
persistencia.on('synced', () => {
  prontoCache = true;
  subsPronto.forEach((f) => f());
});

export function usePronto() {
  return useSyncExternalStore(
    useCallback((f: () => void) => {
      subsPronto.add(f);
      return () => subsPronto.delete(f);
    }, []),
    () => prontoCache,
    () => false,
  );
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

export function exportarTudo() {
  const dados: Record<string, unknown> = { versao: 1, definicoes: lerDefinicoes() };
  for (const nome of [
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
  ] as Colecao[]) {
    dados[nome] = Array.from(mapa<{ id: string }>(nome).values());
  }
  return dados;
}

export function importarTudo(dados: Record<string, unknown>, substituir: boolean) {
  doc.transact(() => {
    for (const nome of [
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
    ] as Colecao[]) {
      const m = mapa<{ id: string }>(nome);
      if (substituir) m.clear();
      const lista = dados[nome];
      if (Array.isArray(lista)) {
        for (const r of lista as { id: string }[]) if (r?.id) m.set(r.id, r);
      }
    }
    const defs = dados.definicoes as Partial<Definicoes> | undefined;
    if (defs) for (const [k, v] of Object.entries(defs)) defsMap.set(k, v);
  });
}

/** Snapshot binário do Y.Doc — backup fiel, preserva o histórico de merge. */
export function exportarBinario() {
  return Y.encodeStateAsUpdate(doc);
}

export function importarBinario(bytes: Uint8Array) {
  Y.applyUpdate(doc, bytes);
}

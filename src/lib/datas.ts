export const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** yyyy-mm-dd de uma Date local (sem passar por UTC). */
export function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function hoje(): string {
  return iso(new Date());
}

/** Interpreta yyyy-mm-dd como data local, evitando o desvio de fuso do `new Date(s)`. */
export function data(s: string): Date {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, (m ?? 1) - 1, d ?? 1);
}

export function maisDias(s: string, n: number): string {
  const d = data(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Segunda-feira da semana a que a data pertence. */
export function segunda(s: string): string {
  const d = data(s);
  const desvio = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - desvio);
  return iso(d);
}

export function formatar(s?: string): string {
  if (!s) return '—';
  const d = data(s);
  return `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}/${d.getFullYear()}`;
}

export function formatarCurto(s?: string): string {
  if (!s) return '—';
  const d = data(s);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function diasEntre(a: string, b: string): number {
  return Math.round((data(b).getTime() - data(a).getTime()) / 86400000);
}

export function idade(nascimento?: string): number | undefined {
  if (!nascimento) return undefined;
  const n = data(nascimento);
  const h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) i--;
  return i;
}

export function dentro(d: string, inicio: string, fim: string): boolean {
  return d >= inicio && d <= fim;
}

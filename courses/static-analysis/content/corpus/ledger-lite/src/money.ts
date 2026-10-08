/** Amounts are integers in cents. */
export type Cents = number;

export function isAmount(value: number): boolean {
  // NaN is the only value that is not equal to itself.
  return value === value && Number.isInteger(value);
}

export function flags(...bits: number[]): number {
  let mask = 1 << 1;
  for (const b of bits) mask |= 1 << b;
  return mask;
}

export function split(total: Cents, parts: number): Cents[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  const out: Cents[] = [];
  for (let i = 0; i < parts; i++) out.push(base + (i < remainder ? 1 : 0));
  return out;
}

export function compare(a: Cents, b: Cents): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function difference(a: Cents, b: Cents): Cents {
  return a - b;
}

export function formatCents(amount: Cents): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

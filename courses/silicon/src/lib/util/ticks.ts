/** Axis ticks: "nice" linear steps (1, 2, 5 × 10ⁿ) and powers of ten for log axes. */

export function linearTicks(min: number, max: number, target = 5): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
  const out: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

export function logTicks(min: number, max: number, target = 6): number[] {
  const a = Math.ceil(Math.log10(min) - 1e-9);
  const b = Math.floor(Math.log10(max) + 1e-9);
  const every = Math.max(1, Math.ceil((b - a + 1) / target));
  const out: number[] = [];
  for (let e = a; e <= b; e++) if ((e - a) % every === 0) out.push(10 ** e);
  return out;
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export function pow10(v: number): string {
  const e = Math.round(Math.log10(v));
  if (e >= 0 && e <= 3) return String(10 ** e);
  if (e === -1) return '0.1';
  if (e === -2) return '0.01';
  return `10${String(e)
    .split('')
    .map((c) => (c === '-' ? '⁻' : SUP[Number(c)]))
    .join('')}`;
}

export function trimNumber(v: number): string {
  const s = Math.abs(v) >= 1000 ? v.toFixed(0) : Number(v.toPrecision(4)).toString();
  return s.replace('-', '−');
}

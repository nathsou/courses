/**
 * Elliptic curves y² = x³ + ax + b over the field with p elements: counting points, the Hasse bound,
 * and the local zeta function data a_p = p + 1 − #E(F_p).
 */
import { legendre } from './primality';
import { mod } from './arith';

/** #E(F_p) for an odd prime p, including the point at infinity (Σ over x of 1 + (x³+ax+b / p)). */
export function countPoints(a: number, b: number, p: number): number {
  if (p === 2) {
    let n = 1;
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) if (mod(y * y - (x * x * x + a * x + b), 2) === 0) n++;
    return n;
  }
  let n = 1;
  for (let x = 0; x < p; x++) {
    const r = mod(mod(mod(x * x, p) * x, p) + a * x + b, p);
    n += 1 + (r === 0 ? 0 : legendre(r, p));
  }
  return n;
}

/** The affine points (x, y) of y² = x³ + ax + b over F_p (small p, for drawing). */
export function points(a: number, b: number, p: number): [number, number][] {
  const sq = new Map<number, number[]>();
  for (let y = 0; y < p; y++) {
    const k = (y * y) % p;
    const l = sq.get(k);
    if (l) l.push(y);
    else sq.set(k, [y]);
  }
  const out: [number, number][] = [];
  for (let x = 0; x < p; x++) {
    const r = mod(mod(mod(x * x, p) * x, p) + a * x + b, p);
    for (const y of sq.get(r) ?? []) out.push([x, y]);
  }
  return out;
}

/** a_p = p + 1 − #E(F_p); Hasse's theorem says |a_p| ≤ 2√p. */
export function traceOfFrobenius(a: number, b: number, p: number): number {
  return p + 1 - countPoints(a, b, p);
}

/** The discriminant −16(4a³ + 27b²) (the curve is smooth mod p iff p does not divide it, for p > 3). */
export function discriminant(a: number, b: number): number {
  return -16 * (4 * a ** 3 + 27 * b ** 2);
}

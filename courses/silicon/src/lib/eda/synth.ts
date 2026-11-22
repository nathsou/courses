/**
 * Logic synthesis, part 1: bit-blasting. Every signal of a design becomes a vector of single-bit nodes in a
 * structurally hashed logic graph of NOT, AND, OR, XOR and MUX nodes, with constants folded and a few local
 * simplifications applied as nodes are built (x·0 = 0, x·x = x, x·x̄ = 0, ¬¬x = x, …). Adders become
 * ripple-carry chains, comparisons become subtractions, multiplexers stay multiplexers.
 */
import type { Design, Expr, Signal } from './hdl';

export type LNode =
  | { op: 'const'; v: 0 | 1 }
  | { op: 'input'; name: string; bit: number }
  | { op: 'reg'; name: string; bit: number }
  | { op: 'not'; a: number }
  | { op: 'and' | 'or' | 'xor'; a: number; b: number }
  | { op: 'mux'; s: number; a: number; b: number };

export class Logic {
  nodes: LNode[] = [];
  private hash = new Map<string, number>();
  readonly zero: number;
  readonly one: number;

  constructor() {
    this.zero = this.add({ op: 'const', v: 0 });
    this.one = this.add({ op: 'const', v: 1 });
  }

  private add(n: LNode): number {
    const key = JSON.stringify(n);
    const hit = this.hash.get(key);
    if (hit !== undefined) return hit;
    this.nodes.push(n);
    this.hash.set(key, this.nodes.length - 1);
    return this.nodes.length - 1;
  }

  leaf(op: 'input' | 'reg', name: string, bit: number): number {
    return this.add({ op, name, bit });
  }

  private isNot(x: number): number | undefined {
    const n = this.nodes[x]!;
    return n.op === 'not' ? n.a : undefined;
  }

  not(a: number): number {
    if (a === this.zero) return this.one;
    if (a === this.one) return this.zero;
    const inner = this.isNot(a);
    if (inner !== undefined) return inner;
    return this.add({ op: 'not', a });
  }

  private complementary(a: number, b: number): boolean {
    return this.isNot(a) === b || this.isNot(b) === a;
  }

  and(a: number, b: number): number {
    if (a === this.zero || b === this.zero) return this.zero;
    if (a === this.one) return b;
    if (b === this.one) return a;
    if (a === b) return a;
    if (this.complementary(a, b)) return this.zero;
    return this.add({ op: 'and', a: Math.min(a, b), b: Math.max(a, b) });
  }

  or(a: number, b: number): number {
    if (a === this.one || b === this.one) return this.one;
    if (a === this.zero) return b;
    if (b === this.zero) return a;
    if (a === b) return a;
    if (this.complementary(a, b)) return this.one;
    return this.add({ op: 'or', a: Math.min(a, b), b: Math.max(a, b) });
  }

  xor(a: number, b: number): number {
    if (a === this.zero) return b;
    if (b === this.zero) return a;
    if (a === this.one) return this.not(b);
    if (b === this.one) return this.not(a);
    if (a === b) return this.zero;
    if (this.complementary(a, b)) return this.one;
    // Push inversions out: x ⊕ ¬y = ¬(x ⊕ y).
    const na = this.isNot(a);
    const nb = this.isNot(b);
    if (na !== undefined && nb !== undefined) return this.xor(na, nb);
    if (na !== undefined) return this.not(this.xor(na, b));
    if (nb !== undefined) return this.not(this.xor(a, nb));
    return this.add({ op: 'xor', a: Math.min(a, b), b: Math.max(a, b) });
  }

  /** s ? a : b */
  mux(s: number, a: number, b: number): number {
    if (s === this.one) return a;
    if (s === this.zero) return b;
    if (a === b) return a;
    if (a === this.one && b === this.zero) return s;
    if (a === this.zero && b === this.one) return this.not(s);
    if (a === this.zero) return this.and(this.not(s), b);
    if (b === this.zero) return this.and(s, a);
    if (a === this.one) return this.or(s, b);
    if (b === this.one) return this.or(this.not(s), a);
    const ns = this.isNot(s);
    if (ns !== undefined) return this.mux(ns, b, a);
    return this.add({ op: 'mux', s, a, b });
  }

  orAll(xs: number[]): number {
    return xs.reduce((acc, x) => this.or(acc, x), this.zero);
  }

  andAll(xs: number[]): number {
    return xs.reduce((acc, x) => this.and(acc, x), this.one);
  }

  /** Evaluate every node for leaf values (inputs and register bits by "name[bit]"). */
  evaluate(leaves: Record<string, number>): Uint8Array {
    const v = new Uint8Array(this.nodes.length);
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]!;
      switch (n.op) {
        case 'const':
          v[i] = n.v;
          break;
        case 'input':
        case 'reg':
          v[i] = (leaves[n.name]! >>> n.bit) & 1;
          break;
        case 'not':
          v[i] = v[n.a]! ^ 1;
          break;
        case 'and':
          v[i] = v[n.a]! & v[n.b]!;
          break;
        case 'or':
          v[i] = v[n.a]! | v[n.b]!;
          break;
        case 'xor':
          v[i] = v[n.a]! ^ v[n.b]!;
          break;
        case 'mux':
          v[i] = v[n.s]! ? v[n.a]! : v[n.b]!;
          break;
      }
    }
    return v;
  }
}

export interface Blasted {
  logic: Logic;
  design: Design;
  /** Output bits (by output name), register next-state bits (by register name), wires' bits. */
  outputs: Record<string, number[]>;
  next: Record<string, number[]>;
  wires: Record<string, number[]>;
}

/** Bit-blast a design into a logic graph. */
export function blast(d: Design): Blasted {
  const L = new Logic();
  const memo = new Map<string, number[]>();
  const sigBits = (s: Signal): number[] => {
    const hit = memo.get(s.name);
    if (hit) return hit;
    let bits: number[];
    if (s.kind === 'input' || s.kind === 'reg') bits = Array.from({ length: s.width }, (_, i) => L.leaf(s.kind as 'input' | 'reg', s.name, i));
    else bits = fit(ex(s.expr!), s.width);
    memo.set(s.name, bits);
    return bits;
  };
  const fit = (bits: number[], w: number): number[] => Array.from({ length: w }, (_, i) => bits[i] ?? L.zero);

  const add = (a: number[], b: number[], cin: number): number[] => {
    const out: number[] = [];
    let c = cin;
    for (let i = 0; i < a.length; i++) {
      const p = L.xor(a[i]!, b[i]!);
      out.push(L.xor(p, c));
      c = L.or(L.and(a[i]!, b[i]!), L.and(p, c));
    }
    return out;
  };
  /** a − b as bits, and whether a < b (unsigned): the borrow out of the subtraction. */
  const sub = (a: number[], b: number[]): { diff: number[]; lt: number } => {
    const out: number[] = [];
    let c = L.one;
    for (let i = 0; i < a.length; i++) {
      const nb = L.not(b[i]!);
      const p = L.xor(a[i]!, nb);
      out.push(L.xor(p, c));
      c = L.or(L.and(a[i]!, nb), L.and(p, c));
    }
    return { diff: out, lt: L.not(c) };
  };
  const eq = (a: number[], b: number[]) => L.andAll(a.map((x, i) => L.not(L.xor(x, b[i]!))));

  function ex(e: Expr): number[] {
    const w = e.w;
    switch (e.k) {
      case 'num':
        return Array.from({ length: w }, (_, i) => ((e.v >>> i) & 1 ? L.one : L.zero));
      case 'ref':
        return fit(sigBits(d.signals.get(e.name)!), w);
      case 'slice':
        return ex(e.e).slice(e.lo, e.hi + 1);
      case 'cat': {
        const out: number[] = [];
        for (const p of [...e.parts].reverse()) out.push(...ex(p));
        return out;
      }
      case 'un': {
        const x = ex(e.e);
        if (e.op === '!') return [L.not(L.orAll(x))];
        const inv = fit(x, w).map((b) => L.not(b));
        if (e.op === '~') return inv;
        return add(inv, fit([], w), L.one);
      }
      case 'mux': {
        const s = L.orAll(ex(e.c));
        const a = fit(ex(e.a), w);
        const b = fit(ex(e.b), w);
        return a.map((x, i) => L.mux(s, x, b[i]!));
      }
      case 'bin': {
        if (e.op === '&&') return [L.and(L.orAll(ex(e.a)), L.orAll(ex(e.b)))];
        if (e.op === '||') return [L.or(L.orAll(ex(e.a)), L.orAll(ex(e.b)))];
        const a = ex(e.a);
        const b = ex(e.b);
        switch (e.op) {
          case '&':
            return fit(a, w).map((x, i) => L.and(x, fit(b, w)[i]!));
          case '|':
            return fit(a, w).map((x, i) => L.or(x, fit(b, w)[i]!));
          case '^':
            return fit(a, w).map((x, i) => L.xor(x, fit(b, w)[i]!));
          case '+':
            return add(fit(a, w), fit(b, w), L.zero);
          case '-':
            return sub(fit(a, w), fit(b, w)).diff;
          case '*': {
            let acc = fit([], w);
            const fa = fit(a, w);
            for (let j = 0; j < Math.min(w, b.length); j++) {
              const row = Array.from({ length: w }, (_, i) => (i >= j ? L.and(fa[i - j]!, b[j]!) : L.zero));
              acc = add(acc, row, L.zero);
            }
            return acc;
          }
          case '<<':
          case '>>': {
            let cur = fit(a, w);
            for (let j = 0; j < b.length && 1 << j < 64; j++) {
              const k = 1 << j;
              const shifted = cur.map((_, i) => (e.op === '<<' ? (i - k >= 0 ? cur[i - k]! : L.zero) : (cur[i + k] ?? L.zero)));
              cur = cur.map((x, i) => L.mux(b[j]!, shifted[i]!, x));
            }
            return cur;
          }
          case '==':
          case '!=': {
            const n = Math.max(a.length, b.length);
            const r = eq(fit(a, n), fit(b, n));
            return [e.op === '==' ? r : L.not(r)];
          }
          case '<':
          case '>=':
          case '>':
          case '<=': {
            const n = Math.max(a.length, b.length);
            const [x, y] = e.op === '<' || e.op === '>=' ? [fit(a, n), fit(b, n)] : [fit(b, n), fit(a, n)];
            const lt = sub(x, y).lt;
            return [e.op === '<' || e.op === '>' ? lt : L.not(lt)];
          }
        }
      }
    }
    return [];
  }

  const outputs: Record<string, number[]> = {};
  const next: Record<string, number[]> = {};
  const wires: Record<string, number[]> = {};
  for (const s of d.outputs) outputs[s.name] = sigBits(s);
  for (const s of d.wires) wires[s.name] = sigBits(s);
  for (const r of d.regs) next[r.name] = r.next ? fit(ex(r.next), r.width) : sigBits(r);
  return { logic: L, design: d, outputs, next, wires };
}

/** Nodes reachable from the outputs and next-state bits (the logic that matters), excluding leaves. */
export function liveGates(b: Blasted): number[] {
  const live = new Set<number>();
  const stack = [...Object.values(b.outputs).flat(), ...Object.values(b.next).flat()];
  while (stack.length) {
    const i = stack.pop()!;
    if (live.has(i)) continue;
    live.add(i);
    const n = b.logic.nodes[i]!;
    if (n.op === 'not') stack.push(n.a);
    else if (n.op === 'and' || n.op === 'or' || n.op === 'xor') stack.push(n.a, n.b);
    else if (n.op === 'mux') stack.push(n.s, n.a, n.b);
  }
  return [...live].filter((i) => !['const', 'input', 'reg'].includes(b.logic.nodes[i]!.op)).sort((x, y) => x - y);
}

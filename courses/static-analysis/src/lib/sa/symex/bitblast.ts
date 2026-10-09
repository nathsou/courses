/**
 * Symbolic terms and bit-blasting (chapter 31). Integer terms are bit-vectors of a fixed width in two's complement;
 * Boolean terms are formulas over them. Bit-blasting turns a Boolean term into CNF for the SAT solver: every bit of
 * every integer becomes a propositional variable, and every operation a small circuit (an adder, a multiplier, a
 * comparator), encoded clause by clause with the Tseitin transformation.
 *
 * JavaScript numbers are not 16-bit integers. To keep every model a real JavaScript execution, each addition,
 * subtraction and multiplication adds a **side condition** that its exact result fits in the width: on paths
 * where some intermediate value would leave the range, the solver finds no model, so the executor under-approximates
 * (it may miss paths that need large values) but never reports an execution that cannot happen.
 */
import { solve, type Lit, type SatStats } from './sat.js';

export type IntTerm =
  | { t: 'const'; v: number }
  | { t: 'var'; name: string }
  | { t: 'add' | 'sub' | 'mul' | 'band' | 'bor' | 'bxor'; a: IntTerm; b: IntTerm }
  | { t: 'neg'; a: IntTerm }
  | { t: 'ite'; c: BoolTerm; a: IntTerm; b: IntTerm };

export type BoolTerm =
  | { t: 'true' }
  | { t: 'false' }
  | { t: 'bvar'; name: string }
  | { t: 'not'; a: BoolTerm }
  | { t: 'and' | 'or'; a: BoolTerm; b: BoolTerm }
  | { t: 'lt' | 'le' | 'eq'; a: IntTerm; b: IntTerm };

export const TRUE: BoolTerm = { t: 'true' };
export const FALSE: BoolTerm = { t: 'false' };
export const int = (v: number): IntTerm => ({ t: 'const', v });
export const not = (a: BoolTerm): BoolTerm => (a.t === 'true' ? FALSE : a.t === 'false' ? TRUE : a.t === 'not' ? a.a : { t: 'not', a });
export const and = (a: BoolTerm, b: BoolTerm): BoolTerm => (a.t === 'false' || b.t === 'false' ? FALSE : a.t === 'true' ? b : b.t === 'true' ? a : { t: 'and', a, b });
export const or = (a: BoolTerm, b: BoolTerm): BoolTerm => (a.t === 'true' || b.t === 'true' ? TRUE : a.t === 'false' ? b : b.t === 'false' ? a : { t: 'or', a, b });

const OPS: Record<string, string> = { add: '+', sub: '−', mul: '×', band: '&', bor: '|', bxor: '^', lt: '<', le: '≤', eq: '=' };

export function showInt(e: IntTerm): string {
  switch (e.t) {
    case 'const':
      return e.v < 0 ? `−${-e.v}` : String(e.v);
    case 'var':
      return e.name;
    case 'neg':
      return `−${wrap(e.a)}`;
    case 'ite':
      return `(${showBool(e.c)} ? ${showInt(e.a)} : ${showInt(e.b)})`;
    default:
      return `${wrap(e.a)} ${OPS[e.t]} ${wrap(e.b)}`;
  }
}
const wrap = (e: IntTerm) => (e.t === 'const' || e.t === 'var' ? showInt(e) : `(${showInt(e)})`);
export function showBool(e: BoolTerm): string {
  switch (e.t) {
    case 'true':
      return 'true';
    case 'false':
      return 'false';
    case 'bvar':
      return e.name;
    case 'not':
      return e.a.t === 'eq' ? `${wrap(e.a.a)} ≠ ${wrap(e.a.b)}` : e.a.t === 'lt' ? `${wrap(e.a.a)} ≥ ${wrap(e.a.b)}` : e.a.t === 'le' ? `${wrap(e.a.a)} > ${wrap(e.a.b)}` : `¬(${showBool(e.a)})`;
    case 'and':
      return `${showBool(e.a)} ∧ ${showBool(e.b)}`;
    case 'or':
      return `(${showBool(e.a)} ∨ ${showBool(e.b)})`;
    default:
      return `${wrap(e.a)} ${OPS[e.t]} ${wrap(e.b)}`;
  }
}

/** A CNF under construction, with Tseitin gates. Literal `T` is constant true. */
export class Cnf {
  numVars = 1;
  clauses: Lit[][] = [[1]];
  readonly T: Lit = 1;
  readonly F: Lit = -1;
  fresh(): Lit {
    return ++this.numVars;
  }
  add(...c: Lit[]) {
    this.clauses.push(c);
  }
  and(a: Lit, b: Lit): Lit {
    if (a === this.F || b === this.F) return this.F;
    if (a === this.T) return b;
    if (b === this.T) return a;
    if (a === b) return a;
    if (a === -b) return this.F;
    const o = this.fresh();
    this.add(-o, a);
    this.add(-o, b);
    this.add(o, -a, -b);
    return o;
  }
  or(a: Lit, b: Lit): Lit {
    return -this.and(-a, -b);
  }
  xor(a: Lit, b: Lit): Lit {
    if (a === this.F) return b;
    if (b === this.F) return a;
    if (a === this.T) return -b;
    if (b === this.T) return -a;
    if (a === b) return this.F;
    if (a === -b) return this.T;
    const o = this.fresh();
    this.add(-o, a, b);
    this.add(-o, -a, -b);
    this.add(o, -a, b);
    this.add(o, a, -b);
    return o;
  }
  /** c ? a : b */
  mux(c: Lit, a: Lit, b: Lit): Lit {
    if (c === this.T) return a;
    if (c === this.F) return b;
    if (a === b) return a;
    return this.or(this.and(c, a), this.and(-c, b));
  }
  /** Sum and carry of three bits. */
  fullAdder(a: Lit, b: Lit, c: Lit): [Lit, Lit] {
    const s1 = this.xor(a, b);
    const sum = this.xor(s1, c);
    const carry = this.or(this.and(a, b), this.and(c, s1));
    return [sum, carry];
  }
}

type Bits = Lit[];

export interface Blasted {
  cnf: Cnf;
  /** Bits of each integer input (least significant first), and the literal of each Boolean input. */
  inputs: Map<string, Bits>;
  boolInputs: Map<string, Lit>;
}

/** Bit-blasts terms over `width` bits, collecting no-overflow side conditions. */
export class Blaster {
  readonly cnf = new Cnf();
  readonly inputs = new Map<string, Bits>();
  readonly boolInputs = new Map<string, Lit>();
  /** Literals that must hold for every intermediate value to fit in the width. */
  readonly sideConditions: Lit[] = [];
  private intMemo = new Map<IntTerm, Bits>();
  private boolMemo = new Map<BoolTerm, Lit>();
  constructor(readonly width = 16) {}

  private constBits(v: number, w = this.width): Bits {
    return Array.from({ length: w }, (_, i) => (((v >> i) & 1) === 1 ? this.cnf.T : this.cnf.F));
  }
  private extend(a: Bits, w: number): Bits {
    return [...a, ...Array.from({ length: w - a.length }, () => a[a.length - 1]!)];
  }
  private adder(a: Bits, b: Bits, carryIn: Lit): Bits {
    const out: Bits = [];
    let c = carryIn;
    for (let i = 0; i < a.length; i++) {
      const [s, co] = this.cnf.fullAdder(a[i]!, b[i]!, c);
      out.push(s);
      c = co;
    }
    return out;
  }
  /** Asserts that a wide result fits in `width` bits: its top bits all equal the sign bit of the narrow result. */
  private fits(wide: Bits) {
    const sign = wide[this.width - 1]!;
    for (let i = this.width; i < wide.length; i++) this.sideConditions.push(-this.cnf.xor(wide[i]!, sign));
  }

  int(e: IntTerm): Bits {
    const memo = this.intMemo.get(e);
    if (memo) return memo;
    const W = this.width;
    let out: Bits;
    switch (e.t) {
      case 'const':
        out = this.constBits(e.v);
        break;
      case 'var': {
        let bits = this.inputs.get(e.name);
        if (!bits) this.inputs.set(e.name, (bits = Array.from({ length: W }, () => this.cnf.fresh())));
        out = bits;
        break;
      }
      case 'add':
      case 'sub': {
        const a = this.extend(this.int(e.a), W + 1);
        let b = this.extend(this.int(e.b), W + 1);
        if (e.t === 'sub') b = b.map((x) => -x);
        const wide = this.adder(a, b, e.t === 'sub' ? this.cnf.T : this.cnf.F);
        this.fits(wide);
        out = wide.slice(0, W);
        break;
      }
      case 'neg': {
        const wide = this.adder(this.extend(this.int(e.a), W + 1).map((x) => -x), this.constBits(0, W + 1), this.cnf.T);
        this.fits(wide);
        out = wide.slice(0, W);
        break;
      }
      case 'mul': {
        // Shift-and-add over 2W bits, then check that the product fits in W.
        const a = this.extend(this.int(e.a), 2 * W);
        const b = this.extend(this.int(e.b), 2 * W);
        let acc = this.constBits(0, 2 * W);
        for (let i = 0; i < 2 * W; i++) {
          const partial = Array.from({ length: 2 * W }, (_, j) => (j < i ? this.cnf.F : this.cnf.and(a[j - i]!, b[i]!)));
          acc = this.adder(acc, partial, this.cnf.F);
        }
        this.fits(acc);
        out = acc.slice(0, W);
        break;
      }
      case 'band':
      case 'bor':
      case 'bxor': {
        const a = this.int(e.a);
        const b = this.int(e.b);
        out = a.map((x, i) => (e.t === 'band' ? this.cnf.and(x, b[i]!) : e.t === 'bor' ? this.cnf.or(x, b[i]!) : this.cnf.xor(x, b[i]!)));
        break;
      }
      case 'ite': {
        const c = this.bool(e.c);
        const a = this.int(e.a);
        const b = this.int(e.b);
        out = a.map((x, i) => this.cnf.mux(c, x, b[i]!));
        break;
      }
    }
    this.intMemo.set(e, out);
    return out;
  }

  bool(e: BoolTerm): Lit {
    const memo = this.boolMemo.get(e);
    if (memo !== undefined) return memo;
    let out: Lit;
    switch (e.t) {
      case 'true':
        out = this.cnf.T;
        break;
      case 'false':
        out = this.cnf.F;
        break;
      case 'bvar': {
        let l = this.boolInputs.get(e.name);
        if (l === undefined) this.boolInputs.set(e.name, (l = this.cnf.fresh()));
        out = l;
        break;
      }
      case 'not':
        out = -this.bool(e.a);
        break;
      case 'and':
        out = this.cnf.and(this.bool(e.a), this.bool(e.b));
        break;
      case 'or':
        out = this.cnf.or(this.bool(e.a), this.bool(e.b));
        break;
      case 'eq': {
        const a = this.int(e.a);
        const b = this.int(e.b);
        out = a.reduce<Lit>((acc, x, i) => this.cnf.and(acc, -this.cnf.xor(x, b[i]!)), this.cnf.T);
        break;
      }
      case 'lt':
      case 'le': {
        // Signed comparison: the sign of a − b computed over W + 1 bits, which cannot overflow.
        const W = this.width;
        const a = this.extend(this.int(e.a), W + 1);
        const b = this.extend(this.int(e.b), W + 1).map((x) => -x);
        const diff = this.adder(a, b, this.cnf.T);
        const lt = diff[W]!;
        out = e.t === 'lt' ? lt : this.cnf.or(lt, this.bool({ t: 'eq', a: e.a, b: e.b }));
        break;
      }
    }
    this.boolMemo.set(e, out);
    return out;
  }
}

export interface Check {
  sat: boolean;
  /** Values of the integer and Boolean inputs, when satisfiable. */
  model?: Record<string, number | boolean>;
  stats: SatStats;
  vars: number;
  clauses: number;
}

/** Is the conjunction of these conditions satisfiable, with every intermediate value in range? */
export function check(conditions: BoolTerm[], width = 16): Check {
  const b = new Blaster(width);
  const roots = conditions.map((c) => b.bool(c));
  for (const r of roots) b.cnf.add(r);
  for (const s of b.sideConditions) b.cnf.add(s);
  const res = solve(b.cnf.numVars, b.cnf.clauses);
  const base = { stats: res.stats, vars: b.cnf.numVars, clauses: b.cnf.clauses.length };
  if (!res.sat) return { sat: false, ...base };
  const model: Record<string, number | boolean> = {};
  for (const [name, bits] of b.inputs) {
    let v = 0;
    bits.forEach((l, i) => {
      const bit = l > 0 ? res.model[l] : !res.model[-l];
      if (bit) v |= 1 << i;
    });
    // Two's complement.
    if (v & (1 << (width - 1))) v -= 1 << width;
    model[name] = v;
  }
  for (const [name, l] of b.boolInputs) model[name] = l > 0 ? res.model[l]! : !res.model[-l];
  return { sat: true, model, ...base };
}

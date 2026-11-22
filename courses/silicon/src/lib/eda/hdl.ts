/**
 * The course's hardware description language: a small register-transfer language with one implicit clock.
 *
 *   input en                 // a 1-bit input
 *   input a: 4               // a 4-bit input
 *   reg q: 4 = 0             // a 4-bit register, 0 at power-on
 *   wire next: 4 = q + 1     // combinational logic, named
 *   output tc = q == 9       // combinational logic, visible outside
 *   q <= en ? next : q       // the register's value after the next clock edge
 *   assert q <= 9            // must hold in every cycle
 *   assume !(en && rst)      // inputs the environment promises never to give (for proofs)
 *
 * Values are unsigned. Widths follow Verilog's rules in simplified form: arithmetic, bitwise and ?: operands are
 * extended to the width of their context (the declared width of the signal they are assigned to), so
 * `wire s: 5 = a + b` keeps the carry; comparisons and logical operators give one bit. See Appendix A.
 */

export type BinOp = '+' | '-' | '*' | '&' | '|' | '^' | '<<' | '>>' | '==' | '!=' | '<' | '<=' | '>' | '>=' | '&&' | '||';
export type UnOp = '~' | '!' | '-';

export type Expr =
  | { k: 'num'; v: number; w: number; line: number }
  | { k: 'ref'; name: string; w: number; line: number }
  | { k: 'slice'; e: Expr; hi: number; lo: number; w: number; line: number }
  | { k: 'cat'; parts: Expr[]; w: number; line: number }
  | { k: 'un'; op: UnOp; e: Expr; w: number; line: number }
  | { k: 'bin'; op: BinOp; a: Expr; b: Expr; w: number; line: number }
  | { k: 'mux'; c: Expr; a: Expr; b: Expr; w: number; line: number };

export type SignalKind = 'input' | 'output' | 'wire' | 'reg';

export interface Signal {
  name: string;
  kind: SignalKind;
  width: number;
  line: number;
  /** Combinational definition (wire, output). */
  expr?: Expr;
  /** Next-state expression (reg); a register without one keeps its value. */
  next?: Expr;
  /** Power-on value (reg). */
  init: number;
}

export interface Check {
  expr: Expr;
  line: number;
  text: string;
}

export interface Design {
  signals: Map<string, Signal>;
  inputs: Signal[];
  outputs: Signal[];
  regs: Signal[];
  wires: Signal[];
  /** Wires and outputs in evaluation order (every signal after the ones it reads). */
  order: Signal[];
  asserts: Check[];
  assumes: Check[];
  source: string;
}

export interface HdlError {
  line: number;
  message: string;
}

export const MAX_WIDTH = 32;

export const mask = (w: number): number => (w >= 32 ? 0xffffffff : (1 << w) - 1) >>> 0;
const bitlen = (v: number): number => (v === 0 ? 1 : Math.floor(Math.log2(v)) + 1);

// ───────────────────────── Lexer ─────────────────────────

interface Token {
  t: 'id' | 'num' | 'op' | 'nl' | 'eof';
  v: string;
  line: number;
  /** Offsets of the token in the source. */
  pos: number;
  end: number;
  /** For numbers: the width implied by the literal (binary and hex digits count). */
  w?: number;
}

const OPS = ['<=', '>=', '==', '!=', '&&', '||', '<<', '>>', '+', '-', '*', '&', '|', '^', '~', '!', '<', '>', '?', ':', '(', ')', '[', ']', '{', '}', ',', '='];

class SyntaxError_ extends Error {
  constructor(
    public line: number,
    message: string,
  ) {
    super(message);
  }
}

function lex(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let line = 1;
  let depth = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '\n') {
      if (depth === 0 && out.length && out.at(-1)!.t !== 'nl') out.push({ t: 'nl', v: '\n', line, pos: i, end: i });
      line++;
      i++;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === ';') {
      if (depth === 0 && out.length && out.at(-1)!.t !== 'nl') out.push({ t: 'nl', v: ';', line, pos: i, end: i });
      i++;
      continue;
    }
    const num = /^(0b[01_]+|0x[0-9a-fA-F_]+|\d[\d_]*)/.exec(src.slice(i));
    if (num) {
      const raw = num[1]!.replace(/_/g, '');
      let v: number;
      let w: number;
      if (raw.startsWith('0b')) {
        v = parseInt(raw.slice(2), 2);
        w = raw.length - 2;
      } else if (raw.startsWith('0x')) {
        v = parseInt(raw.slice(2), 16);
        w = 4 * (raw.length - 2);
      } else {
        v = Number(raw);
        w = bitlen(v);
      }
      if (!Number.isFinite(v) || v > 0xffffffff || w > MAX_WIDTH) throw new SyntaxError_(line, `the number ${num[1]} is wider than ${MAX_WIDTH} bits`);
      out.push({ t: 'num', v: String(v), line, w, pos: i, end: i + num[1]!.length });
      i += num[1]!.length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (id) {
      out.push({ t: 'id', v: id[0], line, pos: i, end: i + id[0].length });
      i += id[0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      if (op === '(' || op === '[' || op === '{') depth++;
      if (op === ')' || op === ']' || op === '}') depth = Math.max(0, depth - 1);
      out.push({ t: 'op', v: op, line, pos: i, end: i + op.length });
      i += op.length;
      continue;
    }
    throw new SyntaxError_(line, `unexpected character “${c}”`);
  }
  if (out.length && out.at(-1)!.t !== 'nl') out.push({ t: 'nl', v: '\n', line, pos: i, end: i });
  out.push({ t: 'eof', v: '', line, pos: i, end: i });
  return out;
}

// ───────────────────────── Parser ─────────────────────────

const BINARY: Record<string, number> = {
  '||': 2,
  '&&': 3,
  '|': 4,
  '^': 5,
  '&': 6,
  '==': 7,
  '!=': 7,
  '<': 8,
  '<=': 8,
  '>': 8,
  '>=': 8,
  '<<': 9,
  '>>': 9,
  '+': 10,
  '-': 10,
  '*': 11,
};

interface RawStatement {
  kind: 'decl' | 'assign' | 'assert' | 'assume';
  line: number;
  decl?: { kind: SignalKind; name: string; width: number; expr?: Expr; init?: number };
  target?: string;
  expr?: Expr;
  text?: string;
}

class Parser {
  i = 0;
  constructor(
    private toks: Token[],
    private src: string,
  ) {}

  peek(): Token {
    return this.toks[this.i]!;
  }
  next(): Token {
    return this.toks[this.i++]!;
  }
  isOp(v: string): boolean {
    const t = this.peek();
    return t.t === 'op' && t.v === v;
  }
  expectOp(v: string, what?: string): void {
    const t = this.next();
    if (t.t !== 'op' || t.v !== v) throw new SyntaxError_(t.line, `expected “${v}”${what ? ` ${what}` : ''}, found ${describe(t)}`);
  }
  ident(what: string): Token {
    const t = this.next();
    if (t.t !== 'id') throw new SyntaxError_(t.line, `expected ${what}, found ${describe(t)}`);
    return t;
  }
  number(what: string): number {
    const t = this.next();
    if (t.t !== 'num') throw new SyntaxError_(t.line, `expected ${what}, found ${describe(t)}`);
    return Number(t.v);
  }
  endOfStatement(): void {
    const t = this.next();
    if (t.t !== 'nl' && t.t !== 'eof') throw new SyntaxError_(t.line, `unexpected ${describe(t)}: one statement per line`);
  }

  statements(): RawStatement[] {
    const out: RawStatement[] = [];
    while (this.peek().t !== 'eof') {
      if (this.peek().t === 'nl') {
        this.next();
        continue;
      }
      out.push(this.statement());
    }
    return out;
  }

  width(): number {
    if (!this.isOp(':')) return 1;
    this.next();
    const line = this.peek().line;
    const w = this.number('a width in bits');
    if (w < 1 || w > MAX_WIDTH) throw new SyntaxError_(line, `widths go from 1 to ${MAX_WIDTH} bits, not ${w}`);
    return w;
  }

  statement(): RawStatement {
    const t = this.peek();
    const line = t.line;
    if (t.t === 'id' && (t.v === 'input' || t.v === 'output' || t.v === 'wire' || t.v === 'reg')) {
      this.next();
      const kind = t.v as SignalKind;
      const name = this.ident(`a name after “${kind}”`).v;
      const width = this.width();
      let expr: Expr | undefined;
      let init: number | undefined;
      if (kind === 'input') {
        if (this.isOp('=')) throw new SyntaxError_(line, `an input gets its value from outside; it cannot be given one`);
      } else if (kind === 'reg') {
        if (this.isOp('=')) {
          this.next();
          init = this.number(`the register’s power-on value`);
        }
      } else {
        this.expectOp('=', `after the ${kind}’s name (a ${kind} is defined by an expression)`);
        expr = this.expr(0);
      }
      this.endOfStatement();
      return { kind: 'decl', line, decl: { kind, name, width, expr, init } };
    }
    if (t.t === 'id' && (t.v === 'assert' || t.v === 'assume')) {
      this.next();
      const start = this.i;
      const expr = this.expr(0);
      const text = this.textBetween(start, this.i);
      this.endOfStatement();
      return { kind: t.v, line, expr, text };
    }
    if (t.t === 'id') {
      this.next();
      if (this.isOp('=')) throw new SyntaxError_(line, `use “<=” to give a register its next value, or declare a wire with “wire ${t.v} = …”`);
      this.expectOp('<=', `after “${t.v}” (a register is assigned with <=)`);
      const expr = this.expr(0);
      this.endOfStatement();
      return { kind: 'assign', line, target: t.v, expr };
    }
    throw new SyntaxError_(line, `a statement starts with input, output, wire, reg, assert, assume or a register name; found ${describe(t)}`);
  }

  /** Source text of the tokens [a, b), for messages. */
  textBetween(a: number, b: number): string {
    return this.src.slice(this.toks[a]!.pos, this.toks[b - 1]!.end).replace(/\s+/g, ' ').trim();
  }

  expr(minPrec: number): Expr {
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      if (t.t !== 'op') break;
      if (t.v === '?' && minPrec <= 1) {
        this.next();
        const a = this.expr(1);
        this.expectOp(':', 'in a ? b : c');
        const b = this.expr(1);
        left = { k: 'mux', c: left, a, b, w: 0, line: t.line };
        continue;
      }
      const p = BINARY[t.v];
      if (p === undefined || p < minPrec) break;
      this.next();
      const right = this.expr(p + 1);
      left = { k: 'bin', op: t.v as BinOp, a: left, b: right, w: 0, line: t.line };
    }
    return left;
  }

  unary(): Expr {
    const t = this.peek();
    if (t.t === 'op' && (t.v === '~' || t.v === '!' || t.v === '-')) {
      this.next();
      return { k: 'un', op: t.v, e: this.unary(), w: 0, line: t.line };
    }
    return this.postfix(this.primary());
  }

  postfix(e: Expr): Expr {
    while (this.isOp('[')) {
      const line = this.next().line;
      const hi = this.number('a bit index');
      let lo = hi;
      if (this.isOp(':')) {
        this.next();
        lo = this.number('the low bit of a slice');
      }
      this.expectOp(']', 'to close the bit selection');
      if (lo > hi) throw new SyntaxError_(line, `a slice is written [high:low]; [${hi}:${lo}] has them the other way round`);
      e = { k: 'slice', e, hi, lo, w: 0, line };
    }
    return e;
  }

  primary(): Expr {
    const t = this.next();
    if (t.t === 'num') return { k: 'num', v: Number(t.v), w: t.w!, line: t.line };
    if (t.t === 'id') {
      if (['input', 'output', 'wire', 'reg', 'assert', 'assume'].includes(t.v)) throw new SyntaxError_(t.line, `“${t.v}” starts a new statement; put it on its own line`);
      return { k: 'ref', name: t.v, w: 0, line: t.line };
    }
    if (t.t === 'op' && t.v === '(') {
      const e = this.expr(0);
      this.expectOp(')', 'to close the parenthesis');
      return e;
    }
    if (t.t === 'op' && t.v === '{') {
      const parts = [this.expr(0)];
      while (this.isOp(',')) {
        this.next();
        parts.push(this.expr(0));
      }
      this.expectOp('}', 'to close the concatenation');
      return { k: 'cat', parts, w: 0, line: t.line };
    }
    throw new SyntaxError_(t.line, `expected a value, found ${describe(t)}`);
  }
}

function describe(t: Token): string {
  if (t.t === 'nl') return 'the end of the line';
  if (t.t === 'eof') return 'the end of the design';
  if (t.t === 'num') return `the number ${t.v}`;
  if (t.t === 'id') return `“${t.v}”`;
  return `“${t.v}”`;
}

// ───────────────────────── Widths ─────────────────────────

const CONTEXT_OPS = new Set<BinOp>(['+', '-', '*', '&', '|', '^']);
const ONE_BIT_OPS = new Set<BinOp>(['==', '!=', '<', '<=', '>', '>=', '&&', '||']);

class TypeError_ extends Error {
  constructor(
    public line: number,
    message: string,
  ) {
    super(message);
  }
}

/** Self-determined width of an expression (no context). Also checks names. */
function selfWidth(e: Expr, sig: Map<string, Signal>): number {
  switch (e.k) {
    case 'num':
      return e.w;
    case 'ref': {
      const s = sig.get(e.name);
      if (!s) throw new TypeError_(e.line, `“${e.name}” is not declared`);
      return s.width;
    }
    case 'slice': {
      const w = selfWidth(e.e, sig);
      if (e.hi >= w) throw new TypeError_(e.line, `bit ${e.hi} does not exist: the value is ${w} bit${w === 1 ? '' : 's'} wide (bits ${w - 1} to 0)`);
      return e.hi - e.lo + 1;
    }
    case 'cat': {
      const w = e.parts.reduce((s, p) => s + selfWidth(p, sig), 0);
      if (w > MAX_WIDTH) throw new TypeError_(e.line, `this concatenation is ${w} bits wide; the limit is ${MAX_WIDTH}`);
      return w;
    }
    case 'un':
      return e.op === '!' ? (selfWidth(e.e, sig), 1) : selfWidth(e.e, sig);
    case 'bin': {
      const a = selfWidth(e.a, sig);
      const b = selfWidth(e.b, sig);
      if (ONE_BIT_OPS.has(e.op)) return 1;
      if (e.op === '<<' || e.op === '>>') return a;
      return Math.max(a, b);
    }
    case 'mux':
      selfWidth(e.c, sig);
      return Math.max(selfWidth(e.a, sig), selfWidth(e.b, sig));
  }
}

/** Fix the final width of every node, given the width of the context the expression is evaluated in. */
function size(e: Expr, ctx: number, sig: Map<string, Signal>): void {
  const self = selfWidth(e, sig);
  switch (e.k) {
    case 'num':
    case 'ref':
      e.w = Math.max(self, ctx);
      return;
    case 'slice':
      size(e.e, 0, sig);
      e.w = self;
      return;
    case 'cat':
      for (const p of e.parts) size(p, 0, sig);
      e.w = self;
      return;
    case 'un':
      if (e.op === '!') {
        size(e.e, 0, sig);
        e.w = 1;
      } else {
        e.w = Math.min(MAX_WIDTH, Math.max(self, ctx));
        size(e.e, e.w, sig);
      }
      return;
    case 'bin':
      if (ONE_BIT_OPS.has(e.op)) {
        if (e.op === '&&' || e.op === '||') {
          size(e.a, 0, sig);
          size(e.b, 0, sig);
        } else {
          const w = Math.max(selfWidth(e.a, sig), selfWidth(e.b, sig));
          size(e.a, w, sig);
          size(e.b, w, sig);
        }
        e.w = 1;
      } else if (e.op === '<<' || e.op === '>>') {
        e.w = Math.min(MAX_WIDTH, Math.max(self, ctx));
        size(e.a, e.w, sig);
        size(e.b, 0, sig);
      } else if (CONTEXT_OPS.has(e.op)) {
        e.w = Math.min(MAX_WIDTH, Math.max(self, ctx));
        size(e.a, e.w, sig);
        size(e.b, e.w, sig);
      }
      return;
    case 'mux':
      size(e.c, 0, sig);
      e.w = Math.min(MAX_WIDTH, Math.max(self, ctx));
      size(e.a, e.w, sig);
      size(e.b, e.w, sig);
      return;
  }
}

/** Names an expression reads. */
export function refs(e: Expr, out: Set<string> = new Set()): Set<string> {
  switch (e.k) {
    case 'num':
      break;
    case 'ref':
      out.add(e.name);
      break;
    case 'slice':
      refs(e.e, out);
      break;
    case 'cat':
      for (const p of e.parts) refs(p, out);
      break;
    case 'un':
      refs(e.e, out);
      break;
    case 'bin':
      refs(e.a, out);
      refs(e.b, out);
      break;
    case 'mux':
      refs(e.c, out);
      refs(e.a, out);
      refs(e.b, out);
      break;
  }
  return out;
}

// ───────────────────────── Elaboration ─────────────────────────

export type ParseResult = { ok: true; design: Design } | { ok: false; errors: HdlError[] };

export function parse(source: string): ParseResult {
  let stmts: RawStatement[];
  try {
    stmts = new Parser(lex(source), source).statements();
  } catch (e) {
    if (e instanceof SyntaxError_) return { ok: false, errors: [{ line: e.line, message: e.message }] };
    throw e;
  }
  const errors: HdlError[] = [];
  const signals = new Map<string, Signal>();
  for (const s of stmts) {
    if (s.kind !== 'decl') continue;
    const d = s.decl!;
    if (signals.has(d.name)) {
      errors.push({ line: s.line, message: `“${d.name}” is already declared on line ${signals.get(d.name)!.line}` });
      continue;
    }
    if (d.init !== undefined && d.init > mask(d.width)) errors.push({ line: s.line, message: `${d.init} does not fit in ${d.width} bit${d.width === 1 ? '' : 's'}` });
    signals.set(d.name, { name: d.name, kind: d.kind, width: d.width, line: s.line, expr: d.expr, init: d.init ?? 0 });
  }
  const asserts: Check[] = [];
  const assumes: Check[] = [];
  for (const s of stmts) {
    if (s.kind === 'assign') {
      const sig = signals.get(s.target!);
      if (!sig) errors.push({ line: s.line, message: `“${s.target}” is not declared; declare it with “reg ${s.target}: width = 0” first` });
      else if (sig.kind !== 'reg') errors.push({ line: s.line, message: `“${s.target}” is ${sig.kind === 'input' ? 'an input' : `a ${sig.kind}`}; only registers are assigned with <=` });
      else if (sig.next) errors.push({ line: s.line, message: `“${s.target}” already has a next value on line ${sig.next.line}; combine the cases with ? :` });
      else sig.next = s.expr;
    } else if (s.kind === 'assert') asserts.push({ expr: s.expr!, line: s.line, text: s.text! });
    else if (s.kind === 'assume') assumes.push({ expr: s.expr!, line: s.line, text: s.text! });
  }
  const typed = (e: Expr, w: number) => {
    try {
      size(e, w, signals);
    } catch (err) {
      if (err instanceof TypeError_) errors.push({ line: err.line, message: err.message });
      else throw err;
    }
  };
  for (const sig of signals.values()) {
    if (sig.expr) typed(sig.expr, sig.width);
    if (sig.next) typed(sig.next, sig.width);
  }
  for (const c of [...asserts, ...assumes]) typed(c.expr, 1);
  if (errors.length) return { ok: false, errors: errors.sort((a, b) => a.line - b.line) };

  // Evaluation order of the combinational signals; a cycle is a combinational loop.
  const comb = [...signals.values()].filter((s) => s.expr);
  const order: Signal[] = [];
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (s: Signal, path: string[]): boolean => {
    const st = state.get(s.name) ?? 0;
    if (st === 2) return true;
    if (st === 1) {
      const loop = [...path.slice(path.indexOf(s.name)), s.name];
      errors.push({ line: s.line, message: `combinational loop: ${loop.join(' → ')}. Break it with a register.` });
      return false;
    }
    state.set(s.name, 1);
    for (const r of refs(s.expr!)) {
      const t = signals.get(r)!;
      if (t.expr && !visit(t, [...path, s.name])) return false;
    }
    state.set(s.name, 2);
    order.push(s);
    return true;
  };
  for (const s of comb) if (!visit(s, [])) break;
  if (errors.length) return { ok: false, errors };

  const all = [...signals.values()];
  return {
    ok: true,
    design: {
      signals,
      inputs: all.filter((s) => s.kind === 'input'),
      outputs: all.filter((s) => s.kind === 'output'),
      regs: all.filter((s) => s.kind === 'reg'),
      wires: all.filter((s) => s.kind === 'wire'),
      order,
      asserts,
      assumes,
      source,
    },
  };
}

/** Parse, throwing on errors (for designs the course ships). */
export function design(source: string): Design {
  const r = parse(source);
  if (!r.ok) throw new Error(r.errors.map((e) => `line ${e.line}: ${e.message}`).join('\n'));
  return r.design;
}

// ───────────────────────── Evaluation ─────────────────────────

export type Env = Record<string, number>;

export function evaluate(e: Expr, env: Env): number {
  const m = mask(e.w);
  switch (e.k) {
    case 'num':
      return (e.v & m) >>> 0;
    case 'ref':
      return (env[e.name]! & m) >>> 0;
    case 'slice':
      return ((evaluate(e.e, env) >>> e.lo) & mask(e.w)) >>> 0;
    case 'cat': {
      let v = 0;
      // The total width is at most 32 bits, so v stays below 2^32.
      for (const p of e.parts) v = v * 2 ** p.w + evaluate(p, env);
      return v >>> 0;
    }
    case 'un': {
      const x = evaluate(e.e, env);
      if (e.op === '!') return x === 0 ? 1 : 0;
      if (e.op === '~') return (~x & m) >>> 0;
      return (-x & m) >>> 0;
    }
    case 'bin': {
      if (e.op === '&&') return evaluate(e.a, env) !== 0 && evaluate(e.b, env) !== 0 ? 1 : 0;
      if (e.op === '||') return evaluate(e.a, env) !== 0 || evaluate(e.b, env) !== 0 ? 1 : 0;
      const a = evaluate(e.a, env);
      const b = evaluate(e.b, env);
      switch (e.op) {
        case '+':
          return ((a + b) & m) >>> 0;
        case '-':
          return ((a - b) & m) >>> 0;
        case '*':
          return (Math.imul(a, b) & m) >>> 0;
        case '&':
          return (a & b & m) >>> 0;
        case '|':
          return ((a | b) & m) >>> 0;
        case '^':
          return ((a ^ b) & m) >>> 0;
        case '<<':
          return b >= 32 ? 0 : ((a << b) & m) >>> 0;
        case '>>':
          return b >= 32 ? 0 : ((a >>> b) & m) >>> 0;
        case '==':
          return a === b ? 1 : 0;
        case '!=':
          return a !== b ? 1 : 0;
        case '<':
          return a < b ? 1 : 0;
        case '<=':
          return a <= b ? 1 : 0;
        case '>':
          return a > b ? 1 : 0;
        case '>=':
          return a >= b ? 1 : 0;
      }
      return 0;
    }
    case 'mux':
      return evaluate(e.c, env) !== 0 ? evaluate(e.a, env) : evaluate(e.b, env);
  }
}

/** Evaluate every combinational signal for the current register values and inputs (fills env in place). */
export function settle(d: Design, env: Env): Env {
  for (const s of d.order) env[s.name] = evaluate(s.expr!, env);
  return env;
}

/** Register values after the clock edge, for the settled env. */
export function nextState(d: Design, env: Env): Env {
  const out: Env = {};
  for (const r of d.regs) out[r.name] = r.next ? evaluate(r.next, env) : env[r.name]!;
  return out;
}

export function initialState(d: Design): Env {
  return Object.fromEntries(d.regs.map((r) => [r.name, r.init]));
}

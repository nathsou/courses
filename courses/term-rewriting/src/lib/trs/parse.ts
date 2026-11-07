/**
 * The course's rule language: Girafe syntax (https://github.com/nathsou/girafe) plus a few extensions.
 *
 *   -- a comment
 *   +(0, y) -> y                     a rule: Girafe's prefix syntax, unchanged
 *   *(*(x, y), z) == *(x, *(y, z))   an equation (for completion and proofs)
 *   [Fold] +(0, y) -> y              a labelled rule (strategies refer to labels)
 *   Max(x, y) -> x if >=(x, y) ->* True    a conditional rule (`->*` reachability or `==` joinability)
 *   ? +(S(0), S(0))                  a query: normalise this term
 *   ? *(x, E) == x                   a goal: are the two sides equal?
 *   #infixl 6 +                      declare an infix operator (also #infixr, #infix); then `x + 0 -> x`
 *   #priority                        rules are tried in file order (Girafe's semantics)
 *   #ac + *                          declare associative-commutative symbols
 *   #strategy simp = innermost(Fold <+ Unit)
 *   #precedence I > * > E            a precedence for path orders and completion
 *
 * Lexical conventions follow Girafe: a name starting with a lower-case letter is a variable, every
 * other name (upper case, digit, or one of . - ~ + * & | / \ ^ % ° $ @ # ; : _ = ' > < !) is a
 * function symbol; `_` is a fresh variable; `t?` marks a lazy term. Infix operators need spaces around
 * them because those characters can also appear inside names.
 */
import { v, f, show, type Term, type Fixity, vars } from './term';

export interface Loc {
  line: number;
  col: number;
  from: number;
  to: number;
}

export interface Diagnostic extends Loc {
  severity: 'error' | 'warning';
  message: string;
}

export interface Condition {
  kind: 'reach' | 'join';
  left: Term;
  right: Term;
}

export interface Rule {
  lhs: Term;
  rhs: Term;
  label?: string;
  conditions?: Condition[];
  loc?: Loc;
}

export interface Equation {
  left: Term;
  right: Term;
  label?: string;
  loc?: Loc;
}

export interface Query {
  term: Term;
  /** `? s == t`: a goal equation (the query asks whether s and t are equal). */
  goal?: Term;
  loc?: Loc;
}

export interface Pragma {
  name: string;
  /** Everything after the pragma name, trimmed. */
  text: string;
  args: string[];
  loc: Loc;
}

export interface Program {
  rules: Rule[];
  equations: Equation[];
  queries: Query[];
  pragmas: Pragma[];
  fixity: Fixity;
  /** `#priority`: the first matching rule (in file order) wins. */
  priority: boolean;
  /** Associative-commutative symbols (`#ac`). */
  ac: Set<string>;
  /** Named strategies (`#strategy name = expr`), as source text. */
  strategies: Map<string, string>;
  /** `#precedence a > b > c`, highest first. */
  precedence?: string[];
  /** For each symbol, which argument positions are lazy (`F(x?, y)` on a left-hand side). */
  lazy: Map<string, boolean[]>;
  diagnostics: Diagnostic[];
}

// ───────────── lexer ─────────────

type TokKind = 'var' | 'sym' | '(' | ')' | ',' | '?' | '->' | '->*' | '==' | '[' | ']' | 'if' | 'eol';

interface Tok {
  kind: TokKind;
  text: string;
  from: number;
  to: number;
  line: number;
  col: number;
  /** True when whitespace (or a line break) separates this token from the previous one. */
  spaced: boolean;
  /** First token on its line. */
  lineStart: boolean;
}

const SPECIAL = new Set('.-~+*&|/\\^%°$@#;:_=\'><!'.split(''));
const isNameChar = (ch: string | undefined) => ch !== undefined && (/[A-Za-z0-9]/.test(ch) || SPECIAL.has(ch) || /[\p{L}]/u.test(ch));
const isLower = (ch: string) => /\p{Ll}/u.test(ch);

class ParseError extends Error {
  constructor(
    message: string,
    public tok: Tok,
  ) {
    super(message);
  }
}

function lexLine(src: string, lineStart: number, lineNo: number, out: Tok[]): void {
  let i = lineStart;
  let first = true;
  let spaced = true;
  const end = src.indexOf('\n', lineStart) === -1 ? src.length : src.indexOf('\n', lineStart);
  while (i < end) {
    const ch = src[i]!;
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i++;
      spaced = true;
      continue;
    }
    if (ch === '-' && src[i + 1] === '-') break; // comment
    const start = i;
    let kind: TokKind;
    let text: string;
    if (ch === '-' && src[i + 1] === '>') {
      if (src[i + 2] === '*' && (i + 3 >= end || /\s/.test(src[i + 3]!))) {
        kind = '->*';
        i += 3;
      } else {
        kind = '->';
        i += 2;
      }
      text = src.slice(start, i);
    } else if ('(),?[]'.includes(ch)) {
      kind = ch as TokKind;
      text = ch;
      i++;
    } else if (isNameChar(ch)) {
      while (i < end && isNameChar(src[i]) && !(src[i] === '-' && (src[i + 1] === '>' || src[i + 1] === '-'))) i++;
      text = src.slice(start, i);
      if (text === '==') kind = '==';
      else if (text === 'if') kind = 'if';
      else if (text === '_') kind = 'var';
      else kind = isLower(text[0]!) ? 'var' : 'sym';
    } else {
      throw new ParseError(`unexpected character “${ch}”`, { kind: 'eol', text: ch, from: i, to: i + 1, line: lineNo, col: i - lineStart + 1, spaced, lineStart: first });
    }
    out.push({ kind, text, from: start, to: i, line: lineNo, col: start - lineStart + 1, spaced, lineStart: first });
    first = false;
    spaced = false;
  }
}

// ───────────── parser ─────────────

const loc = (a: Tok, b: Tok = a): Loc => ({ line: a.line, col: a.col, from: a.from, to: b.to });

interface FixEntry {
  prec: number;
  assoc: 'left' | 'right' | 'none';
}

class Parser {
  pos = 0;
  wild = 0;
  constructor(
    public toks: Tok[],
    public fixity: Map<string, FixEntry>,
  ) {}
  peek(o = 0): Tok {
    return this.toks[this.pos + o] ?? this.toks[this.toks.length - 1]!;
  }
  next(): Tok {
    return this.toks[this.pos++] ?? this.toks[this.toks.length - 1]!;
  }
  expect(kind: TokKind, what = `“${kind}”`): Tok {
    const t = this.peek();
    if (t.kind !== kind) throw new ParseError(`expected ${what}, found ${describe(t)}`, t);
    return this.next();
  }
  atEnd(): boolean {
    return this.peek().kind === 'eol' && this.pos >= this.toks.length - 1;
  }

  /** term := primary (infixOp term)*, with precedence climbing. */
  term(minPrec = 0): Term {
    let left = this.primary();
    for (;;) {
      const t = this.peek();
      if (t.kind !== 'sym' || t.lineStart) break;
      const fx = this.fixity.get(t.text);
      if (!fx || fx.prec < minPrec) break;
      // `+(…)` immediately after a term is not an infix use.
      if (this.peek(1).kind === '(' && !this.peek(1).spaced) break;
      this.next();
      const nextMin = fx.assoc === 'right' ? fx.prec : fx.prec + 1;
      const right = this.term(nextMin);
      left = f(t.text, left, right);
      if (fx.assoc === 'none') {
        const n = this.peek();
        if (n.kind === 'sym' && this.fixity.get(n.text)?.prec === fx.prec && !n.lineStart) throw new ParseError(`“${t.text}” is non-associative: add parentheses`, n);
      }
    }
    return left;
  }

  primary(): Term {
    const t = this.next();
    let out: Term;
    if (t.kind === 'var') {
      out = t.text === '_' ? v(`_${++this.wild}`) : v(t.text);
    } else if (t.kind === 'sym' || (t.kind === 'if' && this.peek().kind === '(')) {
      const name = t.text;
      if (this.peek().kind === '(' && !this.peek().spaced) {
        this.next();
        const args: Term[] = [];
        if (this.peek().kind !== ')') {
          for (;;) {
            args.push(this.term());
            if (this.peek().kind === ',') {
              this.next();
              continue;
            }
            break;
          }
        }
        this.expect(')', '“,” or “)”');
        out = f(name, ...args);
      } else out = f(name);
    } else if (t.kind === '(') {
      out = this.term();
      this.expect(')');
    } else {
      throw new ParseError(`expected a term, found ${describe(t)}`, t);
    }
    if (this.peek().kind === '?' && !this.peek().spaced) {
      this.next();
      out = f('?', out);
    }
    return out;
  }
}

function describe(t: Tok): string {
  if (t.kind === 'eol') return 'the end of the line';
  if (t.kind === 'var') return `variable “${t.text}”`;
  if (t.kind === 'sym') return `symbol “${t.text}”`;
  return `“${t.text}”`;
}

const FIXITY_PRAGMAS: Record<string, 'left' | 'right' | 'none'> = { infixl: 'left', infixr: 'right', infix: 'none' };
const KNOWN_PRAGMAS = new Set(['infixl', 'infixr', 'infix', 'priority', 'ac', 'strategy', 'precedence', 'sort', 'op', 'order', 'weights', 'interpret', 'name']);

/** Remove `?` lazy markers from a left-hand side, recording which argument positions are lazy. */
function stripLazy(t: Term, lazy: Map<string, boolean[]>): Term {
  if (t.type === 'var') return t;
  const args = t.args.map((a, i) => {
    if (a.type === 'fn' && a.name === '?' && a.args.length === 1) {
      const flags = lazy.get(t.name) ?? [];
      flags[i] = true;
      lazy.set(t.name, flags);
      return stripLazy(a.args[0]!, lazy);
    }
    return stripLazy(a, lazy);
  });
  return f(t.name, ...args);
}

/** Parse a whole program. Never throws: problems are reported in `diagnostics`. */
export function parseProgram(src: string): Program {
  const prog: Program = {
    rules: [],
    equations: [],
    queries: [],
    pragmas: [],
    fixity: new Map(),
    priority: false,
    ac: new Set(),
    strategies: new Map(),
    lazy: new Map(),
    diagnostics: [],
  };
  const fixity = prog.fixity as Map<string, FixEntry>;
  const lines: { start: number; no: number; text: string }[] = [];
  {
    let start = 0;
    let no = 1;
    for (;;) {
      const nl = src.indexOf('\n', start);
      const endIdx = nl === -1 ? src.length : nl;
      lines.push({ start, no, text: src.slice(start, endIdx) });
      if (nl === -1) break;
      start = nl + 1;
      no++;
    }
  }

  // Pass 1: pragmas (fixity must be known before any term is parsed).
  const body: typeof lines = [];
  for (const ln of lines) {
    const m = /^(\s*)#([a-z][a-z-]*)\b(.*)$/.exec(ln.text);
    if (!m) {
      body.push(ln);
      continue;
    }
    const text = m[3]!.replace(/\s--.*$/, '').trim();
    const l: Loc = { line: ln.no, col: m[1]!.length + 1, from: ln.start + m[1]!.length, to: ln.start + ln.text.length };
    const p: Pragma = { name: m[2]!, text, args: text.split(/\s+/).filter(Boolean), loc: l };
    prog.pragmas.push(p);
    const err = (message: string) => prog.diagnostics.push({ ...l, severity: 'error', message });
    if (p.name in FIXITY_PRAGMAS) {
      const [precText, ...ops] = p.args;
      const prec = Number(precText);
      if (!Number.isInteger(prec) || prec < 0 || prec > 20 || ops.length === 0) err(`usage: #${p.name} <precedence 0–20> <operator>…`);
      else for (const op of ops) fixity.set(op, { prec, assoc: FIXITY_PRAGMAS[p.name]! });
    } else if (p.name === 'priority') prog.priority = true;
    else if (p.name === 'ac') {
      if (p.args.length === 0) err('usage: #ac <symbol>…');
      for (const s of p.args) prog.ac.add(s);
    } else if (p.name === 'strategy') {
      const sm = /^([A-Za-z][\w']*)\s*=\s*(.+)$/.exec(text);
      if (!sm) err('usage: #strategy name = expression');
      else prog.strategies.set(sm[1]!, sm[2]!);
    } else if (p.name === 'precedence') {
      const syms = text.split('>').map((s) => s.trim()).filter(Boolean);
      if (syms.length === 0) err('usage: #precedence F > G > H');
      else prog.precedence = syms;
    } else if (!KNOWN_PRAGMAS.has(p.name)) {
      prog.diagnostics.push({ ...l, severity: 'warning', message: `unknown pragma #${p.name} (ignored)` });
    }
  }

  // Pass 2: statements. Lex everything, then split into statements.
  const toks: Tok[] = [];
  for (const ln of body) {
    try {
      lexLine(src, ln.start, ln.no, toks);
    } catch (e) {
      if (e instanceof ParseError) prog.diagnostics.push({ ...loc(e.tok), severity: 'error', message: e.message });
    }
  }
  const eof: Tok = { kind: 'eol', text: '', from: src.length, to: src.length, line: lines.length, col: (lines.at(-1)?.text.length ?? 0) + 1, spaced: true, lineStart: true };
  toks.push(eof);
  const P = new Parser(toks, fixity);

  const skipToNextLine = (line: number) => {
    while (!P.atEnd() && !(P.peek().lineStart && P.peek().line > line)) P.next();
  };

  while (!P.atEnd()) {
    const first = P.peek();
    try {
      // A query: `?` at the start of a line.
      if (first.kind === '?' && first.lineStart) {
        P.next();
        const t = P.term();
        let goal: Term | undefined;
        if (P.peek().kind === '==') {
          P.next();
          goal = P.term();
        }
        prog.queries.push(goal ? { term: t, goal, loc: loc(first, P.toks[P.pos - 1]) } : { term: t, loc: loc(first, P.toks[P.pos - 1]) });
        endOfStatement(P);
        continue;
      }
      let label: string | undefined;
      if (first.kind === '[') {
        P.next();
        const name = P.next();
        if (name.kind !== 'sym' && name.kind !== 'var') throw new ParseError('expected a rule label', name);
        label = name.text;
        P.expect(']');
      }
      const left = P.term();
      const op = P.peek();
      if (op.kind === '->') {
        P.next();
        let lhs = left;
        if (lhs.type === 'var') throw new ParseError('the left-hand side of a rule cannot be a variable', first);
        lhs = stripLazy(lhs, prog.lazy);
        const rhs = P.term();
        let conditions: Condition[] | undefined;
        if (P.peek().kind === 'if' && !(P.peek(1).kind === '(' && !P.peek(1).spaced)) {
          P.next();
          conditions = [];
          for (;;) {
            const a = P.term();
            const k = P.peek();
            if (k.kind !== '->*' && k.kind !== '==') throw new ParseError('expected “->*” or “==” in a condition', k);
            P.next();
            const b = P.term();
            conditions.push({ kind: k.kind === '->*' ? 'reach' : 'join', left: a, right: b });
            if (P.peek().kind === ',') {
              P.next();
              continue;
            }
            break;
          }
        }
        const rule: Rule = { lhs, rhs, loc: loc(first, P.toks[P.pos - 1]) };
        if (label) rule.label = label;
        if (conditions) rule.conditions = conditions;
        const lv = new Set(vars(lhs));
        const condVars = new Set<string>();
        for (const c of conditions ?? []) for (const x of [...vars(c.left), ...vars(c.right)]) condVars.add(x);
        const extra = vars(rhs).filter((x) => !lv.has(x) && !condVars.has(x));
        if (extra.length) prog.diagnostics.push({ ...rule.loc!, severity: 'error', message: `variable${extra.length > 1 ? 's' : ''} ${extra.join(', ')} on the right-hand side do${extra.length > 1 ? '' : 'es'} not occur on the left` });
        prog.rules.push(rule);
      } else if (op.kind === '==') {
        P.next();
        const right = P.term();
        const eq: Equation = { left, right, loc: loc(first, P.toks[P.pos - 1]) };
        if (label) eq.label = label;
        prog.equations.push(eq);
      } else {
        throw new ParseError(`expected “->” or “==”, found ${describe(op)}`, op);
      }
      endOfStatement(P);
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
      prog.diagnostics.push({ ...loc(e.tok), severity: 'error', message: e.message });
      skipToNextLine(e.tok.line);
    }
  }
  return prog;
}

function endOfStatement(P: Parser): void {
  const t = P.peek();
  if (P.atEnd()) return;
  // A statement may continue over several lines, but the next one must start on a new line.
  if (!t.lineStart) throw new ParseError(`unexpected ${describe(t)} after the end of the statement`, t);
}

/** Parse a single term (throws on error). Fixity can be given to allow infix operators. */
export function parseTerm(src: string, fixity?: Fixity): Term {
  const toks: Tok[] = [];
  try {
    src.split('\n').reduce((start, text, i) => {
      lexLine(src, start, i + 1, toks);
      return start + text.length + 1;
    }, 0);
  } catch (e) {
    if (e instanceof ParseError) throw new Error(e.message);
    throw e;
  }
  // Within a single term, line starts do not end the term.
  for (const t of toks) t.lineStart = false;
  toks.push({ kind: 'eol', text: '', from: src.length, to: src.length, line: 1, col: src.length + 1, spaced: true, lineStart: true });
  const P = new Parser(toks, new Map(fixity ?? []));
  try {
    const t = P.term();
    if (!P.atEnd()) throw new ParseError(`unexpected ${describe(P.peek())}`, P.peek());
    return t;
  } catch (e) {
    if (e instanceof ParseError) throw new Error(e.message);
    throw e;
  }
}

/** Parse a program and throw on the first error (for tests and fixed examples). */
export function parseStrict(src: string): Program {
  const p = parseProgram(src);
  const err = p.diagnostics.find((d) => d.severity === 'error');
  if (err) throw new Error(`line ${err.line}: ${err.message}`);
  return p;
}

/** Shorthand: the rules of a program. */
export const rules = (src: string): Rule[] => parseStrict(src).rules;
/** Shorthand for a term in prefix syntax. */
export const term = (src: string, fixity?: Fixity): Term => parseTerm(src, fixity);

export function showRule(r: Rule, fixity?: Fixity, showTerm?: (t: Term, fx?: Fixity) => string): string {
  const sh = showTerm ?? show;
  const cond = r.conditions?.length ? ` if ${r.conditions.map((c) => `${sh(c.left, fixity)} ${c.kind === 'reach' ? '->*' : '=='} ${sh(c.right, fixity)}`).join(', ')}` : '';
  return `${r.label ? `[${r.label}] ` : ''}${sh(r.lhs, fixity)} -> ${sh(r.rhs, fixity)}${cond}`;
}


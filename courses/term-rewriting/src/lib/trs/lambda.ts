/**
 * The λ-calculus and combinatory logic, as first-order rewriting.
 *
 * λ-terms are parsed from `\x. M` (or `λx. M`) notation. Bracket abstraction translates them into
 * S, K and I combinators, written with the binary application symbol `Ap`, so that the SKI rules
 * are an ordinary (orthogonal) rewrite system.
 */
import { f, show, type Term } from './term';
import { rules as parseRules } from './parse';

export type Lam = { k: 'var'; name: string } | { k: 'lam'; x: string; body: Lam } | { k: 'app'; fn: Lam; arg: Lam } | { k: 'const'; name: string };

export function parseLambda(src: string): Lam {
  const toks = src.match(/\\|λ|\.|\(|\)|[A-Za-z_][\w']*/g) ?? [];
  let i = 0;
  const atom = (): Lam | null => {
    const t = toks[i];
    if (t === undefined || t === ')' || t === '.') return null;
    if (t === '(') {
      i++;
      const e = expr();
      if (toks[i++] !== ')') throw new Error('expected “)”');
      return e;
    }
    if (t === '\\' || t === 'λ') {
      i++;
      const xs: string[] = [];
      while (toks[i] && toks[i] !== '.') xs.push(toks[i++]!);
      if (toks[i++] !== '.' || xs.length === 0) throw new Error('expected “\\x. body”');
      const body = expr();
      return xs.reduceRight<Lam>((b, x) => ({ k: 'lam', x, body: b }), body);
    }
    i++;
    return /^[A-Z]/.test(t) ? { k: 'const', name: t } : { k: 'var', name: t };
  };
  const expr = (): Lam => {
    let e = atom();
    if (!e) throw new Error(`unexpected ${toks[i] ?? 'end of input'}`);
    for (;;) {
      const a = atom();
      if (!a) return e;
      e = { k: 'app', fn: e, arg: a };
    }
  };
  const e = expr();
  if (i < toks.length) throw new Error(`unexpected “${toks[i]}”`);
  return e;
}

export function showLambda(e: Lam): string {
  switch (e.k) {
    case 'var':
    case 'const':
      return e.name;
    case 'lam':
      return `λ${e.x}. ${showLambda(e.body)}`;
    case 'app': {
      const fn = e.fn.k === 'lam' ? `(${showLambda(e.fn)})` : showLambda(e.fn);
      const arg = e.arg.k === 'app' || e.arg.k === 'lam' ? `(${showLambda(e.arg)})` : showLambda(e.arg);
      return `${fn} ${arg}`;
    }
  }
}

const freeIn = (x: string, e: Lam): boolean => (e.k === 'var' ? e.name === x : e.k === 'const' ? false : e.k === 'lam' ? e.x !== x && freeIn(x, e.body) : freeIn(x, e.fn) || freeIn(x, e.arg));

type CL = { k: 'S' | 'K' | 'I' } | { k: 'var' | 'const'; name: string } | { k: 'app'; fn: CL; arg: CL };
const S: CL = { k: 'S' }, K: CL = { k: 'K' }, I: CL = { k: 'I' };
const app = (a: CL, b: CL): CL => ({ k: 'app', fn: a, arg: b });

/** Abstract x from a combinatory term: [x]M, with the usual optimisations (K when x is not free, η). */
function abstract(x: string, m: CL): CL {
  const free = (c: CL): boolean => (c.k === 'var' ? c.name === x : c.k === 'app' ? free(c.fn) || free(c.arg) : false);
  if (!free(m)) return app(K, m);
  if (m.k === 'var') return I;
  if (m.k === 'app') {
    if (m.arg.k === 'var' && m.arg.name === x && !free(m.fn)) return m.fn; // η
    return app(app(S, abstract(x, m.fn)), abstract(x, m.arg));
  }
  return app(K, m);
}

function toCL(e: Lam): CL {
  switch (e.k) {
    case 'var':
      return { k: 'var', name: e.name };
    case 'const':
      return { k: 'const', name: e.name };
    case 'app':
      return app(toCL(e.fn), toCL(e.arg));
    case 'lam':
      return abstract(e.x, toCL(e.body));
  }
}

function clTerm(c: CL): Term {
  switch (c.k) {
    case 'S':
    case 'K':
    case 'I':
      return f(c.k);
    case 'var':
      return { type: 'var', name: c.name };
    case 'const':
      return f(c.name);
    case 'app':
      return f('Ap', clTerm(c.fn), clTerm(c.arg));
  }
}

/** Translate a λ-term to a combinatory term (with `Ap` for application). */
export const bracketAbstraction = (e: Lam): Term => clTerm(toCL(e));

/** The rules of combinatory logic. */
export const SKI = parseRules(`
Ap(I, x) -> x
Ap(Ap(K, x), y) -> x
Ap(Ap(Ap(S, x), y), z) -> Ap(Ap(x, z), Ap(y, z))
`);

/** Print an `Ap` term with juxtaposition, as combinatory logic is usually written. */
export function showCL(t: Term): string {
  if (t.type === 'var') return t.name;
  if (t.name === 'Ap' && t.args.length === 2) {
    const [a, b] = t.args as [Term, Term];
    const right = b.type === 'fn' && b.name === 'Ap' ? `(${showCL(b)})` : showCL(b);
    return `${showCL(a)} ${right}`;
  }
  return show(t);
}

/** De Bruijn indices: `λx. λy. x` becomes `λ λ 1` (indices from 0 here, printed from 1). */
export type DB = { k: 'idx'; i: number } | { k: 'lam'; body: DB } | { k: 'app'; fn: DB; arg: DB } | { k: 'free'; name: string };

export function toDeBruijn(e: Lam, ctx: string[] = []): DB {
  switch (e.k) {
    case 'var': {
      const i = ctx.indexOf(e.name);
      return i < 0 ? { k: 'free', name: e.name } : { k: 'idx', i };
    }
    case 'const':
      return { k: 'free', name: e.name };
    case 'lam':
      return { k: 'lam', body: toDeBruijn(e.body, [e.x, ...ctx]) };
    case 'app':
      return { k: 'app', fn: toDeBruijn(e.fn, ctx), arg: toDeBruijn(e.arg, ctx) };
  }
}

export function showDB(d: DB): string {
  if (d.k === 'idx') return String(d.i + 1);
  if (d.k === 'free') return d.name;
  if (d.k === 'lam') return `λ ${showDB(d.body)}`;
  const fn = d.fn.k === 'lam' ? `(${showDB(d.fn)})` : showDB(d.fn);
  const arg = d.arg.k === 'idx' || d.arg.k === 'free' ? showDB(d.arg) : `(${showDB(d.arg)})`;
  return `${fn} ${arg}`;
}

/** A de Bruijn term as a first-order term for the λυ calculus: Lam(M), App(M, N), Var(n) with Peano n (1 = One). */
export function dbTerm(d: DB): Term {
  const nat = (i: number): Term => (i === 0 ? f('One') : f('Succ', nat(i - 1)));
  if (d.k === 'idx') return f('Var', nat(d.i));
  if (d.k === 'free') return f(d.name);
  if (d.k === 'lam') return f('Lam', dbTerm(d.body));
  return f('App', dbTerm(d.fn), dbTerm(d.arg));
}

/** The λυ calculus of explicit substitutions (Lescanne, 1994), first-order and orthogonal enough to run. */
export const LAMBDA_UPSILON = parseRules(`
App(Lam(a), b) -> Sub(a, Slash(b))
Sub(App(a, b), s) -> App(Sub(a, s), Sub(b, s))
Sub(Lam(a), s) -> Lam(Sub(a, Lift(s)))
Sub(Var(One), Slash(a)) -> a
Sub(Var(Succ(n)), Slash(a)) -> Var(n)
Sub(Var(One), Lift(s)) -> Var(One)
Sub(Var(Succ(n)), Lift(s)) -> Sub(Sub(Var(n), s), Shift)
Sub(Var(n), Shift) -> Var(Succ(n))
`);

export { freeIn };

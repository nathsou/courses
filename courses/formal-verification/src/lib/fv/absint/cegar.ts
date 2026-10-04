/**
 * Counterexample-guided abstraction refinement (chapter 27; Clarke, Grumberg, Jha, Lu and Veith, 2000) over
 * predicate abstraction (Graf and Saïdi, 1997), for small functions.
 *
 * The program is a control-flow graph whose edges are assignments and assumptions (an `if` is two assumptions; an
 * assertion is an edge to the error node assuming its negation). The abstraction keeps, at each node, which truth
 * values of a few predicates (such as `x < n`) are possible. Abstract reachability decides with the SMT solver
 * which valuations an edge can lead to. If the error node is unreachable, the assertions hold. If it is reachable,
 * the abstract path is checked on the concrete program: its weakest precondition, conjoined with the
 * precondition, is satisfiable exactly when some input follows the path. A satisfiable path is a real
 * counterexample (its input is replayed). An unsatisfiable one is spurious, and the atoms of the conditions
 * computed along it become new predicates, which rule that path out at the next round.
 */
import type { Span } from '../vouch/syntax/lexer';
import { fromVouch, type WStmt, type WpProgram } from '../wp/wp';
import { and, not, or, subst, v, INT, BOOL, TRUE, FALSE, pretty, type Term } from '../logic/term';
import { checkSat } from '../smt/solver';

export interface Edge {
  from: number;
  to: number;
  kind: 'assign' | 'assume';
  xs?: string[];
  es?: Term[];
  c?: Term;
  text: string;
  span: Span;
}

export interface Cfg {
  nodes: { id: number; label: string; line?: number }[];
  edges: Edge[];
  entry: number;
  error: number;
  exit: number;
}

const showTerm = (t: Term) => toVouch(t).replace(/^\((.*)\)$/, '$1');

/** The control-flow graph of the function's statements. */
export function buildCfg(prog: WpProgram, lineOf: (off: number) => number): Cfg {
  const nodes: Cfg['nodes'] = [];
  const edges: Edge[] = [];
  const node = (label: string, line?: number) => (nodes.push({ id: nodes.length, label, line }), nodes.length - 1);
  const entry = node('entry');
  const error = node('error');
  const exit = node('exit');
  const walk = (ss: WStmt[], cur: number): number => {
    for (const s of ss) {
      const line = lineOf(s.span.start);
      switch (s.k) {
        case 'assign': {
          const n = node(`line ${line}`, line);
          edges.push({ from: cur, to: n, kind: 'assign', xs: s.xs, es: s.es, text: s.text, span: s.span });
          cur = n;
          break;
        }
        case 'assume': {
          const n = node(`line ${line}`, line);
          edges.push({ from: cur, to: n, kind: 'assume', c: s.c, text: s.text, span: s.span });
          cur = n;
          break;
        }
        case 'assert': {
          const n = node(`line ${line}`, line);
          edges.push({ from: cur, to: n, kind: 'assume', c: s.c, text: s.text, span: s.span });
          edges.push({ from: cur, to: error, kind: 'assume', c: not(s.c), text: `${s.text} fails`, span: s.span });
          cur = n;
          break;
        }
        case 'if': {
          const t = node(`line ${line} (then)`, line);
          const f = node(`line ${line} (else)`, line);
          edges.push({ from: cur, to: t, kind: 'assume', c: s.c, text: showTerm(s.c), span: s.span });
          edges.push({ from: cur, to: f, kind: 'assume', c: not(s.c), text: `!(${showTerm(s.c)})`, span: s.span });
          const te = walk(s.then, t);
          const fe = walk(s.else, f);
          const j = node(`after line ${line}`, line);
          edges.push({ from: te, to: j, kind: 'assume', c: TRUE, text: '', span: s.span });
          edges.push({ from: fe, to: j, kind: 'assume', c: TRUE, text: '', span: s.span });
          cur = j;
          break;
        }
        case 'while': {
          const head = node(`loop head, line ${line}`, line);
          edges.push({ from: cur, to: head, kind: 'assume', c: TRUE, text: '', span: s.span });
          const b = node(`line ${line} (body)`, line);
          edges.push({ from: head, to: b, kind: 'assume', c: s.c, text: showTerm(s.c), span: s.span });
          const be = walk(s.body, b);
          edges.push({ from: be, to: head, kind: 'assume', c: TRUE, text: '', span: s.span });
          const out = node(`after line ${line}`, line);
          edges.push({ from: head, to: out, kind: 'assume', c: not(s.c), text: `!(${showTerm(s.c)})`, span: s.span });
          cur = out;
          break;
        }
        case 'return': {
          edges.push({ from: cur, to: exit, kind: 'assume', c: TRUE, text: s.text, span: s.span });
          cur = node('unreachable');
          break;
        }
      }
    }
    return cur;
  };
  const end = walk(prog.body, entry);
  edges.push({ from: end, to: exit, kind: 'assume', c: TRUE, text: '', span: prog.body.at(-1)?.span ?? { start: 0, end: 0 } });
  return { nodes, edges, entry, error, exit };
}

export interface CegarRound {
  predicates: string[];
  /** For each node, the reachable valuations, as the conjunctions they stand for. */
  reachable: { node: number; label: string; states: string[] }[];
  /** The abstract path to the error node, if any, as the edges' texts. */
  path?: { text: string; line: number }[];
  /** Spurious (with the new predicates) or real (with an input). */
  verdict: 'safe' | 'spurious' | 'real' | 'gave-up';
  newPredicates?: string[];
  input?: Record<string, string>;
  queries: number;
}

export interface CegarResult {
  status: 'safe' | 'unsafe' | 'unknown';
  rounds: CegarRound[];
  cfg: Cfg;
  /** At each loop head, the disjunction of the reachable valuations (an invariant), in Vouch syntax. */
  invariants: { line: number; text: string }[];
}

const sortOf = (prog: WpProgram, x: string) => (prog.sorts.get(x) === 'bool' ? BOOL : INT);

/** Atomic formulas of a term (comparisons and Boolean variables), without negation. */
function atoms(t: Term, out: Term[] = []): Term[] {
  if (['and', 'or', 'not', 'imp', 'iff'].includes(t.op)) for (const a of t.args) atoms(a, out);
  else if (t.op !== 'true' && t.op !== 'false') out.push(t);
  return out;
}

export function cegar(source: string, fnName?: string, opts: { maxRounds?: number; maxPredicates?: number; initial?: string[] } = {}): CegarResult {
  const prog = fromVouch(source, fnName);
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1);
  const lineOf = (off: number) => {
    let k = 0;
    while (k + 1 < starts.length && starts[k + 1]! <= off) k++;
    return k + 1;
  };
  const cfg = buildCfg(prog, lineOf);
  const rounds: CegarRound[] = [];
  // Start with the assertions' conditions as predicates.
  const preds: Term[] = [];
  const addPred = (p: Term): boolean => {
    if (p.op === 'true' || p.op === 'false') return false;
    const q = p.op === 'not' ? p.args[0]! : p;
    if (preds.includes(q) || preds.length >= (opts.maxPredicates ?? 8)) return false;
    preds.push(q);
    return true;
  };
  for (const e of cfg.edges) if (e.to === cfg.error && e.c) atoms(not(e.c)).forEach(addPred);
  let queries = 0;
  const sat = (fs: Term[]) => {
    queries++;
    return checkSat(fs, { timeout: 2000 }).status;
  };
  const gamma = (val: number) => and(...preds.map((p, i) => (val >> i) & 1 ? p : not(p)));
  const showVal = (val: number) => (preds.length ? preds.map((p, i) => ((val >> i) & 1 ? showTerm(p) : `!(${showTerm(p)})`)).join(' && ') : 'true');

  for (let round = 0; round < (opts.maxRounds ?? 8); round++) {
    queries = 0;
    const K = preds.length;
    const all = Array.from({ length: 1 << K }, (_, i) => i);
    // Abstract reachability: BFS over (node, valuation), keeping a parent edge for each.
    const seen = new Map<string, { node: number; val: number; parent?: string; edge?: Edge }>();
    const queue: string[] = [];
    for (const val of all) {
      if (sat([prog.pre, gamma(val)]) === 'unsat') continue;
      const k = `${cfg.entry}:${val}`;
      seen.set(k, { node: cfg.entry, val });
      queue.push(k);
    }
    let hit: string | undefined;
    while (queue.length && !hit) {
      const k = queue.shift()!;
      const st = seen.get(k)!;
      for (const e of cfg.edges.filter((x) => x.from === st.node)) {
        const posts: number[] = [];
        if (e.kind === 'assume') {
          if (e.c === TRUE || sat([gamma(st.val), e.c!]) !== 'unsat') posts.push(st.val);
        } else {
          const m = new Map<Term, Term>(e.xs!.map((x, i) => [v(x, sortOf(prog, x)), e.es![i]!]));
          for (const val2 of all) if (sat([gamma(st.val), subst(gamma(val2), m)]) !== 'unsat') posts.push(val2);
        }
        for (const val2 of posts) {
          const k2 = `${e.to}:${val2}`;
          if (seen.has(k2)) continue;
          seen.set(k2, { node: e.to, val: val2, parent: k, edge: e });
          if (e.to === cfg.error) {
            hit = k2;
            break;
          }
          queue.push(k2);
        }
        if (hit) break;
      }
    }
    const reachable = cfg.nodes
      .map((n) => ({ node: n.id, label: n.label, states: [...seen.values()].filter((s) => s.node === n.id).map((s) => showVal(s.val)) }))
      .filter((r) => r.states.length);
    const r: CegarRound = { predicates: preds.map(showTerm), reachable, verdict: 'safe', queries: 0 };
    rounds.push(r);
    if (!hit) {
      r.queries = queries;
      // Invariants at loop heads: the disjunction of the reachable valuations.
      const feasible = all.filter((val) => sat([gamma(val)]) !== 'unsat');
      const invariants = cfg.nodes
        .filter((n) => n.label.startsWith('loop head'))
        .map((n) => {
          const on = [...seen.values()].filter((s) => s.node === n.id).map((s) => s.val);
          const off = feasible.filter((x) => !on.includes(x));
          return { line: n.line ?? 0, text: toVouch(minimise(on, off, K, (i, pos) => (pos ? preds[i]! : not(preds[i]!)))) };
        });
      return { status: 'safe', rounds, cfg, invariants };
    }
    // The abstract counterexample, from the entry to the error node.
    const path: Edge[] = [];
    for (let k: string | undefined = hit; k && seen.get(k)!.edge; k = seen.get(k)!.parent) path.unshift(seen.get(k)!.edge!);
    r.path = path.filter((e) => e.text).map((e) => ({ text: e.text, line: lineOf(e.span.start) }));
    // Its weakest precondition, edge by edge, backwards: the conditions under which the rest of the path runs.
    const conds: Term[] = [];
    let F: Term = TRUE;
    for (let i = path.length - 1; i >= 0; i--) {
      const e = path[i]!;
      if (e.kind === 'assume') F = and(e.c!, F);
      else F = subst(F, new Map(e.xs!.map((x, j) => [v(x, sortOf(prog, x)), e.es![j]!])));
      conds.unshift(F);
    }
    const q = checkSat([prog.pre, F], { timeout: 3000 });
    queries++;
    r.queries = queries;
    if (q.status === 'sat' && q.model) {
      r.verdict = 'real';
      r.input = Object.fromEntries(prog.params.map((p) => [p, String(q.model!.vars.get(p) ?? '0')]));
      return { status: 'unsafe', rounds, cfg, invariants: [] };
    }
    if (q.status !== 'unsat') {
      r.verdict = 'gave-up';
      return { status: 'unknown', rounds, cfg, invariants: [] };
    }
    r.verdict = 'spurious';
    const before = preds.length;
    for (const c of conds) atoms(c).forEach(addPred);
    r.newPredicates = preds.slice(before).map(showTerm);
    if (preds.length === before) {
      r.verdict = 'gave-up';
      return { status: 'unknown', rounds, cfg, invariants: [] };
    }
  }
  return { status: 'unknown', rounds, cfg, invariants: [] };
}

/**
 * A small formula for a set of valuations (on), given the valuations it must exclude (off): each valuation is a
 * cube of literals; literals are dropped while the cube still excludes every off valuation; subsumed cubes go.
 * Valuations in neither set (contradictory ones) may be covered or not.
 */
function minimise(on: number[], off: number[], K: number, lit: (i: number, pos: boolean) => Term): Term {
  type Cube = Map<number, boolean>;
  const covers = (c: Cube, val: number) => [...c].every(([i, b]) => (((val >> i) & 1) === 1) === b);
  const cubes: Cube[] = on.map((val) => new Map(Array.from({ length: K }, (_, i) => [i, ((val >> i) & 1) === 1] as [number, boolean])));
  for (const c of cubes)
    for (const i of [...c.keys()]) {
      const b = c.get(i)!;
      c.delete(i);
      if (off.some((x) => covers(c, x))) c.set(i, b);
    }
  const key = (c: Cube) => [...c].sort().map(([i, b]) => `${b ? '' : '!'}${i}`).join(',');
  const unique = [...new Map(cubes.map((c) => [key(c), c])).values()];
  const kept = unique.filter((c) => !unique.some((d) => d !== c && d.size < c.size && [...d].every(([i, b]) => c.get(i) === b)));
  return or(...kept.map((c) => and(...[...c].map(([i, b]) => lit(i, b)))));
}

/** A term in Vouch syntax (for invariants handed to the verifier). */
export function toVouch(t: Term): string {
  return pretty(t)
    .replace(/!\d+/g, '')
    .replace(/∧/g, '&&')
    .replace(/∨/g, '||')
    .replace(/¬/g, '!')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/(?<![<>!=])=(?!=)/g, '==')
    .replace(/·/g, ' * ')
    .replace(/⟹/g, '==>')
    .replace(/\btrue\b/g, 'true')
    .replace(/\bfalse\b/g, 'false');
}

export { FALSE };

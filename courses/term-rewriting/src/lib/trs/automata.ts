/**
 * Bottom-up finite tree automata, and the automaton of ground normal forms of a left-linear system.
 */
import type { Rule } from './parse';
import { f, key, type Term } from './term';

export interface TreeAutomaton {
  /** f(q1, …, qn) → q */
  transitions: { symbol: string; from: string[]; to: string }[];
  final: Set<string>;
}

/** The states a (ground) term can reach. */
export function runAutomaton(A: TreeAutomaton, t: Term): Set<string> {
  if (t.type === 'var') return new Set();
  const argStates = t.args.map((a) => runAutomaton(A, a));
  const out = new Set<string>();
  for (const tr of A.transitions) {
    if (tr.symbol !== t.name || tr.from.length !== t.args.length) continue;
    if (tr.from.every((q, i) => argStates[i]!.has(q))) out.add(tr.to);
  }
  return out;
}

export const accepts = (A: TreeAutomaton, t: Term): boolean => [...runAutomaton(A, t)].some((q) => A.final.has(q));

/** For each reachable state, a smallest term reaching it (the emptiness check, with witnesses). */
export function witnesses(A: TreeAutomaton): Map<string, Term> {
  const w = new Map<string, Term>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const tr of A.transitions) {
      if (w.has(tr.to) || !tr.from.every((q) => w.has(q))) continue;
      w.set(tr.to, f(tr.symbol, ...tr.from.map((q) => w.get(q)!)));
      changed = true;
    }
  }
  return w;
}

export function isEmpty(A: TreeAutomaton): boolean {
  const w = witnesses(A);
  return ![...A.final].some((q) => w.has(q));
}

/** Pattern of a subterm with variables replaced by the wildcard `*` (as a key). */
const STAR = '*';
function patKey(t: Term): string {
  if (t.type === 'var') return STAR;
  return t.args.length ? `${t.name}(${t.args.map(patKey).join(',')})` : t.name;
}

/**
 * The deterministic automaton recognising the ground normal forms of a left-linear system over a
 * signature. Its states are the sets of (linearised) proper subpatterns of left-hand sides that a
 * term matches; reading a left-hand side instance leads to the rejecting sink.
 */
export function normalFormAutomaton(rules: readonly Rule[], signature: ReadonlyMap<string, number>): TreeAutomaton & { states: string[] } {
  const pats = new Map<string, Term>();
  const collect = (t: Term, root: boolean) => {
    if (!root) pats.set(patKey(t), t);
    if (t.type === 'fn') t.args.forEach((a) => collect(a, false));
  };
  for (const r of rules) collect(r.lhs, true);
  pats.delete(STAR);
  const lhss = rules.map((r) => r.lhs);
  type St = string[]; // sorted pattern keys (always includes "*")
  const stKey = (s: St) => `{${s.join(' ')}}`;
  const matchesWith = (p: Term, argStates: St[]): boolean => {
    if (p.type === 'var') return true;
    return p.args.every((a, i) => a.type === 'var' || argStates[i]!.includes(patKey(a)));
  };
  const states = new Map<string, St>([[stKey([STAR]), [STAR]]]);
  const transitions: TreeAutomaton['transitions'] = [];
  const done = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    const list = [...states.values()];
    for (const [sym, n] of signature) {
      const combos: St[][] = [[]];
      for (let i = 0; i < n; i++) {
        const next: St[][] = [];
        for (const c of combos) for (const s of list) next.push([...c, s]);
        combos.splice(0, combos.length, ...next);
        if (combos.length > 20_000) break;
      }
      for (const args of combos) {
        const tk = `${sym}(${args.map(stKey).join(',')})`;
        if (done.has(tk)) continue;
        done.add(tk);
        const reducible = lhss.some((l) => l.type === 'fn' && l.name === sym && l.args.length === n && matchesWith(l, args));
        if (reducible) continue; // goes to the sink: no transition
        const st = [STAR, ...[...pats].filter(([, p]) => p.type === 'fn' && p.name === sym && p.args.length === n && matchesWith(p, args)).map(([k]) => k)].sort();
        const k = stKey(st);
        if (!states.has(k)) {
          states.set(k, st);
          changed = true;
        }
        transitions.push({ symbol: sym, from: args.map(stKey), to: k });
      }
    }
  }
  return { transitions, final: new Set(states.keys()), states: [...states.keys()] };
}

/** All ground terms over a signature up to a depth (for checking the automaton by brute force). */
export function groundTerms(signature: ReadonlyMap<string, number>, depth: number): Term[] {
  let level: Term[] = [...signature].filter(([, n]) => n === 0).map(([s]) => f(s));
  const all = new Map(level.map((t) => [key(t), t]));
  for (let d = 0; d < depth; d++) {
    const cur = [...all.values()];
    for (const [s, n] of signature) {
      if (n === 0) continue;
      const combos: Term[][] = [[]];
      for (let i = 0; i < n; i++) {
        const next: Term[][] = [];
        for (const c of combos) for (const t of cur) next.push([...c, t]);
        combos.splice(0, combos.length, ...next);
      }
      for (const c of combos) {
        const t = f(s, ...c);
        all.set(key(t), t);
      }
    }
    level = [...all.values()];
  }
  return level;
}

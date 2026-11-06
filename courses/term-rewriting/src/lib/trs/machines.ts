/**
 * Computability: Turing machines compiled to rewrite rules, string rewriting, and a bounded search
 * for solutions of Post's correspondence problem.
 */
import type { Rule } from './parse';
import { f, v, show, type Term } from './term';

export interface TuringMachine {
  /** δ(state, symbol) = [new state, written symbol, move]. Missing entries halt. */
  delta: Record<string, Record<string, [string, string, 'L' | 'R']>>;
  start: string;
  /** The blank symbol (default "0"). */
  blank?: string;
}

/**
 * Compile a Turing machine to rewrite rules over configurations Q_state(left, right): `left` is the
 * tape to the left of the head, nearest cell first; `right` starts with the cell under the head.
 * Tapes are lists built from unary symbols T_a(…) ending in E (blank forever).
 */
export function tmRules(tm: TuringMachine): Rule[] {
  const blank = tm.blank ?? '0';
  const symbolsSet = new Set<string>([blank]);
  for (const row of Object.values(tm.delta)) for (const [a, [, b]] of Object.entries(row)) (symbolsSet.add(a), symbolsSet.add(b));
  const syms = [...symbolsSet];
  const cell = (a: string, rest: Term) => f(`T${a}`, rest);
  const out: Rule[] = [];
  for (const [q, row] of Object.entries(tm.delta)) {
    for (const [a, [q2, b, move]] of Object.entries(row)) {
      const heads: Term[] = [cell(a, v('r'))];
      if (a === blank) heads.push(f('E'));
      for (const head of heads) {
        const rest = head.type === 'fn' && head.name === 'E' ? f('E') : v('r');
        if (move === 'R') out.push({ lhs: f(`Q${q}`, v('l'), head), rhs: f(`Q${q2}`, cell(b, v('l')), rest) });
        else {
          for (const c of syms) out.push({ lhs: f(`Q${q}`, cell(c, v('l')), head), rhs: f(`Q${q2}`, v('l'), cell(c, cell(b, rest))) });
          out.push({ lhs: f(`Q${q}`, f('E'), head), rhs: f(`Q${q2}`, f('E'), cell(blank, cell(b, rest))) });
        }
      }
    }
  }
  return out;
}

/** The initial configuration on a tape (head on the first cell). */
export function tmStart(tm: TuringMachine, tape: string[] = []): Term {
  const right = tape.reduceRight<Term>((acc, a) => f(`T${a}`, acc), f('E'));
  return f(`Q${tm.start}`, f('E'), right);
}

/** Read a configuration back: state, the tape as a string with the head marked, and the count of non-blank cells. */
export function readConfig(t: Term, blank = '0'): { state: string; tape: string; nonBlank: number } {
  if (t.type !== 'fn' || t.args.length !== 2) return { state: '?', tape: show(t), nonBlank: 0 };
  const list = (u: Term): string[] => {
    const out: string[] = [];
    while (u.type === 'fn' && u.name !== 'E' && u.args.length === 1) {
      out.push(u.name.slice(1));
      u = u.args[0]!;
    }
    return out;
  };
  const left = list(t.args[0]!).reverse(), right = list(t.args[1]!);
  const all = [...left, ...right];
  return { state: t.name.slice(1), tape: `${left.join('')}[${right[0] ?? blank}]${right.slice(1).join('')}`, nonBlank: all.filter((s) => s !== blank).length };
}

/** The two-state busy beaver: writes four 1s and halts after six steps. */
export const BUSY_BEAVER_2: TuringMachine = {
  start: 'A',
  delta: {
    A: { '0': ['B', '1', 'R'], '1': ['B', '1', 'L'] },
    B: { '0': ['A', '1', 'L'], '1': ['H', '1', 'R'] },
  },
};

/** The three-state busy beaver: writes six 1s and halts after 14 steps (it is the Σ(3) champion). */
export const BUSY_BEAVER_3: TuringMachine = {
  start: 'A',
  delta: {
    A: { '0': ['B', '1', 'R'], '1': ['H', '1', 'R'] },
    B: { '0': ['C', '0', 'R'], '1': ['B', '1', 'R'] },
    C: { '0': ['C', '1', 'L'], '1': ['A', '1', 'L'] },
  },
};

// ───────────── string rewriting ─────────────

/** A string rewriting rule u → v as a term rule over unary symbols: u1(u2(…(x))) → v1(v2(…(x))). */
export function stringRule(u: string, w: string): Rule {
  const wrap = (s: string, tail: Term) => [...s].reduceRight<Term>((acc, ch) => f(ch.toUpperCase(), acc), tail);
  return { lhs: wrap(u, v('x')), rhs: wrap(w, v('x')) };
}

export const stringTerm = (s: string): Term => [...s].reduceRight<Term>((acc, ch) => f(ch.toUpperCase(), acc), f('E'));

export function termString(t: Term): string {
  let s = '';
  while (t.type === 'fn' && t.args.length === 1) {
    s += t.name.toLowerCase();
    t = t.args[0]!;
  }
  return s;
}

/** All one-step rewrites of a string. */
export function stringSteps(s: string, rules: readonly [string, string][]): { result: string; at: number; rule: number }[] {
  const out: { result: string; at: number; rule: number }[] = [];
  rules.forEach(([u, w], rule) => {
    for (let i = s.indexOf(u); i >= 0; i = s.indexOf(u, i + 1)) out.push({ result: s.slice(0, i) + w + s.slice(i + u.length), at: i, rule });
  });
  return out;
}

// ───────────── Post's correspondence problem ─────────────

export type Domino = [top: string, bottom: string];

/** Breadth-first search for a solution of length ≤ maxLength (PCP is undecidable, so a bound is needed). */
export function solvePCP(dominoes: readonly Domino[], maxLength = 8, maxStates = 200_000): number[] | null {
  // State: the unmatched overhang (which side and the string).
  type St = { seq: number[]; top: string; bottom: string };
  let frontier: St[] = [{ seq: [], top: '', bottom: '' }];
  const seen = new Set<string>();
  let states = 0;
  for (let len = 0; len < maxLength; len++) {
    const next: St[] = [];
    for (const st of frontier) {
      for (let i = 0; i < dominoes.length; i++) {
        const top = st.top + dominoes[i]![0], bottom = st.bottom + dominoes[i]![1];
        if (!top.startsWith(bottom) && !bottom.startsWith(top)) continue;
        const k = Math.min(top.length, bottom.length);
        const t2 = top.slice(k), b2 = bottom.slice(k);
        const seq = [...st.seq, i];
        if (t2 === '' && b2 === '') return seq;
        const key = `${t2}|${b2}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (++states > maxStates) return null;
        next.push({ seq, top: t2, bottom: b2 });
      }
    }
    frontier = next;
  }
  return null;
}

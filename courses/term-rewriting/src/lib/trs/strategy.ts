/**
 * Strategy combinators in the style of Stratego and ELAN. A strategy transforms a term or fails.
 *
 *   id, fail                identity and failure
 *   A                       apply the rule labelled A (at the root), or a named strategy
 *   rules                   any rule of the program (at the root)
 *   s1 ; s2                 sequence
 *   s1 <+ s2                left choice: s1, or s2 if s1 fails
 *   try(s), repeat(s)       s <+ id;  try(s ; repeat(s))
 *   all(s), one(s), some(s) apply s to all / one / at least one argument (one level down)
 *   topdown(s), bottomup(s), alltd(s), oncetd(s), oncebu(s), innermost(s), outermost(s)
 *   where(s), not(s)        test without changing the term; succeed iff s fails
 */
import type { Program, Rule } from './parse';
import { apply, f, type Term } from './term';
import { matchInto } from './match';
import { builtin } from './rewrite';

export type Strat =
  | { k: 'id' }
  | { k: 'fail' }
  | { k: 'rule'; name: string }
  | { k: 'seq'; a: Strat; b: Strat }
  | { k: 'choice'; a: Strat; b: Strat }
  | { k: 'call'; name: string; args: Strat[] };

const BUILTIN_COMBINATORS = new Set(['try', 'repeat', 'all', 'one', 'some', 'topdown', 'bottomup', 'alltd', 'oncetd', 'oncebu', 'innermost', 'outermost', 'where', 'not']);

/** Parse a strategy expression. `;` binds tighter than `<+`. */
export function parseStrategy(src: string): Strat {
  const toks = src.match(/<\+|[A-Za-z_][\w']*|[();,]|\S/g) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const choice = (): Strat => {
    let a = seq();
    while (peek() === '<+') {
      i++;
      a = { k: 'choice', a, b: seq() };
    }
    return a;
  };
  const seq = (): Strat => {
    let a = prim();
    while (peek() === ';') {
      i++;
      a = { k: 'seq', a, b: prim() };
    }
    return a;
  };
  const prim = (): Strat => {
    const t = toks[i++];
    if (t === undefined) throw new Error('unexpected end of strategy');
    if (t === '(') {
      const s = choice();
      if (toks[i++] !== ')') throw new Error('expected “)” in strategy');
      return s;
    }
    if (!/^[A-Za-z_]/.test(t)) throw new Error(`unexpected “${t}” in strategy`);
    if (t === 'id') return { k: 'id' };
    if (t === 'fail') return { k: 'fail' };
    if (peek() === '(') {
      i++;
      const args: Strat[] = [];
      if (peek() !== ')') {
        args.push(choice());
        while (peek() === ',') {
          i++;
          args.push(choice());
        }
      }
      if (toks[i++] !== ')') throw new Error('expected “)” in strategy');
      return { k: 'call', name: t, args };
    }
    return BUILTIN_COMBINATORS.has(t) ? { k: 'call', name: t, args: [] } : { k: 'rule', name: t };
  };
  const s = choice();
  if (i < toks.length) throw new Error(`unexpected “${toks[i]}” in strategy`);
  return s;
}

export function showStrategy(s: Strat): string {
  switch (s.k) {
    case 'id':
    case 'fail':
      return s.k;
    case 'rule':
      return s.name;
    case 'seq':
      return `${showStrategy(s.a)}; ${showStrategy(s.b)}`;
    case 'choice':
      return `(${showStrategy(s.a)} <+ ${showStrategy(s.b)})`;
    case 'call':
      return `${s.name}(${s.args.map(showStrategy).join(', ')})`;
  }
}

export interface StrategyEnv {
  rules: readonly Rule[];
  /** Named strategies (from `#strategy`). */
  named?: ReadonlyMap<string, Strat>;
  /** Applications of rules, in order (rule label or index). */
  log?: string[];
  fuel?: { left: number };
}

export function envFromProgram(p: Program, log?: string[]): StrategyEnv {
  const named = new Map<string, Strat>();
  for (const [k, src] of p.strategies) named.set(k, parseStrategy(src));
  return { rules: p.rules, named, log, fuel: { left: 100_000 } };
}

class OutOfFuel extends Error {}

function tick(env: StrategyEnv) {
  if (env.fuel && --env.fuel.left < 0) throw new OutOfFuel('the strategy ran out of fuel (does it loop?)');
}

function applyRule(env: StrategyEnv, name: string | null, t: Term): Term | null {
  if (t.type === 'var') return null;
  if (name === null) {
    const b = builtin(t);
    if (b) return b.result;
  }
  for (let i = 0; i < env.rules.length; i++) {
    const r = env.rules[i]!;
    if (name !== null && r.label !== name) continue;
    const s = new Map<string, Term>();
    if (!matchInto(r.lhs, t, s)) continue;
    tick(env);
    env.log?.push(r.label ?? `rule ${i + 1}`);
    return apply(s, r.rhs);
  }
  return null;
}

const mapArgs = (t: Term, g: (a: Term, i: number) => Term | null, mode: 'all' | 'one' | 'some'): Term | null => {
  if (t.type === 'var') return mode === 'all' ? t : null;
  if (mode === 'all') {
    const args: Term[] = [];
    for (let i = 0; i < t.args.length; i++) {
      const r = g(t.args[i]!, i);
      if (r === null) return null;
      args.push(r);
    }
    return f(t.name, ...args);
  }
  if (mode === 'one') {
    for (let i = 0; i < t.args.length; i++) {
      const r = g(t.args[i]!, i);
      if (r !== null) return f(t.name, ...t.args.slice(0, i), r, ...t.args.slice(i + 1));
    }
    return null;
  }
  let any = false;
  const args = t.args.map((a, i) => {
    const r = g(a, i);
    if (r === null) return a;
    any = true;
    return r;
  });
  return any ? f(t.name, ...args) : null;
};

/** Apply a strategy; returns the result, or `null` on failure. */
export function run(s: Strat, t: Term, env: StrategyEnv): Term | null {
  switch (s.k) {
    case 'id':
      return t;
    case 'fail':
      return null;
    case 'rule': {
      if (s.name === 'rules') return applyRule(env, null, t);
      const named = env.named?.get(s.name);
      if (named) return run(named, t, env);
      if (!env.rules.some((r) => r.label === s.name)) throw new Error(`no rule or strategy named ${s.name}`);
      return applyRule(env, s.name, t);
    }
    case 'seq': {
      const a = run(s.a, t, env);
      return a === null ? null : run(s.b, a, env);
    }
    case 'choice':
      return run(s.a, t, env) ?? run(s.b, t, env);
    case 'call': {
      const [x] = s.args;
      const need = (n: number) => {
        if (s.args.length !== n) throw new Error(`${s.name} takes ${n} argument${n === 1 ? '' : 's'}`);
      };
      tick(env);
      switch (s.name) {
        case 'try':
          need(1);
          return run(x!, t, env) ?? t;
        case 'repeat': {
          need(1);
          let cur = t;
          for (;;) {
            const r = run(x!, cur, env);
            if (r === null) return cur;
            tick(env);
            cur = r;
          }
        }
        case 'all':
          need(1);
          return mapArgs(t, (a) => run(x!, a, env), 'all');
        case 'one':
          need(1);
          return mapArgs(t, (a) => run(x!, a, env), 'one');
        case 'some':
          need(1);
          return mapArgs(t, (a) => run(x!, a, env), 'some');
        case 'topdown': {
          need(1);
          const r = run(x!, t, env);
          return r === null ? null : mapArgs(r, (a) => run(s, a, env), 'all');
        }
        case 'bottomup': {
          need(1);
          const r = mapArgs(t, (a) => run(s, a, env), 'all');
          return r === null ? null : run(x!, r, env);
        }
        case 'alltd':
          need(1);
          return run(x!, t, env) ?? mapArgs(t, (a) => run(s, a, env), 'all');
        case 'oncetd':
          need(1);
          return run(x!, t, env) ?? mapArgs(t, (a) => run(s, a, env), 'one');
        case 'oncebu':
          need(1);
          return mapArgs(t, (a) => run(s, a, env), 'one') ?? run(x!, t, env);
        case 'innermost': {
          need(1);
          // innermost(s) = bottomup(try(s; innermost(s)))
          const inner = mapArgs(t, (a) => run(s, a, env), 'all')!;
          const r = run(x!, inner, env);
          return r === null ? inner : run(s, r, env);
        }
        case 'outermost': {
          need(1);
          // outermost(s) = repeat(oncetd(s))
          let cur = t;
          const once: Strat = { k: 'call', name: 'oncetd', args: [x!] };
          for (;;) {
            const r = run(once, cur, env);
            if (r === null) return cur;
            cur = r;
          }
        }
        case 'where':
          need(1);
          return run(x!, t, env) === null ? null : t;
        case 'not':
          need(1);
          return run(x!, t, env) === null ? t : null;
        default: {
          const named = env.named?.get(s.name);
          if (named && s.args.length === 0) return run(named, t, env);
          throw new Error(`unknown strategy combinator ${s.name}`);
        }
      }
    }
  }
}

/** Apply a strategy given as source text. */
export function runStrategy(src: string, t: Term, env: StrategyEnv): { term: Term | null; log: string[]; error?: string } {
  const log: string[] = [];
  const e = { ...env, log, fuel: env.fuel ?? { left: 100_000 } };
  try {
    return { term: run(parseStrategy(src), t, e), log };
  } catch (err) {
    return { term: null, log, error: err instanceof Error ? err.message : String(err) };
  }
}

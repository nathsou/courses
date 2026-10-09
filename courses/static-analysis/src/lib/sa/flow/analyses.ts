/**
 * The dataflow analyses of Part III, on the course's CFGs: constant propagation (chapter 13), liveness
 * (chapter 14) and reaching definitions (chapter 15).
 */
import type estree from 'estree';
import type { Cfg, CfgNode } from './cfg.js';
import type { Analysis, Lattice } from './dataflow.js';

// ——— Sets, ordered by inclusion ———

/** A set of strings, kept sorted so that equality is cheap. */
export type StringSet = readonly string[];

export const setLattice = (format: (s: StringSet, cfg: Cfg) => string = (s) => `{${s.join(', ')}}`): Lattice<StringSet> => ({
  bottom: [],
  join: (a, b) => [...new Set([...a, ...b])].sort(),
  equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
  format,
});

const minus = (a: StringSet, b: Iterable<string>) => {
  const drop = new Set(b);
  return a.filter((x) => !drop.has(x));
};
const union = (a: StringSet, b: Iterable<string>) => [...new Set([...a, ...b])].sort();

// ——— Liveness (backward, may) ———

export const liveness: Analysis<StringSet> = {
  name: 'Live variables',
  direction: 'backward',
  lattice: setLattice(),
  boundary: () => [],
  // live-in = (live-out − defs) ∪ uses
  transfer: (node, out) => union(minus(out, node.defs), node.uses),
};

// ——— Reaching definitions (forward, may) ———

/** A definition is named after its variable and the line of the node that makes it: `x@3`. */
export function definitionName(cfg: Cfg, node: CfgNode, variable: string): string {
  if (node.kind === 'entry') return `${variable}@param`;
  const line = node.range ? cfg.source.slice(0, node.range[0]).split('\n').length : node.id;
  return `${variable}@${line}`;
}

export const reachingDefinitions: Analysis<StringSet> = {
  name: 'Reaching definitions',
  direction: 'forward',
  lattice: setLattice(),
  boundary: (cfg) => cfg.params.map((p) => definitionName(cfg, cfg.nodes[cfg.entry]!, p)).sort(),
  // out = (in − definitions of the same variables) ∪ this node's definitions
  transfer: (node, input, cfg) => {
    if (node.kind === 'entry' || node.defs.length === 0) return input;
    const killed = input.filter((d) => node.defs.includes(d.slice(0, d.lastIndexOf('@'))));
    return union(minus(input, killed), node.defs.map((v) => definitionName(cfg, node, v)));
  },
};

// ——— Constant propagation (forward, flat lattice per variable) ———

/** ⊥: no value yet; ⊤: not a constant; otherwise a JSON-encoded constant (or 'undefined'). */
export type Flat = string;
export const BOT = '⊥';
export const TOP = '⊤';
export type Env = Readonly<Record<string, Flat>>;

export function joinFlat(a: Flat, b: Flat): Flat {
  if (a === BOT) return b;
  if (b === BOT) return a;
  return a === b ? a : TOP;
}

const decode = (v: Flat): unknown => (v === 'undefined' ? undefined : JSON.parse(v));
const encode = (v: unknown): Flat => {
  if (v === undefined) return 'undefined';
  if (typeof v === 'number' && !Number.isFinite(v)) return TOP;
  return typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' || v === null ? JSON.stringify(v) : TOP;
};

const BINARY: Record<string, (a: never, b: never) => unknown> = {
  '+': (a, b) => (a as number) + (b as number),
  '-': (a, b) => (a as number) - (b as number),
  '*': (a, b) => (a as number) * (b as number),
  '/': (a, b) => (a as number) / (b as number),
  '%': (a, b) => (a as number) % (b as number),
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '===': (a, b) => a === b,
  '!==': (a, b) => a !== b,
  '==': (a, b) => a == b,
  '!=': (a, b) => a != b,
};

/** Evaluates an expression over the flat lattice: ⊥ if an operand has no value yet, ⊤ if one is not constant. */
export function evalFlat(e: estree.Node | null | undefined, env: Env): Flat {
  if (!e) return TOP;
  switch (e.type) {
    case 'Literal':
      return 'regex' in e && e.regex ? TOP : encode(e.value);
    case 'TemplateLiteral':
      return e.expressions.length === 0 ? encode(e.quasis[0]!.value.cooked) : TOP;
    case 'Identifier':
      if (e.name === 'undefined' && !(e.name in env)) return 'undefined';
      return env[e.name] ?? TOP;
    case 'UnaryExpression': {
      const v = evalFlat(e.argument, env);
      if (v === BOT || v === TOP) return v;
      const x = decode(v) as number;
      if (e.operator === '-') return encode(-x);
      if (e.operator === '+') return encode(+x);
      if (e.operator === '!') return encode(!x);
      return TOP;
    }
    case 'BinaryExpression': {
      const op = BINARY[e.operator];
      const a = evalFlat(e.left as estree.Node, env);
      const b = evalFlat(e.right, env);
      if (a === BOT || b === BOT) return BOT;
      if (!op || a === TOP || b === TOP) return TOP;
      return encode(op(decode(a) as never, decode(b) as never));
    }
    default:
      return TOP;
  }
}

export const constants: Analysis<Env> = {
  name: 'Constant propagation',
  direction: 'forward',
  lattice: {
    bottom: {},
    join: (a, b) => {
      const out: Record<string, Flat> = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = joinFlat(a[k] ?? BOT, b[k] ?? BOT);
      return out;
    },
    equal: (a, b) => {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) if ((a[k] ?? BOT) !== (b[k] ?? BOT)) return false;
      return true;
    },
    format: (env, cfg) => {
      const shown = cfg.variables.filter((v) => (env[v] ?? BOT) !== BOT).map((v) => `${v}=${env[v]}`);
      return shown.length ? shown.join(' ') : '⊥';
    },
  },
  boundary: (cfg) => Object.fromEntries(cfg.params.map((p) => [p, TOP])),
  transfer: (node, env) => {
    if (node.defs.length === 0 || node.kind === 'entry') return env;
    const out: Record<string, Flat> = { ...env };
    if (node.kind === 'declare') for (const d of node.defs) out[d] = node.text.startsWith('function') ? TOP : 'undefined';
    else if (node.kind === 'assign' && node.value && node.defs.length === 1) out[node.defs[0]!] = evalFlat(node.value, env);
    else for (const d of node.defs) out[d] = TOP;
    return out;
  },
};

// ——— Truthiness (forward, flat per variable, refined along branches) ———

/** 'truthy', 'falsy', ⊤ (unknown) or ⊥ (no value yet), per variable. */
function truthOf(e: estree.Node | null | undefined, env: Env): Flat {
  if (!e) return TOP;
  if (e.type === 'Literal') return 'regex' in e && e.regex ? 'truthy' : e.value ? 'truthy' : 'falsy';
  if (e.type === 'Identifier') return e.name === 'undefined' && !(e.name in env) ? 'falsy' : (env[e.name] ?? TOP);
  if (e.type === 'ObjectExpression' || e.type === 'ArrayExpression' || e.type === 'ArrowFunctionExpression' || e.type === 'FunctionExpression') return 'truthy';
  if (e.type === 'UnaryExpression' && e.operator === '!') {
    const v = truthOf(e.argument, env);
    return v === 'truthy' ? 'falsy' : v === 'falsy' ? 'truthy' : v;
  }
  return TOP;
}

/** What taking the `outcome` branch of `test` says about variables. */
function refine(test: estree.Node, outcome: boolean, env: Record<string, Flat>, vars: Set<string>): void {
  if (test.type === 'Identifier' && vars.has(test.name)) env[test.name] = outcome ? 'truthy' : 'falsy';
  else if (test.type === 'UnaryExpression' && test.operator === '!') refine(test.argument, !outcome, env, vars);
  else if (test.type === 'LogicalExpression' && test.operator === '&&' && outcome) {
    refine(test.left, true, env, vars);
    refine(test.right, true, env, vars);
  } else if (test.type === 'LogicalExpression' && test.operator === '||' && !outcome) {
    refine(test.left, false, env, vars);
    refine(test.right, false, env, vars);
  }
}

export const truthiness: Analysis<Env> = {
  name: 'Truthiness',
  direction: 'forward',
  lattice: constants.lattice,
  boundary: (cfg) => Object.fromEntries(cfg.params.map((p) => [p, TOP])),
  transfer: (node, env) => {
    if (node.defs.length === 0 || node.kind === 'entry') return env;
    const out: Record<string, Flat> = { ...env };
    if (node.kind === 'declare') for (const d of node.defs) out[d] = node.text.startsWith('function') ? 'truthy' : 'falsy';
    else if (node.kind === 'assign' && node.value && node.defs.length === 1) out[node.defs[0]!] = truthOf(node.value, env);
    else for (const d of node.defs) out[d] = TOP;
    return out;
  },
  edge: (from, to, env, cfg) => {
    // Only a two-way branch says something: succ[0] is taken when the test is true, succ[1] when it is false.
    if (from.kind !== 'cond' || !from.test || from.succ.length !== 2 || from.succ[0] === from.succ[1]) return env;
    const out: Record<string, Flat> = { ...env };
    refine(from.test, to === from.succ[0], out, new Set(cfg.variables));
    return out;
  },
};

export const ANALYSES = { constants, liveness, reaching: reachingDefinitions, truthiness } as const;
export type AnalysisKey = keyof typeof ANALYSES;

/**
 * A concrete interpreter for the course's control-flow graphs (chapter 23): it runs a function on actual numbers,
 * node by node, and records the state on arrival at each node. Comparing those states with an analysis's facts is
 * how the course tests that its abstract domains are sound.
 */
import type estree from 'estree';
import type { Cfg } from './cfg.js';

export type Value = number | boolean | undefined;
export type State = Readonly<Record<string, Value>>;

export interface Trace {
  /** Each node visited, with the state on arrival. */
  visits: { node: number; state: State }[];
  /** How the run ended. */
  outcome: 'returned' | 'threw' | 'assertion failed' | 'out of steps';
}

export class InterpretError extends Error {}

export function evaluate(e: estree.Node, state: State): Value {
  switch (e.type) {
    case 'Literal':
      if (typeof e.value === 'number' || typeof e.value === 'boolean') return e.value;
      throw new InterpretError(`Unsupported literal ${e.raw}`);
    case 'Identifier':
      if (e.name === 'undefined') return undefined;
      if (!(e.name in state)) throw new InterpretError(`Unknown variable ${e.name}`);
      return state[e.name];
    case 'UnaryExpression': {
      const v = evaluate(e.argument, state);
      if (e.operator === '!') return !v;
      if (e.operator === '-') return -(v as number);
      if (e.operator === '+') return +(v as number);
      throw new InterpretError(`Unsupported operator ${e.operator}`);
    }
    case 'LogicalExpression': {
      const l = evaluate(e.left, state);
      if (e.operator === '&&') return l ? evaluate(e.right, state) : l;
      if (e.operator === '||') return l ? l : evaluate(e.right, state);
      throw new InterpretError(`Unsupported operator ${e.operator}`);
    }
    case 'BinaryExpression': {
      const l = evaluate(e.left as estree.Node, state) as number;
      const r = evaluate(e.right, state) as number;
      switch (e.operator) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '%': return l % r;
        case '<': return l < r;
        case '<=': return l <= r;
        case '>': return l > r;
        case '>=': return l >= r;
        case '===': case '==': return l === r;
        case '!==': case '!=': return l !== r;
        default: throw new InterpretError(`Unsupported operator ${e.operator}`);
      }
    }
    case 'CallExpression':
      // Only `assert(c)` is supported, as a statement; see `interpret`.
      throw new InterpretError('Calls are not supported in expressions');
    default:
      throw new InterpretError(`Unsupported expression ${e.type}`);
  }
}

const isAssert = (e: estree.Node | undefined): e is estree.CallExpression =>
  e?.type === 'CallExpression' && e.callee.type === 'Identifier' && e.callee.name === 'assert';

/** Runs the function of `cfg` with the given arguments. */
export function interpret(cfg: Cfg, args: Record<string, number>, maxSteps = 10_000): Trace {
  const state: Record<string, Value> = {};
  for (const p of cfg.params) state[p] = args[p];
  const visits: Trace['visits'] = [];
  let n = cfg.entry;
  for (let step = 0; step < maxSteps; step++) {
    const node = cfg.nodes[n]!;
    visits.push({ node: n, state: { ...state } });
    switch (node.kind) {
      case 'exit':
        return { visits, outcome: 'returned' };
      case 'return':
        if (node.expr) evaluate(node.expr, state);
        return { visits, outcome: 'returned' };
      case 'throw':
        return { visits, outcome: 'threw' };
      case 'assign':
        if (node.defs.length !== 1 || !node.value) throw new InterpretError(`Unsupported assignment: ${node.text}`);
        state[node.defs[0]!] = evaluate(node.value, state);
        break;
      case 'declare':
        for (const d of node.defs) state[d] = undefined;
        break;
      case 'expr':
        if (isAssert(node.expr)) {
          if (!evaluate(node.expr.arguments[0] as estree.Node, state)) return { visits, outcome: 'assertion failed' };
        } else if (node.expr) evaluate(node.expr, state);
        break;
      case 'cond': {
        if (!node.test) throw new InterpretError(`Unsupported loop: ${node.text}`);
        const taken = evaluate(node.test, state) ? node.succ[0] : node.succ[1] ?? node.succ[0];
        n = taken!;
        continue;
      }
    }
    if (node.succ.length !== 1) throw new InterpretError(`Unexpected branching at ${node.text}`);
    n = node.succ[0]!;
  }
  return { visits, outcome: 'out of steps' };
}

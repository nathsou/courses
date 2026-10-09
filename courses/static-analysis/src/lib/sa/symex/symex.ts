/**
 * A symbolic executor for one JavaScript function (chapter 31). Parameters are symbolic integers; the executor
 * walks the control-flow graph of chapter 12 with an environment of symbolic values and a **path condition**, the
 * conjunction of the branch conditions taken so far. At each condition it asks the solver which outcomes are
 * possible and explores each, depth first, building a **path tree**. Each finished path yields a concrete input
 * that follows it: a test case.
 *
 * Along the way it checks three properties, each a solver query: a property read on a value that may be `null`, a
 * division by a value that may be zero, and an `assert` that may fail. Each finding comes with an input that
 * triggers it.
 *
 * Integers are 16-bit with no-overflow side conditions (see bitblast.ts). Loops are unrolled up to a bound, and
 * the number of paths is capped: what lies beyond is reported as such, not analysed.
 */
import type estree from 'estree';
import { buildCfg, type Cfg, type CfgNode } from '../flow/cfg.js';
import { and, check, FALSE, int, not, or, showBool, showInt, TRUE, type BoolTerm, type IntTerm } from './bitblast.js';

export type SymValue =
  | { k: 'int'; t: IntTerm }
  | { k: 'bool'; t: BoolTerm }
  | { k: 'ref'; isNull: BoolTerm; label: string }
  | { k: 'undefined' }
  | { k: 'opaque'; text: string };

export type Model = Record<string, number | boolean>;

export interface Finding {
  kind: 'null' | 'division' | 'assertion';
  node: number;
  line: number;
  message: string;
  /** An input that triggers it. */
  model: Model;
}

export type Leaf =
  | { kind: 'return'; node: number; value: string; model: Model; conditions: string[] }
  | { kind: 'throw'; node: number; model: Model; conditions: string[]; message?: string }
  | { kind: 'infeasible' }
  | { kind: 'bound'; node: number; model: Model }
  | { kind: 'limit' };

export interface Branch {
  kind: 'branch';
  node: number;
  line: number;
  text: string;
  /** The symbolic condition, as a formula over the inputs. */
  condition: string;
  then: Branch | Leaf;
  else: Branch | Leaf;
}

export type PathTree = Branch | Leaf;

export interface SymexResult {
  cfg: Cfg;
  tree: PathTree;
  findings: Finding[];
  paths: number;
  queries: number;
  /** The largest CNF sent to the solver. */
  maxClauses: number;
  conflicts: number;
}

export class SymexError extends Error {}

class Unsupported extends Error {}
/** The path cannot continue: the operation fails on every execution that reaches it. */
class Crash extends Error {
  constructor(
    message: string,
    readonly model: Model,
  ) {
    super(message);
  }
}

interface State {
  node: number;
  env: Map<string, SymValue>;
  pc: BoolTerm[];
  visits: Map<number, number>;
}

export function execute(source: string, options: { loopBound?: number; maxPaths?: number; width?: number } = {}): SymexResult {
  const { loopBound = 6, maxPaths = 64, width = 16 } = options;
  const cfg = buildCfg(source);
  const text = (n: estree.Node) => {
    const r = (n as estree.Node & { range?: [number, number] }).range;
    return r ? cfg.source.slice(r[0], r[1]) : n.type;
  };
  const lineOf = (node: CfgNode) => (node.range ? cfg.source.slice(0, node.range[0]).split('\n').length : 0);
  const findings = new Map<string, Finding>();
  let queries = 0;
  let maxClauses = 0;
  let conflicts = 0;
  let paths = 0;
  let fresh = 0;
  const solve = (conds: BoolTerm[]) => {
    queries++;
    const r = check(conds, width);
    maxClauses = Math.max(maxClauses, r.clauses);
    conflicts += r.stats.conflicts;
    return r;
  };
  const inputs = (m: Model | undefined): Model => {
    const out: Model = {};
    for (const p of cfg.params) out[p] = (m?.[p] as number | undefined) ?? 0;
    return out;
  };

  const truthy = (v: SymValue): BoolTerm => {
    switch (v.k) {
      case 'int':
        return not({ t: 'eq', a: v.t, b: int(0) });
      case 'bool':
        return v.t;
      case 'ref':
        return not(v.isNull);
      case 'undefined':
        return FALSE;
      case 'opaque':
        return { t: 'bvar', name: `${v.text}#${++fresh}` };
    }
  };

  /** Evaluates an expression; property reads and divisions are checked against the path condition. */
  function evaluate(e: estree.Node, st: State, node: CfgNode): SymValue {
    const report = (kind: Finding['kind'], bad: BoolTerm, message: string) => {
      const r = solve([...st.pc, bad]);
      if (r.sat) {
        const key = `${kind}:${node.id}:${message}`;
        if (!findings.has(key)) findings.set(key, { kind, node: node.id, line: lineOf(node), message, model: inputs(r.model) });
        // Continue on the executions where the operation succeeds, if there are any.
        st.pc = [...st.pc, not(bad)];
        if (!solve(st.pc).sat) throw new Crash(message, inputs(r.model));
      }
    };
    switch (e.type) {
      case 'Literal':
        if (typeof e.value === 'number') {
          if (!Number.isInteger(e.value)) throw new Unsupported(`non-integer ${e.raw}`);
          return { k: 'int', t: int(e.value) };
        }
        if (typeof e.value === 'boolean') return { k: 'bool', t: e.value ? TRUE : FALSE };
        if (e.value === null) return { k: 'ref', isNull: TRUE, label: 'null' };
        return { k: 'opaque', text: text(e) };
      case 'TemplateLiteral':
        return { k: 'opaque', text: text(e) };
      case 'Identifier':
        if (e.name === 'undefined') return { k: 'undefined' };
        return st.env.get(e.name) ?? { k: 'opaque', text: e.name };
      case 'ObjectExpression':
      case 'ArrayExpression':
      case 'NewExpression':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return { k: 'ref', isNull: FALSE, label: text(e).length > 16 ? '{…}' : text(e) };
      case 'UnaryExpression': {
        const v = evaluate(e.argument, st, node);
        if (e.operator === '!') return { k: 'bool', t: not(truthy(v)) };
        if (e.operator === '-' && v.k === 'int') return { k: 'int', t: { t: 'neg', a: v.t } };
        if (e.operator === '+' && v.k === 'int') return v;
        throw new Unsupported(`${e.operator} on ${v.k}`);
      }
      case 'LogicalExpression': {
        const a = evaluate(e.left, st, node);
        const b = evaluate(e.right, st, node);
        // As conditions: JavaScript returns an operand, but its truthiness is what branches see.
        return { k: 'bool', t: e.operator === '&&' ? and(truthy(a), truthy(b)) : e.operator === '||' ? or(truthy(a), truthy(b)) : or(truthy(a), truthy(b)) };
      }
      case 'ConditionalExpression': {
        const c = truthy(evaluate(e.test, st, node));
        const a = evaluate(e.consequent, st, node);
        const b = evaluate(e.alternate, st, node);
        if (a.k === 'int' && b.k === 'int') return { k: 'int', t: { t: 'ite', c, a: a.t, b: b.t } };
        if (a.k === 'ref' && b.k === 'ref') return { k: 'ref', isNull: or(and(c, a.isNull), and(not(c), b.isNull)), label: `${a.label} or ${b.label}` };
        if (a.k === 'bool' && b.k === 'bool') return { k: 'bool', t: or(and(c, a.t), and(not(c), b.t)) };
        return { k: 'opaque', text: text(e) };
      }
      case 'BinaryExpression': {
        const a = evaluate(e.left as estree.Node, st, node);
        const b = evaluate(e.right, st, node);
        const op = e.operator;
        if (op === '===' || op === '!==' || op === '==' || op === '!=') {
          let eq: BoolTerm | undefined;
          if (a.k === 'int' && b.k === 'int') eq = { t: 'eq', a: a.t, b: b.t };
          else if (a.k === 'ref' && b.k === 'ref' && (a.label === 'null' || b.label === 'null')) eq = a.label === 'null' ? b.isNull : a.isNull;
          else if (a.k === 'bool' && b.k === 'bool') eq = or(and(a.t, b.t), and(not(a.t), not(b.t)));
          else if ((a.k === 'undefined') !== (b.k === 'undefined') && (a.k === 'int' || b.k === 'int')) eq = FALSE;
          if (!eq) eq = { t: 'bvar', name: `${text(e)}#${++fresh}` };
          return { k: 'bool', t: op.startsWith('!') ? not(eq) : eq };
        }
        if (a.k !== 'int' || b.k !== 'int') {
          if (op === '+') return { k: 'opaque', text: text(e) };
          throw new Unsupported(`${op} on ${a.k} and ${b.k}`);
        }
        // Constant folding keeps the terms readable: a loop counter is 3, not ((0 + 1) + 1) + 1.
        if (a.t.t === 'const' && b.t.t === 'const') {
          const x = a.t.v;
          const y = b.t.v;
          const folded: Record<string, () => SymValue> = {
            '+': () => ({ k: 'int', t: int(x + y) }),
            '-': () => ({ k: 'int', t: int(x - y) }),
            '*': () => ({ k: 'int', t: int(x * y) }),
            '&': () => ({ k: 'int', t: int(x & y) }),
            '|': () => ({ k: 'int', t: int(x | y) }),
            '^': () => ({ k: 'int', t: int(x ^ y) }),
            '<': () => ({ k: 'bool', t: x < y ? TRUE : FALSE }),
            '<=': () => ({ k: 'bool', t: x <= y ? TRUE : FALSE }),
            '>': () => ({ k: 'bool', t: x > y ? TRUE : FALSE }),
            '>=': () => ({ k: 'bool', t: x >= y ? TRUE : FALSE }),
          };
          const limit = 2 ** (width - 1);
          const f = folded[op]?.();
          if (f && (f.k !== 'int' || (f.t.t === 'const' && f.t.v >= -limit && f.t.v < limit))) return f;
        }
        switch (op) {
          case '+':
            return { k: 'int', t: { t: 'add', a: a.t, b: b.t } };
          case '-':
            return { k: 'int', t: { t: 'sub', a: a.t, b: b.t } };
          case '*':
            return { k: 'int', t: { t: 'mul', a: a.t, b: b.t } };
          case '&':
            return { k: 'int', t: { t: 'band', a: a.t, b: b.t } };
          case '|':
            return { k: 'int', t: { t: 'bor', a: a.t, b: b.t } };
          case '^':
            return { k: 'int', t: { t: 'bxor', a: a.t, b: b.t } };
          case '<':
            return { k: 'bool', t: { t: 'lt', a: a.t, b: b.t } };
          case '<=':
            return { k: 'bool', t: { t: 'le', a: a.t, b: b.t } };
          case '>':
            return { k: 'bool', t: { t: 'lt', a: b.t, b: a.t } };
          case '>=':
            return { k: 'bool', t: { t: 'le', a: b.t, b: a.t } };
          case '/':
          case '%':
            report('division', { t: 'eq', a: b.t, b: int(0) }, `possible division by zero: ${text(e.right)} can be 0`);
            return { k: 'opaque', text: text(e) };
          default:
            throw new Unsupported(`operator ${op}`);
        }
      }
      case 'MemberExpression': {
        const o = evaluate(e.object as estree.Node, st, node);
        if (o.k === 'ref') report('null', o.isNull, `${text(e.object as estree.Node)} can be null here`);
        if (o.k === 'undefined') report('null', TRUE, `${text(e.object as estree.Node)} is undefined here`);
        return { k: 'opaque', text: text(e) };
      }
      case 'CallExpression':
        for (const a of e.arguments) if (a.type !== 'SpreadElement') evaluate(a, st, node);
        if (e.callee.type === 'MemberExpression') evaluate(e.callee, st, node);
        return { k: 'opaque', text: text(e) };
      case 'AssignmentExpression':
      case 'UpdateExpression':
        throw new Unsupported('nested assignment');
      default:
        return { k: 'opaque', text: text(e) };
    }
  }

  const show = (v: SymValue) => (v.k === 'int' ? showInt(v.t) : v.k === 'bool' ? showBool(v.t) : v.k === 'ref' ? v.label : v.k === 'undefined' ? 'undefined' : v.text);
  const isAssert = (n: CfgNode) => n.expr?.type === 'CallExpression' && n.expr.callee.type === 'Identifier' && n.expr.callee.name === 'assert';

  function run(st: State): PathTree {
    for (;;) {
      if (paths >= maxPaths) return { kind: 'limit' };
      const node = cfg.nodes[st.node]!;
      try {
        switch (node.kind) {
          case 'exit':
          case 'return': {
            const value = node.kind === 'return' && node.expr ? show(evaluate(node.expr, st, node)) : 'undefined';
            paths++;
            return { kind: 'return', node: node.id, value, model: inputs(solve(st.pc).model), conditions: st.pc.map(showBool) };
          }
          case 'throw':
            if (node.expr) evaluate(node.expr, st, node);
            paths++;
            return { kind: 'throw', node: node.id, model: inputs(solve(st.pc).model), conditions: st.pc.map(showBool) };
          case 'assign':
            if (node.defs.length === 1 && node.value) st.env.set(node.defs[0]!, evaluate(node.value, st, node));
            else for (const d of node.defs) st.env.set(d, { k: 'opaque', text: d });
            break;
          case 'declare':
            for (const d of node.defs) st.env.set(d, { k: 'undefined' });
            break;
          case 'expr':
            if (isAssert(node)) {
              const call = node.expr as estree.CallExpression;
              const c = truthy(evaluate(call.arguments[0] as estree.Node, st, node));
              const r = solve([...st.pc, not(c)]);
              const message = `this assertion can fail`;
              if (r.sat && !findings.has(`assertion:${node.id}`)) findings.set(`assertion:${node.id}`, { kind: 'assertion', node: node.id, line: lineOf(node), message, model: inputs(r.model) });
              st.pc = [...st.pc, c];
              if (r.sat && !solve(st.pc).sat) throw new Crash(message, inputs(r.model));
            } else if (node.expr) evaluate(node.expr, st, node);
            break;
          case 'cond': {
            if (!node.test) throw new Unsupported(node.text);
            // A loop's condition is evaluated once more than its body runs: `loopBound` iterations allow
            // `loopBound + 1` evaluations.
            const seen = (st.visits.get(node.id) ?? 0) + 1;
            if (seen > loopBound + 1) {
              paths++;
              return { kind: 'bound', node: node.id, model: inputs(solve(st.pc).model) };
            }
            const c = truthy(evaluate(node.test, st, node));
            const visits = new Map(st.visits).set(node.id, seen);
            const go = (cond: BoolTerm, to: number): PathTree => {
              const pc = [...st.pc, cond];
              if (!solve(pc).sat) return { kind: 'infeasible' };
              return run({ node: to, env: new Map(st.env), pc, visits });
            };
            const thenTree = go(c, node.succ[0]!);
            const elseTree = go(not(c), node.succ[1] ?? node.succ[0]!);
            return { kind: 'branch', node: node.id, line: lineOf(node), text: node.text, condition: showBool(c), then: thenTree, else: elseTree };
          }
          default:
            break;
        }
      } catch (err) {
        if (err instanceof Crash) {
          paths++;
          return { kind: 'throw', node: node.id, model: err.model, conditions: st.pc.slice(0, -1).map(showBool), message: err.message };
        }
        if (err instanceof Unsupported) throw new SymexError(`Line ${lineOf(node)}: the executor does not support ${err.message}`);
        throw err;
      }
      if (node.succ.length !== 1) throw new SymexError(`Unexpected control flow at ${node.text}`);
      st.node = node.succ[0]!;
    }
  }

  const env = new Map<string, SymValue>(cfg.params.map((p) => [p, { k: 'int', t: { t: 'var', name: p } }]));
  const tree = run({ node: cfg.entry, env, pc: [], visits: new Map() });
  return { cfg, tree, findings: [...findings.values()].sort((a, b) => a.line - b.line), paths, queries, maxClauses, conflicts };
}

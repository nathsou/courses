/**
 * The checks an abstract interpreter makes (Part V): every division and remainder must have a divisor that cannot
 * be zero, and every `assert(condition)` must hold. Each analysis decides a check from its fact before the node;
 * keys are stable across analyses of the same graph, so that figures can compare them check by check.
 */
import type estree from 'estree';
import type { Cfg, CfgNode } from '../flow/cfg.js';
import type { Analysis } from '../flow/dataflow.js';

export interface Check {
  /** Stable across analyses of the same graph: node id, kind and position. */
  key: string;
  node: number;
  kind: 'division' | 'assertion';
  /** The divisor or the asserted condition, as source text. */
  label: string;
  proven: boolean;
  /** What the analysis knew, to follow "the divisor" or "the assertion": "is in [0, 3]", "may fail". */
  detail: string;
}

/** An analysis that can decide checks. */
export interface CheckingAnalysis<T> extends Analysis<T> {
  checks(node: CfgNode, fact: T, cfg: Cfg): Check[];
}

export function findDivisions(e: estree.Node | null | undefined, out: estree.BinaryExpression[] = []): estree.BinaryExpression[] {
  if (!e || typeof e !== 'object') return out;
  if (e.type === 'BinaryExpression' && (e.operator === '/' || e.operator === '%')) out.push(e);
  for (const [k, v] of Object.entries(e)) {
    if (k === 'parent' || k === 'range' || k === 'loc') continue;
    if (Array.isArray(v)) v.forEach((c) => c && typeof c === 'object' && 'type' in c && findDivisions(c as estree.Node, out));
    else if (v && typeof v === 'object' && 'type' in v) findDivisions(v as estree.Node, out);
  }
  return out;
}

/** The condition of an `assert(condition)` statement. */
export function assertion(node: CfgNode): estree.Node | undefined {
  const e = node.kind === 'expr' ? node.expr : undefined;
  if (e?.type === 'CallExpression' && e.callee.type === 'Identifier' && e.callee.name === 'assert' && e.arguments[0]) return e.arguments[0] as estree.Node;
  return undefined;
}

const text = (cfg: Cfg, e: estree.Node) => {
  const r = (e as estree.Node & { range?: [number, number] }).range;
  return r ? cfg.source.slice(r[0], r[1]) : e.type;
};

export interface CheckOps<T> {
  isBottom(fact: T): boolean;
  /** Whether a divisor is certainly non-zero, and what is known about it, to follow "the divisor": "is in [0, 3]". */
  divisor(e: estree.Node, fact: T): { nonZero: boolean; value: string };
  /** The fact restricted to executions where `condition` evaluates to `outcome`; bottom if there are none. */
  refine(condition: estree.Node, outcome: boolean, fact: T): T;
}

/** The checks at a node, decided with an analysis's operations. */
export function checksWith<T>(ops: CheckOps<T>, node: CfgNode, fact: T, cfg: Cfg): Check[] {
  if (ops.isBottom(fact)) return [];
  const out: Check[] = [];
  findDivisions(node.value ?? node.test ?? node.expr ?? null).forEach((d, i) => {
    const { nonZero, value } = ops.divisor(d.right, fact);
    out.push({ key: `${node.id}:div:${i}`, node: node.id, kind: 'division', label: text(cfg, d.right), proven: nonZero, detail: value });
  });
  const condition = assertion(node);
  if (condition) {
    const canHold = !ops.isBottom(ops.refine(condition, true, fact));
    const canFail = !ops.isBottom(ops.refine(condition, false, fact));
    out.push({
      key: `${node.id}:assert`,
      node: node.id,
      kind: 'assertion',
      label: text(cfg, condition),
      proven: !canFail,
      detail: !canFail ? 'holds on every execution' : canHold ? 'may fail' : 'always fails',
    });
  }
  return out;
}

/** Messages for the fixpoint stepper, from checks. */
export function alarmsFrom(checks: Check[]): string[] {
  return checks.filter((c) => !c.proven).map((c) => (c.kind === 'division' ? `possible division by zero: the divisor ${c.detail}` : `assertion ${c.detail}`));
}

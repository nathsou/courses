/**
 * Information-flow analysis (chapter 30): which values may depend on a secret? Labels are L (public) and H
 * (secret), joined with L ⊔ H = H. An assignment's label is the join of the labels of what it reads (explicit
 * flows) and, in the implicit mode, of the **pc**: the labels of the conditions it is control-dependent on, since
 * whether it runs at all reveals something about them. `declassify(e)` is public by decision of the programmer.
 * Termination and timing are not tracked: a loop that runs forever for some secrets still leaks.
 */
import type estree from 'estree';
import { buildCfg, type Cfg, type CfgNode } from '../flow/cfg.js';
import { controlDependence } from '../flow/dominators.js';

export type Label = 'L' | 'H';
const join = (a: Label, b: Label): Label => (a === 'H' || b === 'H' ? 'H' : 'L');

export interface IfcResult {
  cfg: Cfg;
  /** Variable labels before each node. */
  input: Record<string, Label>[];
  /** The pc of each node. */
  pc: Label[];
  /** The label of each returned value, by return node. */
  returns: Map<number, Label>;
  /** The join of all returned values. */
  output: Label;
}

/** The label of an expression: the join of the variables it reads, outside `declassify(…)`. */
export function labelOf(e: estree.Node | null | undefined, env: Record<string, Label>): Label {
  if (!e || typeof e !== 'object') return 'L';
  if (e.type === 'CallExpression' && e.callee.type === 'Identifier' && e.callee.name === 'declassify') return 'L';
  if (e.type === 'Identifier') return env[e.name] ?? 'L';
  let out: Label = 'L';
  for (const [k, v] of Object.entries(e)) {
    if (k === 'range' || k === 'loc' || k === 'parent') continue;
    if (e.type === 'MemberExpression' && k === 'property' && !e.computed) continue;
    for (const c of Array.isArray(v) ? v : [v]) if (c && typeof c === 'object' && 'type' in c) out = join(out, labelOf(c as estree.Node, env));
  }
  return out;
}

const valueOf = (n: CfgNode) => (n.kind === 'assign' ? n.value : n.kind === 'cond' ? n.test : n.expr);

export function analyseIfc(source: string, options: { implicit: boolean; secrets?: string[] }): IfcResult {
  const cfg = buildCfg(source);
  const secrets = new Set(options.secrets ?? ['secret']);
  const deps = controlDependence(cfg);
  let pc: Label[] = cfg.nodes.map(() => 'L');
  let input: Record<string, Label>[] = [];
  // The pc depends on the labels at conditions, which depend on the pc: iterate both until stable.
  for (let round = 0; round < 50; round++) {
    input = cfg.nodes.map(() => ({}));
    const output: (Record<string, Label> | undefined)[] = cfg.nodes.map(() => undefined);
    const boundary = Object.fromEntries(cfg.params.map((p) => [p, secrets.has(p) ? 'H' : 'L'])) as Record<string, Label>;
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of cfg.nodes) {
        let env: Record<string, Label> = n.id === cfg.entry ? { ...boundary } : {};
        for (const p of n.pred) for (const [v, l] of Object.entries(output[p] ?? {})) env[v] = join(env[v] ?? 'L', l);
        input[n.id] = env;
        const out = { ...env };
        if ((n.kind === 'assign' || n.kind === 'declare') && n.defs.length) {
          const l = n.kind === 'assign' && n.defs.length === 1 ? labelOf(n.value, env) : 'L';
          for (const d of n.defs) out[d] = options.implicit ? join(l, pc[n.id]!) : l;
        }
        const before = output[n.id];
        if (!before || Object.keys(out).length !== Object.keys(before).length || Object.entries(out).some(([k, v]) => before[k] !== v)) {
          output[n.id] = out;
          changed = true;
        }
      }
    }
    const next = cfg.nodes.map((n) => (options.implicit ? [...deps[n.id]!].reduce<Label>((acc, c) => join(acc, labelOf(valueOf(cfg.nodes[c]!), input[c]!)), 'L') : 'L'));
    // A condition nested under a secret condition is itself secret-controlled.
    const closed = next.map((l, n) => [...deps[n]!].reduce<Label>((acc, c) => join(acc, next[c]!), l));
    if (closed.every((l, i) => l === pc[i])) break;
    pc = closed;
  }
  const returns = new Map<number, Label>();
  for (const n of cfg.nodes) if (n.kind === 'return') returns.set(n.id, options.implicit ? join(labelOf(n.expr, input[n.id]!), pc[n.id]!) : labelOf(n.expr, input[n.id]!));
  const output = [...returns.values()].reduce<Label>(join, 'L');
  return { cfg, input, pc, returns, output };
}

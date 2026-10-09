/**
 * A generic dataflow solver over the course's CFGs: monotone transfer functions over a lattice, solved by
 * worklist iteration (chapter 13). It records every step, so that figures can replay the iteration.
 */
import { reversePostorder, type Cfg, type CfgNode } from './cfg.js';

export interface Lattice<T> {
  /** The least element: "no information yet". */
  bottom: T;
  join(a: T, b: T): T;
  equal(a: T, b: T): boolean;
  format(a: T, cfg: Cfg): string;
}

export interface Analysis<T> {
  name: string;
  direction: 'forward' | 'backward';
  lattice: Lattice<T>;
  /** The fact at the boundary: at the entry (forward) or at the exit (backward). */
  boundary(cfg: Cfg): T;
  /** From the fact before the node (in the analysis's direction) to the fact after it. */
  transfer(node: CfgNode, fact: T, cfg: Cfg): T;
  /**
   * Optional refinement of the fact flowing along the edge `from → to` (forward analyses): what the branch taken
   * says, such as "the condition was true" (chapter 16).
   */
  edge?(from: CfgNode, to: number, fact: T, cfg: Cfg): T;
  /** Optional widening, applied at loop heads after the first visits (Part V). */
  widen?(previous: T, next: T): T;
}

export interface Step<T> {
  node: number;
  /** Fact flowing into the node (joined from its predecessors in the analysis's direction). */
  input: T;
  /** Fact flowing out before and after this step. */
  before: T;
  after: T;
  changed: boolean;
  /** The worklist after the step. */
  worklist: number[];
}

export interface Solution<T> {
  /** Facts before each node, in program order (for a backward analysis: the fact after the node in program order is `output`). */
  input: T[];
  output: T[];
  steps: Step<T>[];
  /** True if the step limit was reached before a fixpoint. */
  truncated: boolean;
}

/**
 * Solves `analysis` on `cfg` with a worklist, initialised with every node in reverse postorder (forward) or
 * postorder (backward). `output[n]` is the fact flowing out of `n` in the analysis's direction.
 */
export function solve<T>(cfg: Cfg, analysis: Analysis<T>, maxSteps = 5000): Solution<T> {
  const { lattice } = analysis;
  const forward = analysis.direction === 'forward';
  const order = forward ? reversePostorder(cfg) : reversePostorder(cfg).reverse();
  const preds = (n: number) => (forward ? cfg.nodes[n]!.pred : cfg.nodes[n]!.succ);
  const succs = (n: number) => (forward ? cfg.nodes[n]!.succ : cfg.nodes[n]!.pred);
  const start = forward ? cfg.entry : cfg.exit;
  const loopHeads = new Set(cfg.backEdges.map(([, to]) => (forward ? to : to)));
  const visits = new Map<number, number>();

  const output: T[] = cfg.nodes.map(() => lattice.bottom);
  const input: T[] = cfg.nodes.map(() => lattice.bottom);
  const worklist = [...order];
  const steps: Step<T>[] = [];
  while (worklist.length && steps.length < maxSteps) {
    const n = worklist.shift()!;
    const along = (p: number) => (forward && analysis.edge ? analysis.edge(cfg.nodes[p]!, n, output[p]!, cfg) : output[p]!);
    const inFact = n === start ? analysis.boundary(cfg) : preds(n).reduce((acc, p) => lattice.join(acc, along(p)), lattice.bottom);
    input[n] = inFact;
    let out = analysis.transfer(cfg.nodes[n]!, inFact, cfg);
    const count = (visits.get(n) ?? 0) + 1;
    visits.set(n, count);
    if (analysis.widen && loopHeads.has(n) && count > 2) out = analysis.widen(output[n]!, out);
    const before = output[n]!;
    const changed = !lattice.equal(before, out);
    if (changed) {
      output[n] = out;
      for (const s of succs(n)) if (!worklist.includes(s)) worklist.push(s);
    }
    steps.push({ node: n, input: inFact, before, after: out, changed, worklist: [...worklist] });
  }
  return { input, output, steps, truncated: worklist.length > 0 };
}

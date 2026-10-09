/**
 * Interprocedural taint analysis as an IFDS problem (chapters 26 and 29).
 *
 * The program is a module of top-level functions. Each has a statement-level CFG (chapter 12); together, with an
 * edge from each call to the callee's entry and from the callee's exit back to the statement after the call, they
 * form the **supergraph**. A fact is a variable of the current function that may hold tainted data, `<ret>` for a
 * tainted return value, or Λ (the "zero" fact, which always holds and generates new facts). Flow functions are
 * distributive (each fact is handled alone), so the analysis is reachability in the **exploded supergraph** whose
 * nodes are (statement, fact) pairs. The tabulation algorithm of Reps, Horwitz and Sagiv only follows realizable
 * paths, where every return goes back to the call it came from; the context-insensitive mode follows every path,
 * returning to every caller, to show what that costs.
 *
 * What is a source, a sink or a sanitizer comes from a model. The default model has `source()`, `sink(x)` and
 * `sanitize(x)`; chapter 29 uses a model of Node.js APIs.
 */
import type estree from 'estree';
import { lowerFunction, parseFunctions, CfgError, type Cfg, type CfgNode } from '../flow/cfg.js';

export const ZERO = 'Λ';
export const RET = '<ret>';

export interface TaintModel {
  /** A label if the expression produces tainted data by itself (`source()`, `req.query`). */
  source(e: estree.Node): string | undefined;
  /** For a call that is a sink: the indices of the arguments that must not be tainted, and a label. */
  sink(call: estree.CallExpression): { args: number[]; label: string } | undefined;
  /** Whether a call returns a clean value whatever its arguments. */
  sanitizer(call: estree.CallExpression): boolean;
}

const calleeName = (call: estree.CallExpression) => (call.callee.type === 'Identifier' ? call.callee.name : call.callee.type === 'MemberExpression' && !call.callee.computed && call.callee.property.type === 'Identifier' ? call.callee.property.name : undefined);

export const TOY_MODEL: TaintModel = {
  source: (e) => (e.type === 'CallExpression' && e.callee.type === 'Identifier' && e.callee.name === 'source' ? 'source()' : undefined),
  sink: (call) => (call.callee.type === 'Identifier' && call.callee.name === 'sink' ? { args: [0], label: 'sink()' } : undefined),
  sanitizer: (call) => calleeName(call) === 'sanitize',
};

export interface Leak {
  fn: string;
  node: number;
  fact: string;
  sink: string;
  range?: [number, number];
}

/** A call from a statement to a function of the module. */
export interface CallInfo {
  callee: string;
  args: estree.Node[];
  /** The variable the result goes to, `<ret>` for `return f(…)`, or undefined. */
  target?: string;
}

export interface Supergraph {
  /** Functions by name, in source order. */
  fns: Map<string, Cfg>;
  entry: string;
  /** Calls to module functions, by function and node id. */
  calls: Map<string, Map<number, CallInfo>>;
  /** Facts of each function: Λ, its variables, and `<ret>`. */
  facts: Map<string, string[]>;
}

export interface Result {
  graph: Supergraph;
  /** Reached (node, fact) pairs, per function: `${node}|${fact}`. */
  reached: Map<string, Set<string>>;
  leaks: Leak[];
  /** Summary edges found by the tabulation: per function, entry fact → exit facts. */
  summaries: Map<string, Map<string, Set<string>>>;
  /** Number of (path or plain) edges processed. */
  work: number;
}

export function buildSupergraph(source: string, entry?: string): Supergraph {
  const fns = new Map<string, Cfg>();
  for (const f of parseFunctions(source)) {
    const cfg = lowerFunction(f, source);
    fns.set(cfg.name, cfg);
  }
  if (!fns.size) throw new CfgError('No function found');
  const entryName = entry && fns.has(entry) ? entry : fns.has('main') ? 'main' : [...fns.keys()][0]!;
  const calls = new Map<string, Map<number, CallInfo>>();
  const facts = new Map<string, string[]>();
  for (const [name, cfg] of fns) {
    const m = new Map<number, CallInfo>();
    for (const node of cfg.nodes) {
      const e = node.kind === 'assign' ? node.value : node.kind === 'expr' || node.kind === 'return' ? node.expr : undefined;
      if (e?.type === 'CallExpression' && e.callee.type === 'Identifier' && fns.has(e.callee.name)) {
        m.set(node.id, { callee: e.callee.name, args: e.arguments as estree.Node[], target: node.kind === 'assign' ? node.defs[0] : node.kind === 'return' ? RET : undefined });
      }
    }
    calls.set(name, m);
    facts.set(name, [ZERO, ...cfg.variables, RET]);
  }
  return { fns, entry: entryName, calls, facts };
}

/** Does `e` carry the taint of variable `d`? Sanitizers stop it; other calls pass it through. */
function carries(e: estree.Node | null | undefined, d: string, model: TaintModel): boolean {
  if (!e) return false;
  if (e.type === 'CallExpression' && model.sanitizer(e)) return false;
  if (e.type === 'Identifier') return e.name === d;
  if (e.type === 'FunctionExpression' || e.type === 'ArrowFunctionExpression') return false;
  for (const [k, v] of Object.entries(e)) {
    if (k === 'range' || k === 'loc' || k === 'parent') continue;
    if (e.type === 'MemberExpression' && k === 'property' && !e.computed) continue;
    if (e.type === 'Property' && k === 'key' && !e.computed) continue;
    if (Array.isArray(v) ? v.some((c) => c && typeof c === 'object' && 'type' in c && carries(c as estree.Node, d, model)) : v && typeof v === 'object' && 'type' in v && carries(v as estree.Node, d, model)) return true;
  }
  return false;
}

/** Does `e` contain a source that no sanitizer wraps? Returns its label. */
function generates(e: estree.Node | null | undefined, model: TaintModel): string | undefined {
  if (!e) return undefined;
  if (e.type === 'CallExpression' && model.sanitizer(e)) return undefined;
  const s = model.source(e);
  if (s) return s;
  if (e.type === 'FunctionExpression' || e.type === 'ArrowFunctionExpression') return undefined;
  for (const [k, v] of Object.entries(e)) {
    if (k === 'range' || k === 'loc' || k === 'parent') continue;
    for (const c of Array.isArray(v) ? v : [v]) {
      if (c && typeof c === 'object' && 'type' in c) {
        const found = generates(c as estree.Node, model);
        if (found) return found;
      }
    }
  }
  return undefined;
}

function sinkCalls(e: estree.Node | null | undefined, model: TaintModel, out: { call: estree.CallExpression; args: number[]; label: string }[] = []) {
  if (!e || typeof e !== 'object') return out;
  if (e.type === 'CallExpression') {
    const s = model.sink(e);
    if (s) out.push({ call: e, ...s });
  }
  if (e.type === 'FunctionExpression' || e.type === 'ArrowFunctionExpression') return out;
  for (const [k, v] of Object.entries(e)) {
    if (k === 'range' || k === 'loc' || k === 'parent') continue;
    for (const c of Array.isArray(v) ? v : [v]) if (c && typeof c === 'object' && 'type' in c) sinkCalls(c as estree.Node, model, out);
  }
  return out;
}

const valueOf = (node: CfgNode): estree.Node | undefined => (node.kind === 'assign' ? node.value : node.kind === 'expr' || node.kind === 'return' || node.kind === 'throw' ? node.expr : node.kind === 'cond' ? node.test : undefined);

/** The flow function of an ordinary statement (not a call to a module function), for one fact. */
export function normalFlow(node: CfgNode, d: string, model: TaintModel): string[] {
  const e = valueOf(node);
  if (node.kind === 'assign' && node.defs.length === 1) {
    const x = node.defs[0]!;
    const out: string[] = [];
    if (d === ZERO) {
      out.push(ZERO);
      if (generates(e, model)) out.push(x);
      return out;
    }
    if (d !== x) out.push(d);
    if (carries(e, d, model) && !out.includes(x)) out.push(x);
    return out;
  }
  if (node.kind === 'declare' || (node.kind === 'assign' && node.defs.length > 1)) return node.defs.includes(d) ? [] : [d];
  if (node.kind === 'return') {
    if (d === ZERO) return generates(e, model) ? [ZERO, RET] : [ZERO];
    return carries(e, d, model) ? [d, RET] : [d];
  }
  return [d];
}

function callFlow(call: CallInfo, callee: Cfg, d: string, model: TaintModel): string[] {
  if (d === ZERO) {
    const out = [ZERO];
    call.args.forEach((a, i) => callee.params[i] && generates(a, model) && out.push(callee.params[i]!));
    return out;
  }
  return call.args.flatMap((a, i) => (callee.params[i] && carries(a, d, model) ? [callee.params[i]!] : []));
}

function returnFlow(call: CallInfo, d: string): string[] {
  if (d === ZERO) return [ZERO];
  return d === RET && call.target ? [call.target] : [];
}

function callToReturnFlow(call: CallInfo, d: string): string[] {
  if (d === ZERO) return [ZERO];
  return d === call.target ? [] : [d];
}

/** The leaks at a node, for one fact holding before it. */
function leaksAt(fn: string, node: CfgNode, d: string, model: TaintModel): Leak[] {
  const out: Leak[] = [];
  for (const s of sinkCalls(valueOf(node), model)) {
    const bad = s.args.some((i) => {
      const a = s.call.arguments[i] as estree.Node | undefined;
      return a && (d === ZERO ? !!generates(a, model) : carries(a, d, model));
    });
    if (bad) out.push({ fn, node: node.id, fact: d, sink: s.label, range: node.range });
  }
  return out;
}

export interface SolveOptions {
  model?: TaintModel;
  /** Match each return with its call (IFDS); false follows every return to every caller. */
  contextSensitive?: boolean;
}

/** One edge of the exploded supergraph. */
export interface ExplodedEdge {
  from: { fn: string; node: number; fact: string };
  to: { fn: string; node: number; fact: string };
  kind: 'normal' | 'call' | 'return' | 'call-to-return';
  /** For return edges, the call node they return to. */
  call?: number;
}

/** Every edge of the exploded supergraph: the flow functions, drawn. */
export function explodedEdges(graph: Supergraph, model: TaintModel = TOY_MODEL): ExplodedEdge[] {
  const out: ExplodedEdge[] = [];
  for (const [fn, cfg] of graph.fns) {
    const calls = graph.calls.get(fn)!;
    for (const node of cfg.nodes) {
      if (node.kind === 'exit') continue;
      const call = calls.get(node.id);
      const callee = call && graph.fns.get(call.callee)!;
      for (const d of graph.facts.get(fn)!) {
        if (call && callee) {
          for (const d2 of callFlow(call, callee, d, model)) out.push({ from: { fn, node: node.id, fact: d }, to: { fn: call.callee, node: callee.entry, fact: d2 }, kind: 'call' });
          for (const r of node.succ) for (const d2 of callToReturnFlow(call, d)) out.push({ from: { fn, node: node.id, fact: d }, to: { fn, node: r, fact: d2 }, kind: 'call-to-return' });
        } else {
          for (const m of node.succ) for (const d2 of normalFlow(node, d, model)) out.push({ from: { fn, node: node.id, fact: d }, to: { fn, node: m, fact: d2 }, kind: 'normal' });
        }
      }
      if (call && callee)
        for (const d of graph.facts.get(call.callee)!)
          for (const r of node.succ) for (const d2 of returnFlow(call, d)) out.push({ from: { fn: call.callee, node: callee.exit, fact: d }, to: { fn, node: r, fact: d2 }, kind: 'return', call: node.id });
    }
  }
  return out;
}

export function solveTaint(graph: Supergraph, options: SolveOptions = {}): Result {
  const model = options.model ?? TOY_MODEL;
  const reached = new Map<string, Set<string>>([...graph.fns.keys()].map((f) => [f, new Set<string>()]));
  const summaries = new Map<string, Map<string, Set<string>>>([...graph.fns.keys()].map((f) => [f, new Map()]));
  const leaks = new Map<string, Leak>();
  let work = 0;
  const mark = (fn: string, node: number, fact: string) => {
    reached.get(fn)!.add(`${node}|${fact}`);
    for (const l of leaksAt(fn, graph.fns.get(fn)!.nodes[node]!, fact, model)) leaks.set(`${l.fn}:${l.node}:${l.sink}`, l);
  };

  if (options.contextSensitive === false) {
    // Plain reachability on the exploded supergraph: an exit returns to every call of its function that is
    // reachable at all, whichever call the facts came from.
    const edges = explodedEdges(graph, model);
    const key = (p: { fn: string; node: number; fact: string }) => `${p.fn}:${p.node}:${p.fact}`;
    const entryCfg = graph.fns.get(graph.entry)!;
    const seen = new Set([key({ fn: graph.entry, node: entryCfg.entry, fact: ZERO })]);
    mark(graph.entry, entryCfg.entry, ZERO);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of edges) {
        work++;
        if (!seen.has(key(e.from)) || seen.has(key(e.to))) continue;
        if (e.kind === 'return' && !reached.get(e.to.fn)!.has(`${e.call}|${ZERO}`)) continue;
        seen.add(key(e.to));
        mark(e.to.fn, e.to.node, e.to.fact);
        changed = true;
      }
    }
    return { graph, reached, leaks: [...leaks.values()], summaries, work };
  }

  // The tabulation algorithm: path edges ⟨entry, d1⟩ → ⟨n, d2⟩ within each function, with end summaries.
  const pathEdges = new Set<string>();
  const worklist: [string, string, number, string][] = [];
  /** For each callee and entry fact: the calls that reached it, with the caller's path-edge sources. */
  const incoming = new Map<string, { fn: string; call: number; d1: string; d2: string }[]>();
  const endSummary = summaries;
  const propagate = (fn: string, d1: string, n: number, d2: string) => {
    const k = `${fn}|${d1}|${n}|${d2}`;
    if (pathEdges.has(k)) return;
    pathEdges.add(k);
    worklist.push([fn, d1, n, d2]);
    mark(fn, n, d2);
  };
  const entryCfg = graph.fns.get(graph.entry)!;
  propagate(graph.entry, ZERO, entryCfg.entry, ZERO);
  while (worklist.length) {
    const [fn, d1, n, d2] = worklist.shift()!;
    work++;
    const cfg = graph.fns.get(fn)!;
    const node = cfg.nodes[n]!;
    const call = graph.calls.get(fn)!.get(n);
    if (call) {
      const callee = graph.fns.get(call.callee)!;
      for (const d3 of callFlow(call, callee, d2, model)) {
        const ik = `${call.callee}|${d3}`;
        incoming.set(ik, [...(incoming.get(ik) ?? []), { fn, call: n, d1, d2 }]);
        propagate(call.callee, d3, callee.entry, d3);
        for (const d4 of endSummary.get(call.callee)!.get(d3) ?? []) for (const d5 of returnFlow(call, d4)) for (const r of node.succ) propagate(fn, d1, r, d5);
      }
      for (const d3 of callToReturnFlow(call, d2)) for (const r of node.succ) propagate(fn, d1, r, d3);
    } else if (n === cfg.exit) {
      const sums = endSummary.get(fn)!;
      sums.set(d1, (sums.get(d1) ?? new Set()).add(d2));
      for (const c of incoming.get(`${fn}|${d1}`) ?? []) {
        const callerNode = graph.fns.get(c.fn)!.nodes[c.call]!;
        const info = graph.calls.get(c.fn)!.get(c.call)!;
        for (const d5 of returnFlow(info, d2)) for (const r of callerNode.succ) propagate(c.fn, c.d1, r, d5);
      }
    } else {
      for (const m of node.succ) for (const d3 of normalFlow(node, d2, model)) propagate(fn, d1, m, d3);
    }
  }
  return { graph, reached, leaks: [...leaks.values()], summaries, work };
}

/** Runs the analysis on source code. */
export function analyseTaint(source: string, options: SolveOptions & { entry?: string } = {}): Result {
  return solveTaint(buildSupergraph(source, options.entry), options);
}


/**
 * The return edges a solution used: in the context-sensitive mode, those that carry a summary of the callee for
 * facts that entered it from that very call; otherwise, every return edge from a reached exit fact to a reached call.
 */
export function usedReturnEdges(result: Result, options: SolveOptions = {}): Set<string> {
  const model = options.model ?? TOY_MODEL;
  const { graph, reached, summaries } = result;
  const used = new Set<string>();
  for (const [fn, calls] of graph.calls) {
    for (const [n, call] of calls) {
      const callee = graph.fns.get(call.callee)!;
      const atCall = [...reached.get(fn)!].filter((k) => k.startsWith(`${n}|`)).map((k) => k.slice(String(n).length + 1));
      if (!atCall.includes(ZERO)) continue;
      const exitFacts = new Set<string>();
      if (options.contextSensitive === false) {
        for (const k of reached.get(call.callee)!) if (k.startsWith(`${callee.exit}|`)) exitFacts.add(k.slice(String(callee.exit).length + 1));
      } else {
        for (const d2 of atCall) for (const d3 of callFlow(call, callee, d2, model)) for (const d4 of summaries.get(call.callee)!.get(d3) ?? []) exitFacts.add(d4);
      }
      for (const d of exitFacts) used.add(`${call.callee}:${callee.exit}:${d}>${fn}:${n}`);
    }
  }
  return used;
}

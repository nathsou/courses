/**
 * E-graphs and equality saturation, after egg (Willsey et al., 2021): hash-consed e-nodes, a
 * union-find over e-classes, deferred congruence repair ("rebuilding"), e-matching, and extraction.
 */
import type { Rule } from './parse';
import { f, show, v, type Term } from './term';

export type ClassId = number;

export interface ENode {
  op: string;
  children: ClassId[];
}

export interface EClass {
  id: ClassId;
  nodes: ENode[];
  /** Nodes that mention this class, with the class they belong to (for congruence repair). */
  parents: [ENode, ClassId][];
}

const nodeKey = (n: ENode) => (n.children.length ? `${n.op}(${n.children.join(',')})` : n.op);

export class EGraph {
  private parent: ClassId[] = [];
  /** Canonical e-node → its class. */
  memo = new Map<string, ClassId>();
  classes = new Map<ClassId, EClass>();
  private pending: ClassId[] = [];
  /** Number of unions performed (for statistics). */
  unions = 0;

  find(id: ClassId): ClassId {
    while (this.parent[id] !== id) {
      this.parent[id] = this.parent[this.parent[id]!]!; // path halving
      id = this.parent[id]!;
    }
    return id;
  }

  canonicalize(n: ENode): ENode {
    return { op: n.op, children: n.children.map((c) => this.find(c)) };
  }

  /** Add an e-node; returns the class it is in (an existing one if the node is already present). */
  addNode(n0: ENode): ClassId {
    const n = this.canonicalize(n0);
    const k = nodeKey(n);
    const found = this.memo.get(k);
    if (found !== undefined) return this.find(found);
    const id = this.parent.length;
    this.parent.push(id);
    this.classes.set(id, { id, nodes: [n], parents: [] });
    for (const c of n.children) this.classes.get(this.find(c))!.parents.push([n, id]);
    this.memo.set(k, id);
    return id;
  }

  /** Add a term bottom-up. */
  add(t: Term): ClassId {
    if (t.type === 'var') return this.addNode({ op: `?${t.name}`, children: [] });
    return this.addNode({ op: t.name, children: t.args.map((a) => this.add(a)) });
  }

  /** Merge two classes. Congruence is restored later, by `rebuild`. */
  union(a: ClassId, b: ClassId): boolean {
    a = this.find(a);
    b = this.find(b);
    if (a === b) return false;
    this.unions++;
    const ca = this.classes.get(a)!, cb = this.classes.get(b)!;
    // Keep the bigger class as the root.
    const [root, child] = ca.parents.length + ca.nodes.length >= cb.parents.length + cb.nodes.length ? [ca, cb] : [cb, ca];
    this.parent[child.id] = root.id;
    root.nodes.push(...child.nodes);
    root.parents.push(...child.parents);
    this.classes.delete(child.id);
    this.pending.push(root.id);
    return true;
  }

  /** Restore the invariants: canonical memo keys, and congruence (equal children ⇒ equal class). */
  rebuild(): number {
    let repairs = 0;
    while (this.pending.length) {
      const todo = [...new Set(this.pending.map((c) => this.find(c)))];
      this.pending = [];
      for (const id of todo) {
        repairs++;
        this.repair(id);
      }
    }
    return repairs;
  }

  private repair(id: ClassId): void {
    const cls = this.classes.get(this.find(id));
    if (!cls) return;
    // Re-canonicalise parents; merge parents that have become congruent.
    const seen = new Map<string, ClassId>();
    for (const [pn, pc] of cls.parents) {
      const old = nodeKey(pn);
      if (this.memo.get(old) !== undefined) this.memo.delete(old);
      const canon = this.canonicalize(pn);
      const k = nodeKey(canon);
      const other = seen.get(k) ?? this.memo.get(k);
      if (other !== undefined) this.union(other, pc);
      seen.set(k, this.find(pc));
      this.memo.set(k, this.find(pc));
    }
    const cur = this.classes.get(this.find(id));
    if (!cur) return;
    cur.parents = [...seen].map(([k, c]) => [this.parseKeyNode(k), this.find(c)]);
    // Deduplicate nodes inside the class.
    const nodes = new Map<string, ENode>();
    for (const n of cur.nodes) {
      const c = this.canonicalize(n);
      nodes.set(nodeKey(c), c);
    }
    cur.nodes = [...nodes.values()];
  }

  private parseKeyNode(k: string): ENode {
    const i = k.indexOf('(');
    if (i < 0) return { op: k, children: [] };
    return { op: k.slice(0, i), children: k.slice(i + 1, -1).split(',').map(Number) };
  }

  get size(): { nodes: number; classes: number } {
    let nodes = 0;
    for (const c of this.classes.values()) nodes += c.nodes.length;
    return { nodes, classes: this.classes.size };
  }

  /** Are two terms known to be equal? */
  equivalent(s: Term, t: Term): boolean {
    return this.find(this.add(s)) === this.find(this.add(t));
  }

  // ───────────── e-matching ─────────────

  /** All matches of a pattern: the class it matches in, and the variables bound to classes. */
  ematch(pattern: Term): { cls: ClassId; sigma: Map<string, ClassId> }[] {
    const out: { cls: ClassId; sigma: Map<string, ClassId> }[] = [];
    for (const cls of this.classes.keys()) for (const sigma of this.matchIn(pattern, cls, new Map())) out.push({ cls, sigma });
    return out;
  }

  private *matchIn(p: Term, cls: ClassId, sigma: Map<string, ClassId>): Generator<Map<string, ClassId>> {
    cls = this.find(cls);
    if (p.type === 'var') {
      const b = sigma.get(p.name);
      if (b === undefined) yield new Map(sigma).set(p.name, cls);
      else if (this.find(b) === cls) yield sigma;
      return;
    }
    const c = this.classes.get(cls);
    if (!c) return;
    for (const n of c.nodes) {
      if (n.op !== p.name || n.children.length !== p.args.length) continue;
      yield* this.matchArgs(p.args, n.children, 0, sigma);
    }
  }

  private *matchArgs(ps: readonly Term[], cs: ClassId[], i: number, sigma: Map<string, ClassId>): Generator<Map<string, ClassId>> {
    if (i === ps.length) {
      yield sigma;
      return;
    }
    for (const s of this.matchIn(ps[i]!, cs[i]!, sigma)) yield* this.matchArgs(ps, cs, i + 1, s);
  }

  /** Add an instance of a pattern, with variables standing for classes. */
  instantiate(p: Term, sigma: ReadonlyMap<string, ClassId>): ClassId {
    if (p.type === 'var') {
      const c = sigma.get(p.name);
      if (c === undefined) throw new Error(`unbound variable ${p.name}`);
      return c;
    }
    return this.addNode({ op: p.name, children: p.args.map((a) => this.instantiate(a, sigma)) });
  }

  // ───────────── extraction ─────────────

  /** The cheapest term in each class, by a cost function on nodes (default: term size). */
  extract(root: ClassId, cost: (op: string, childCosts: number[]) => number = (_, cs) => 1 + cs.reduce((a, b) => a + b, 0)): { term: Term; cost: number } {
    const best = new Map<ClassId, { cost: number; node: ENode }>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, c] of this.classes) {
        for (const n of c.nodes) {
          const cc = n.children.map((ch) => best.get(this.find(ch))?.cost);
          if (cc.some((x) => x === undefined)) continue;
          const k = cost(n.op, cc as number[]);
          const cur = best.get(id);
          if (!cur || k < cur.cost) {
            best.set(id, { cost: k, node: n });
            changed = true;
          }
        }
      }
    }
    const build = (id: ClassId, depth = 0): Term => {
      const b = best.get(this.find(id));
      if (!b || depth > 500) throw new Error('no finite term in this class');
      if (b.node.op.startsWith('?')) return v(b.node.op.slice(1));
      return f(b.node.op, ...b.node.children.map((c) => build(c, depth + 1)));
    };
    const r = best.get(this.find(root));
    if (!r) throw new Error('no finite term in this class');
    return { term: build(root), cost: r.cost };
  }

  /** A snapshot for drawing: classes with their nodes (children as canonical class ids). */
  snapshot(): { id: ClassId; nodes: ENode[] }[] {
    return [...this.classes.values()].map((c) => ({ id: c.id, nodes: c.nodes.map((n) => this.canonicalize(n)) })).sort((a, b) => a.id - b.id);
  }
}

export interface SaturationIteration {
  matches: number;
  unions: number;
  nodes: number;
  classes: number;
}

export interface SaturationReport {
  iterations: SaturationIteration[];
  stop: 'saturated' | 'iteration limit' | 'node limit' | 'goal';
}

/**
 * Equality saturation: apply every rule at every match (as an equality, never destructively),
 * rebuild, and repeat until nothing changes or a limit is hit. Rules are used left to right;
 * add the reverse rule to use an equation both ways.
 */
export function saturate(eg: EGraph, rules: readonly Rule[], opts: { iterations?: number; nodes?: number; goal?: () => boolean } = {}): SaturationReport {
  const { iterations: maxIt = 12, nodes: maxNodes = 5000, goal } = opts;
  const iterations: SaturationIteration[] = [];
  for (let it = 0; it < maxIt; it++) {
    // Read phase: find all matches first, then write (as egg does).
    const found: { rule: Rule; cls: ClassId; sigma: Map<string, ClassId> }[] = [];
    for (const rule of rules) for (const m of eg.ematch(rule.lhs)) found.push({ rule, ...m });
    let unions = 0;
    for (const { rule, cls, sigma } of found) {
      const r = eg.instantiate(rule.rhs, sigma);
      if (eg.union(cls, r)) unions++;
      if (eg.size.nodes > maxNodes) break;
    }
    eg.rebuild();
    const { nodes, classes } = eg.size;
    iterations.push({ matches: found.length, unions, nodes, classes });
    if (goal?.()) return { iterations, stop: 'goal' };
    if (nodes > maxNodes) return { iterations, stop: 'node limit' };
    if (unions === 0) return { iterations, stop: 'saturated' };
  }
  return { iterations, stop: 'iteration limit' };
}

/** Simplify a term by equality saturation and extraction. */
export function simplify(t: Term, rules: readonly Rule[], opts: { iterations?: number; nodes?: number; cost?: (op: string, cs: number[]) => number } = {}): { term: Term; cost: number; report: SaturationReport; graph: EGraph } {
  const eg = new EGraph();
  const root = eg.add(t);
  const report = saturate(eg, rules, opts);
  const { term, cost } = eg.extract(root, opts.cost);
  return { term, cost, report, graph: eg };
}

export const showENode = (n: ENode) => (n.children.length ? `${n.op}(${n.children.map((c) => `#${c}`).join(', ')})` : n.op);
export { show };

/** Union-find with path compression and union by size: the core of every e-graph. */
export class UnionFind {
  private parent: number[] = [];
  private size: number[] = [];

  /** Add a new singleton set; returns its id. */
  make(): number {
    this.parent.push(this.parent.length);
    this.size.push(1);
    return this.parent.length - 1;
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root]!;
    while (this.parent[x] !== root) {
      const next = this.parent[x]!;
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  /** Merge the sets of a and b; returns the new root, or -1 if they were already together. */
  union(a: number, b: number): number {
    let x = this.find(a), y = this.find(b);
    if (x === y) return -1;
    if (this.size[x]! < this.size[y]!) [x, y] = [y, x];
    this.parent[y] = x;
    this.size[x]! += this.size[y]!;
    return x;
  }

  same(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }

  get count(): number {
    return this.parent.length;
  }
}

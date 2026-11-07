/**
 * Performance: hash-consing (maximal sharing) and memoised normal forms.
 *
 * A hash-consing table guarantees that structurally equal terms are the same object, so equality
 * is a pointer comparison and a term can be used as a cache key. Memoising normal forms then turns
 * exponential computations with repeated subterms (like the naive Fibonacci) into linear ones.
 */
import type { RewriteSystem } from './rewrite';
import { builtin } from './rewrite';
import type { Fn, Term } from './term';

/** A shared term: a term with a unique id. */
export type Shared = Term & { readonly id: number };

export class HashCons {
  private table = new Map<string, Shared>();
  private next = 0;
  hits = 0;

  get size(): number {
    return this.table.size;
  }

  variable(name: string): Shared {
    return this.intern(`?${name}`, () => ({ type: 'var', name, id: this.next++ }));
  }

  /** The unique node for `name(args…)`; the arguments must already be shared. */
  node(name: string, args: readonly Shared[]): Shared {
    const k = args.length ? `${name}(${args.map((a) => a.id).join(',')})` : name;
    return this.intern(k, () => ({ type: 'fn', name, args, id: this.next++ }));
  }

  private intern(k: string, make: () => Shared): Shared {
    const found = this.table.get(k);
    if (found) {
      this.hits++;
      return found;
    }
    const t = make();
    this.table.set(k, t);
    return t;
  }

  /** Share an ordinary term. */
  share(t: Term): Shared {
    if (t.type === 'var') return this.variable(t.name);
    return this.node(t.name, t.args.map((a) => this.share(a)));
  }
}

/** Count the distinct subterms of a term (its size as a maximally shared DAG). */
export function dagSize(t: Term): number {
  const h = new HashCons();
  h.share(t);
  return h.size;
}

export interface SharedEvalStats {
  steps: number;
  cacheHits: number;
  nodes: number;
}

/**
 * Innermost evaluation over hash-consed terms, with a table of normal forms. Requires a
 * deterministic system (with `#priority`, or confluent and terminating) so that each term has one
 * innermost normal form. Laziness markers are not supported here.
 */
export function evaluateShared(sys: RewriteSystem, t: Term, opts: { memo?: boolean; fuel?: number } = {}): { term: Term; stats: SharedEvalStats } {
  const memo = opts.memo ?? true;
  let fuel = opts.fuel ?? 5_000_000;
  const h = new HashCons();
  const nf = new Map<number, Shared>();
  const byHead = new Map<string, { lhs: Term; rhs: Term }[]>();
  for (const r of sys.rules) if (r.lhs.type === 'fn') (byHead.get(r.lhs.name) ?? byHead.set(r.lhs.name, []).get(r.lhs.name)!).push(r);
  const stats: SharedEvalStats = { steps: 0, cacheHits: 0, nodes: 0 };

  const matchS = (p: Term, u: Shared, s: Map<string, Shared>): boolean => {
    if (p.type === 'var') {
      const b = s.get(p.name);
      if (b === undefined) {
        s.set(p.name, u);
        return true;
      }
      return b === u; // pointer equality: this is what sharing buys
    }
    if (u.type === 'var' || u.name !== p.name || u.args.length !== p.args.length) return false;
    for (let i = 0; i < p.args.length; i++) if (!matchS(p.args[i]!, u.args[i] as Shared, s)) return false;
    return true;
  };
  const inst = (p: Term, s: Map<string, Shared>): Shared => (p.type === 'var' ? s.get(p.name)! : h.node(p.name, p.args.map((a) => inst(a, s))));

  const norm = (u: Shared): Shared => {
    if (u.type === 'var') return u;
    if (memo) {
      const cached = nf.get(u.id);
      if (cached) {
        stats.cacheHits++;
        return cached;
      }
    }
    const start = u;
    let cur: Shared = u;
    for (;;) {
      if (cur.type === 'var') break;
      const args = (cur as Fn).args.map((a) => norm(a as Shared));
      cur = h.node(cur.name, args);
      if (memo) {
        const cached = nf.get(cur.id);
        if (cached) {
          stats.cacheHits++;
          cur = cached;
          break;
        }
      }
      let next: Shared | null = null;
      const b = builtin(cur);
      if (b) next = h.share(b.result);
      else
        for (const r of byHead.get(cur.name) ?? []) {
          const s = new Map<string, Shared>();
          if (matchS(r.lhs, cur, s)) {
            next = inst(r.rhs, s);
            break;
          }
        }
      if (!next) break;
      if (--fuel < 0) throw new RangeError('out of fuel');
      stats.steps++;
      cur = next;
    }
    if (memo) {
      nf.set(start.id, cur);
      nf.set(cur.id, cur);
    }
    return cur;
  };
  const term = norm(h.share(t));
  stats.nodes = h.size;
  return { term, stats };
}

/**
 * Points-to analysis for a JavaScript snippet (chapter 27): which objects can each variable refer to, and which
 * objects can each object's fields refer to?
 *
 * The snippet is reduced to four kinds of facts, each object identified by its **allocation site** (the literal,
 * `new` or function expression that creates it): `new(v, o)` for `v = {}`, `assign(v, w)` for `v = w`,
 * `store(v, f, w)` for `v.f = w` and `load(v, w, f)` for `v = w.f`. Variables are identified by name, the
 * analysis is flow-insensitive and intraprocedural (calls are ignored), and `a[i]` is the field `[]`.
 *
 * Two solvers: Andersen's, inclusion-based (each `v = w` means pts(w) ⊆ pts(v)), solved with a worklist; and
 * Steensgaard's, unification-based (each `v = w` merges what v and w point to into one class), solved in
 * almost linear time with union-find.
 */
import * as espree from 'espree';
import type estree from 'estree';

export interface Site {
  id: string;
  /** Short description: `{…}`, `new Map()`, `[…]`, `function`. */
  label: string;
  line: number;
  range: [number, number];
}

export type Fact =
  | { kind: 'new'; v: string; o: string }
  | { kind: 'assign'; v: string; w: string }
  | { kind: 'store'; v: string; f: string; w: string }
  | { kind: 'load'; v: string; w: string; f: string };

export interface Extracted {
  facts: Fact[];
  sites: Site[];
  /** Variables in order of appearance (temporaries last). */
  vars: string[];
}

export interface PointsTo {
  pts: Map<string, Set<string>>;
  /** Object → field → objects. */
  heap: Map<string, Map<string, Set<string>>>;
  /** Steensgaard only: the class of each object. */
  classes?: Map<string, number>;
}

export class PointsToError extends Error {}

type Node = estree.Node & { range: [number, number]; loc: estree.SourceLocation };

export function extract(source: string): Extracted {
  let program: estree.Program;
  try {
    program = espree.parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true, loc: true }) as unknown as estree.Program;
  } catch (e) {
    throw new PointsToError(e instanceof Error ? e.message : String(e));
  }
  const facts: Fact[] = [];
  const sites: Site[] = [];
  const vars: string[] = [];
  const temps: string[] = [];
  const see = (v: string) => (v.startsWith('$') ? temps.includes(v) || temps.push(v) : vars.includes(v) || vars.push(v));
  let tempCount = 0;
  const temp = () => {
    const t = `$t${++tempCount}`;
    see(t);
    return t;
  };
  const site = (e: estree.Node, label: string) => {
    const s: Site = { id: `o${sites.length + 1}`, label, line: (e as Node).loc.start.line, range: (e as Node).range };
    sites.push(s);
    return s.id;
  };
  const fieldOf = (m: estree.MemberExpression) => (!m.computed && m.property.type === 'Identifier' ? m.property.name : '[]');

  /** The variable holding the value of `e`, creating a temporary if needed; undefined if `e` is not a pointer. */
  const asVar = (e: estree.Node): string | undefined => {
    if (e.type === 'Identifier') {
      if (e.name === 'undefined') return undefined;
      see(e.name);
      return e.name;
    }
    const t = temp();
    return assignTo(t, e) ? t : undefined;
  };

  /** Records `v = e`. Returns false if `e` can hold no object we track. */
  function assignTo(v: string, e: estree.Node): boolean {
    see(v);
    switch (e.type) {
      case 'Identifier':
        if (e.name === 'undefined') return false;
        see(e.name);
        facts.push({ kind: 'assign', v, w: e.name });
        return true;
      case 'ObjectExpression': {
        facts.push({ kind: 'new', v, o: site(e, '{…}') });
        for (const p of e.properties) {
          if (p.type !== 'Property') continue;
          const f = !p.computed && p.key.type === 'Identifier' ? p.key.name : !p.computed && p.key.type === 'Literal' ? String(p.key.value) : '[]';
          const w = asVar(p.value as estree.Node);
          if (w) facts.push({ kind: 'store', v, f, w });
        }
        return true;
      }
      case 'ArrayExpression': {
        facts.push({ kind: 'new', v, o: site(e, '[…]') });
        for (const el of e.elements) {
          if (!el || el.type === 'SpreadElement') continue;
          const w = asVar(el);
          if (w) facts.push({ kind: 'store', v, f: '[]', w });
        }
        return true;
      }
      case 'NewExpression':
        facts.push({ kind: 'new', v, o: site(e, `new ${e.callee.type === 'Identifier' ? e.callee.name : '…'}()`) });
        return true;
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
      case 'ClassExpression':
        facts.push({ kind: 'new', v, o: site(e, e.type === 'ClassExpression' ? 'class' : 'function') });
        return true;
      case 'MemberExpression': {
        const w = asVar(e.object as estree.Node);
        if (!w) return false;
        facts.push({ kind: 'load', v, w, f: fieldOf(e) });
        return true;
      }
      case 'ConditionalExpression':
        return [assignTo(v, e.consequent), assignTo(v, e.alternate)].some(Boolean);
      case 'LogicalExpression':
        return [assignTo(v, e.left), assignTo(v, e.right)].some(Boolean);
      case 'AssignmentExpression':
        statementLike(e);
        return e.operator === '=' ? assignTo(v, e.left.type === 'Identifier' ? e.left : e.right) : false;
      case 'SequenceExpression':
        e.expressions.slice(0, -1).forEach(statementLike);
        return assignTo(v, e.expressions.at(-1)!);
      default:
        statementLike(e);
        return false;
    }
  }

  /** An expression evaluated for its effects: assignments, and objects created inside it. */
  function statementLike(e: estree.Node) {
    if (e.type === 'AssignmentExpression' && e.operator === '=') {
      if (e.left.type === 'Identifier') assignTo(e.left.name, e.right);
      else if (e.left.type === 'MemberExpression') {
        const base = asVar(e.left.object as estree.Node);
        const w = asVar(e.right);
        if (base && w) facts.push({ kind: 'store', v: base, f: fieldOf(e.left), w });
      }
      return;
    }
    for (const [k, v] of Object.entries(e)) {
      if (k === 'range' || k === 'loc') continue;
      for (const c of Array.isArray(v) ? v : [v]) {
        if (!c || typeof c !== 'object' || !('type' in c)) continue;
        const n = c as estree.Node;
        if (n.type === 'AssignmentExpression') statementLike(n);
        else if (n.type.endsWith('Statement') || n.type.endsWith('Declaration') || n.type === 'VariableDeclarator') statement(n);
        else if (n.type.endsWith('Expression') || n.type === 'Property' || n.type === 'SpreadElement' || n.type === 'SwitchCase' || n.type === 'CatchClause') statementLike(n);
      }
    }
  }

  function statement(s: estree.Node) {
    if (s.type === 'VariableDeclaration') {
      for (const d of s.declarations) if (d.id.type === 'Identifier' && d.init) assignTo(d.id.name, d.init);
      return;
    }
    if (s.type === 'VariableDeclarator') {
      if (s.id.type === 'Identifier' && s.init) assignTo(s.id.name, s.init);
      return;
    }
    if (s.type === 'ExpressionStatement') return statementLike(s.expression);
    if (s.type === 'FunctionDeclaration') {
      if (s.id) facts.push({ kind: 'new', v: (see(s.id.name), s.id.name), o: site(s, 'function') });
      return statementLike(s.body);
    }
    statementLike(s);
  }

  for (const s of program.body) statement(s as estree.Node);
  return { facts, sites, vars: [...vars, ...temps] };
}

/** Andersen's analysis: inclusion constraints, solved with a worklist. */
export function andersen(facts: Fact[]): PointsTo {
  const pts = new Map<string, Set<string>>();
  const heap = new Map<string, Map<string, Set<string>>>();
  const get = (v: string) => pts.get(v) ?? pts.set(v, new Set()).get(v)!;
  const field = (o: string, f: string) => {
    const fields = heap.get(o) ?? heap.set(o, new Map()).get(o)!;
    return fields.get(f) ?? fields.set(f, new Set()).get(f)!;
  };
  for (const f of facts) {
    get(f.v);
    if (f.kind !== 'new') get(f.w);
  }
  const add = (set: Set<string>, items: Iterable<string>) => {
    let grew = false;
    for (const x of items) if (!set.has(x)) set.add(x), (grew = true);
    return grew;
  };
  for (const f of facts) if (f.kind === 'new') get(f.v).add(f.o);
  // Iterate the three other rules until nothing grows. Simple, and fast enough for figures.
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of facts) {
      if (f.kind === 'assign') changed = add(get(f.v), get(f.w)) || changed;
      else if (f.kind === 'store') for (const o of get(f.v)) changed = add(field(o, f.f), get(f.w)) || changed;
      else if (f.kind === 'load') for (const o of get(f.w)) changed = add(get(f.v), field(o, f.f)) || changed;
    }
  }
  return { pts, heap };
}

/** Steensgaard's analysis: unification with union-find. Each class has at most one pointee class per field. */
export function steensgaard(facts: Fact[], sites: string[]): PointsTo {
  const parent: number[] = [];
  const pointee: (number | undefined)[] = [];
  const fields: Map<string, number>[] = [];
  const fresh = () => {
    parent.push(parent.length);
    pointee.push(undefined);
    fields.push(new Map());
    return parent.length - 1;
  };
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!; // path halving
      x = parent[x]!;
    }
    return x;
  };
  /** Merges two classes, then what they point to and their fields, pair by pair, until nothing is left. */
  const union = (a: number, b: number): number => {
    const pending: [number, number][] = [[a, b]];
    while (pending.length) {
      const [p, q] = pending.pop()!;
      const x = find(p);
      const y = find(q);
      if (x === y) continue;
      parent[y] = x;
      const py = pointee[y];
      if (py !== undefined) {
        if (pointee[x] === undefined) pointee[x] = py;
        else pending.push([pointee[x]!, py]);
      }
      for (const [f, c] of fields[y]!) {
        const mine = fields[x]!.get(f);
        if (mine === undefined) fields[x]!.set(f, c);
        else pending.push([mine, c]);
      }
    }
    return find(a);
  };
  // Each variable has a cell; each object has a class of its own until merged.
  const cell = new Map<string, number>();
  const cellOf = (v: string) => cell.get(v) ?? cell.set(v, fresh()).get(v)!;
  const objectClass = new Map(sites.map((o) => [o, fresh()]));
  const target = (c: number) => {
    const r = find(c);
    if (pointee[r] === undefined) pointee[r] = fresh();
    return find(pointee[r]!);
  };
  const fieldOf = (c: number, f: string) => {
    const r = find(c);
    if (!fields[r]!.has(f)) fields[r]!.set(f, fresh());
    return find(fields[r]!.get(f)!);
  };
  for (const f of facts) {
    if (f.kind === 'new') union(target(cellOf(f.v)), objectClass.get(f.o)!);
    else if (f.kind === 'assign') union(target(cellOf(f.v)), target(cellOf(f.w)));
    else if (f.kind === 'store') union(fieldOf(target(cellOf(f.v)), f.f), target(cellOf(f.w)));
    else union(target(cellOf(f.v)), fieldOf(target(cellOf(f.w)), f.f));
  }
  const objectsIn = (c: number) => new Set(sites.filter((o) => find(objectClass.get(o)!) === find(c)));
  const pts = new Map<string, Set<string>>();
  for (const [v, c] of cell) pts.set(v, pointee[find(c)] === undefined ? new Set() : objectsIn(pointee[find(c)]!));
  const heap = new Map<string, Map<string, Set<string>>>();
  for (const o of sites) {
    const m = new Map<string, Set<string>>();
    for (const [f, c] of fields[find(objectClass.get(o)!)]!) m.set(f, objectsIn(c));
    heap.set(o, m);
  }
  const reps = [...new Set(sites.map((o) => find(objectClass.get(o)!)))];
  const classes = new Map(sites.map((o) => [o, reps.indexOf(find(objectClass.get(o)!))]));
  return { pts, heap, classes };
}

/** The facts as a Datalog program, with Andersen's rules. */
export function toDatalog(facts: Fact[]): string {
  const q = (s: string) => (/^[a-z][A-Za-z0-9_]*$/.test(s) ? s : `"${s}"`);
  const lines = facts.map((f) =>
    f.kind === 'new' ? `new(${q(f.v)}, ${q(f.o)}).` : f.kind === 'assign' ? `assign(${q(f.v)}, ${q(f.w)}).` : f.kind === 'store' ? `store(${q(f.v)}, ${q(f.f)}, ${q(f.w)}).` : `load(${q(f.v)}, ${q(f.w)}, ${q(f.f)}).`,
  );
  return lines.join('\n');
}

export const ANDERSEN_RULES = `% v = new …       → v points to the object
pts(V, O) :- new(V, O).
% v = w           → v points to whatever w points to
pts(V, O) :- assign(V, W), pts(W, O).
% v.f = w         → the field f of v's objects points to w's objects
heap(O, F, P) :- store(V, F, W), pts(V, O), pts(W, P).
% v = w.f         → v points to what the field f of w's objects points to
pts(V, P) :- load(V, W, F), pts(W, O), heap(O, F, P).
% two variables alias if they may point to the same object
alias(X, Y) :- pts(X, O), pts(Y, O), X != Y.`;

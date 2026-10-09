/**
 * Call graphs for one JavaScript module (chapter 25), built three ways:
 *
 * - `names`: a call `f()` targets every function bound to the name `f`, and `o.m()` every function stored under a
 *   property or method named `m`. This is what class hierarchy analysis amounts to without static types.
 * - `rta`: rapid type analysis. Like `names`, but a method only counts if an instance of its class (or of a
 *   subclass) is created with `new` in code already found reachable; reachability and instantiation grow together.
 * - `flow`: a flow-insensitive analysis of where function values go, after Feldthaus et al.'s field-based call
 *   graphs for JavaScript: functions flow into variables, parameters, return values and properties (one abstract
 *   location per property name), and each call site targets the functions that reach its callee. Callbacks passed
 *   to a few well-known library functions (`forEach`, `then`, `setTimeout`…) are treated as called there.
 *
 * Variables are resolved with a small scope analysis (function scopes, block scopes for `let`, `const` and
 * classes). Destructuring, computed properties, `call`/`apply`/`bind`, getters and `eval` are not modelled.
 */
import * as espree from 'espree';
import type estree from 'estree';

export type Algorithm = 'names' | 'rta' | 'flow';

export interface Fn {
  id: number;
  /** A readable name: `area`, `Circle.area`, `<anonymous, line 12>`, `<module>`. */
  name: string;
  kind: 'module' | 'function' | 'method' | 'class';
  range: [number, number];
  line: number;
  className?: string;
}

export interface Site {
  id: number;
  caller: number;
  /** The callee's source text, with `()` or `new`. */
  text: string;
  range: [number, number];
  line: number;
  isNew: boolean;
}

export interface Edge {
  site: number;
  target: number;
  /** For callbacks invoked by a library function: its name. */
  via?: string;
}

export interface CallGraph {
  algorithm: Algorithm;
  fns: Fn[];
  sites: Site[];
  edges: Edge[];
  /** Functions reachable from the module's top-level code and its exports. */
  reachable: Set<number>;
  roots: number[];
}

export class CallGraphError extends Error {}

/** Library functions that call the functions passed to them. */
const CALLBACK_METHODS = new Set(['forEach', 'map', 'filter', 'reduce', 'reduceRight', 'some', 'every', 'find', 'findIndex', 'flatMap', 'sort', 'then', 'catch', 'finally', 'addEventListener', 'on', 'once']);
const CALLBACK_FUNCTIONS = new Set(['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame']);

type Node = estree.Node & { range: [number, number]; loc?: estree.SourceLocation };
type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;

interface ClassInfo {
  name: string;
  superName?: string;
  ctor: number;
  methods: Map<string, number>;
}

/** A source of function values: an abstract location, or a function itself. */
type Source = { loc: string } | { fn: number };

interface Collected {
  fns: Fn[];
  sites: (Site & { callee: estree.Node; args: estree.Node[] })[];
  /** Name → functions bound to it (declarations, `const f = function…`, `f = …`, classes). */
  byName: Map<string, number[]>;
  /** Property name → functions stored under it (methods, object literal members, `o.p = function…`). */
  byProp: Map<string, number[]>;
  classes: Map<string, ClassInfo>;
  /** Class of each method. */
  methodClass: Map<number, string>;
  /** Classes instantiated with `new`, per function. */
  news: Map<number, Set<string>>;
  exported: number[];
  /** Flow constraints: from → to. */
  flows: [Source, string][];
  /** Each site's callee and argument sources, and the parameters and return location of each function. */
  calleeOf: Map<number, Source[]>;
  argsOf: Map<number, Source[][]>;
  params: Map<number, string[]>;
}

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => m.set(k, [...(m.get(k) ?? []), v]);

function collect(source: string): Collected {
  let program: estree.Program;
  try {
    program = espree.parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true, loc: true }) as unknown as estree.Program;
  } catch (e) {
    throw new CallGraphError(e instanceof Error ? e.message : String(e));
  }
  const c: Collected = {
    fns: [],
    sites: [],
    byName: new Map(),
    byProp: new Map(),
    classes: new Map(),
    methodClass: new Map(),
    news: new Map(),
    exported: [],
    flows: [],
    calleeOf: new Map(),
    argsOf: new Map(),
    params: new Map(),
  };
  const lineOf = (n: estree.Node) => (n as Node).loc?.start.line ?? 1;
  const text = (n: estree.Node) => source.slice((n as Node).range[0], (n as Node).range[1]);
  const addFn = (fn: Omit<Fn, 'id'>) => c.fns.push({ ...fn, id: c.fns.length }) - 1;
  const moduleFn = addFn({ name: '<module>', kind: 'module', range: [0, source.length], line: 1 });

  // Scopes: a chain of maps from names to location keys.
  let scopeCount = 0;
  type Scope = { id: number; names: Map<string, string>; parent?: Scope; fn: boolean };
  const newScope = (parent: Scope | undefined, fn: boolean): Scope => ({ id: scopeCount++, names: new Map(), parent, fn });
  const declare = (scope: Scope, name: string) => {
    const key = `${name}@${scope.id}`;
    scope.names.set(name, key);
    return key;
  };
  const resolve = (scope: Scope | undefined, name: string): string => {
    for (let s = scope; s; s = s.parent) if (s.names.has(name)) return s.names.get(name)!;
    return `${name}@global`;
  };

  /** Hoists the `var` and function declarations of a function body (or the program) into its scope. */
  function hoist(body: estree.Node, scope: Scope) {
    const visit = (n: unknown) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(visit);
      const node = n as estree.Node;
      if (!('type' in node)) return;
      if (node.type === 'FunctionDeclaration') return void (node.id && declare(scope, node.id.name));
      if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression' || node.type === 'ClassExpression' || node.type === 'ClassDeclaration') return;
      if (node.type === 'VariableDeclaration' && node.kind === 'var') for (const d of node.declarations) if (d.id.type === 'Identifier') declare(scope, d.id.name);
      for (const [k, v] of Object.entries(node)) if (k !== 'range' && k !== 'loc') visit(v);
    };
    visit(body.type === 'Program' || body.type === 'BlockStatement' ? body.body : body);
  }
  /** Declares the `let`, `const` and class declarations directly in a block. */
  function hoistBlock(block: estree.BlockStatement | estree.Program, scope: Scope) {
    for (const s0 of block.body) {
      const s = (s0.type === 'ExportNamedDeclaration' || s0.type === 'ExportDefaultDeclaration' ? s0.declaration : s0) as estree.Node | null;
      if (s?.type === 'VariableDeclaration' && s.kind !== 'var') for (const d of s.declarations) if (d.id.type === 'Identifier') declare(scope, d.id.name);
      if (s?.type === 'ClassDeclaration' && s.id) declare(scope, s.id.name);
    }
  }

  /** Where the value of an expression comes from, for function values. */
  function sources(e: estree.Node | null | undefined, scope: Scope, fn: number): Source[] {
    if (!e) return [];
    switch (e.type) {
      case 'Identifier':
        return [{ loc: resolve(scope, e.name) }];
      case 'MemberExpression':
        walk(e.object, scope, fn);
        if (!e.computed && e.property.type === 'Identifier') return [{ loc: `.${e.property.name}` }];
        walk(e.property, scope, fn);
        return [];
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return [{ fn: functionValue(e, scope, undefined) }];
      case 'ClassExpression':
        return [{ fn: classValue(e, scope) }];
      case 'ConditionalExpression':
        walk(e.test, scope, fn);
        return [...sources(e.consequent, scope, fn), ...sources(e.alternate, scope, fn)];
      case 'LogicalExpression':
        return [...sources(e.left, scope, fn), ...sources(e.right, scope, fn)];
      case 'SequenceExpression':
        e.expressions.slice(0, -1).forEach((x) => walk(x, scope, fn));
        return sources(e.expressions.at(-1), scope, fn);
      case 'AssignmentExpression': {
        const from = sources(e.right, scope, fn);
        assign(e.left, from, scope, fn);
        return from;
      }
      case 'AwaitExpression':
        return sources(e.argument, scope, fn);
      case 'CallExpression':
      case 'NewExpression':
        return [{ loc: `site#${call(e, scope, fn)}` }];
      default:
        walk(e, scope, fn, true);
        return [];
    }
  }

  function targetLoc(target: estree.Node, scope: Scope, fn: number): string | undefined {
    if (target.type === 'Identifier') return resolve(scope, target.name);
    if (target.type === 'MemberExpression') {
      walk(target.object, scope, fn);
      if (!target.computed && target.property.type === 'Identifier') return `.${target.property.name}`;
    }
    return undefined;
  }

  function assign(target: estree.Node, from: Source[], scope: Scope, fn: number) {
    const to = targetLoc(target, scope, fn);
    if (!to) return;
    for (const s of from) {
      c.flows.push([s, to]);
      if ('fn' in s) {
        if (target.type === 'Identifier') push(c.byName, target.name, s.fn);
        if (target.type === 'MemberExpression' && !target.computed && target.property.type === 'Identifier') push(c.byProp, target.property.name, s.fn);
      }
    }
  }

  function call(e: estree.CallExpression | estree.NewExpression, scope: Scope, fn: number): number {
    const id = c.sites.length;
    const callee = e.callee as estree.Node;
    const label = callee.type === 'Super' ? 'super' : text(callee);
    c.sites.push({ id, caller: fn, text: e.type === 'NewExpression' ? `new ${label}()` : `${label}()`, range: (e as Node).range, line: lineOf(e), isNew: e.type === 'NewExpression', callee, args: e.arguments as estree.Node[] });
    if (e.type === 'NewExpression' && callee.type === 'Identifier') c.news.set(fn, (c.news.get(fn) ?? new Set()).add(callee.name));
    c.calleeOf.set(id, callee.type === 'Super' ? [] : sources(callee, scope, fn));
    c.argsOf.set(id, e.arguments.map((a) => (a.type === 'SpreadElement' ? (walk(a.argument, scope, fn), []) : sources(a, scope, fn))));
    return id;
  }

  function functionValue(f: FunctionNode, scope: Scope, name: string | undefined, kind: Fn['kind'] = 'function', className?: string): number {
    const id = addFn({ name: name ?? (f.type !== 'ArrowFunctionExpression' && f.id ? f.id.name : `<anonymous, line ${lineOf(f)}>`), kind, range: (f as Node).range, line: lineOf(f), className });
    const inner = newScope(scope, true);
    if (f.type === 'FunctionExpression' && f.id) declare(inner, f.id.name);
    c.params.set(id, f.params.map((p) => (p.type === 'Identifier' ? declare(inner, p.name) : p.type === 'AssignmentPattern' && p.left.type === 'Identifier' ? declare(inner, p.left.name) : '')));
    if (f.type === 'FunctionExpression' && f.id) c.flows.push([{ fn: id }, resolve(inner, f.id.name)]);
    if (f.body.type === 'BlockStatement') {
      hoist(f.body, inner);
      hoistBlock(f.body, inner);
      for (const s of f.body.body) statement(s, inner, id);
    } else {
      for (const s of sources(f.body, inner, id)) c.flows.push([s, `ret#${id}`]);
    }
    return id;
  }

  function classValue(cls: estree.ClassDeclaration | estree.ClassExpression, scope: Scope): number {
    const name = cls.id?.name ?? `<class, line ${lineOf(cls)}>`;
    const ctorDef = cls.body.body.find((m): m is estree.MethodDefinition => m.type === 'MethodDefinition' && m.kind === 'constructor');
    const info: ClassInfo = { name, superName: cls.superClass?.type === 'Identifier' ? cls.superClass.name : undefined, ctor: -1, methods: new Map() };
    c.classes.set(name, info);
    info.ctor = ctorDef
      ? functionValue(ctorDef.value, scope, `${name}.constructor`, 'method', name)
      : addFn({ name: `${name} (class)`, kind: 'class', range: (cls as Node).range, line: lineOf(cls), className: name });
    c.methodClass.set(info.ctor, name);
    for (const m of cls.body.body) {
      if (m.type === 'MethodDefinition' && m.kind === 'method' && !m.computed && m.key.type === 'Identifier') {
        const id = functionValue(m.value, scope, `${name}.${m.key.name}`, 'method', name);
        info.methods.set(m.key.name, id);
        c.methodClass.set(id, name);
        push(c.byProp, m.key.name, id);
        c.flows.push([{ fn: id }, `.${m.key.name}`]);
      } else if (m.type === 'PropertyDefinition' && m.value) {
        const vs = sources(m.value, scope, info.ctor);
        if (!m.computed && m.key.type === 'Identifier') for (const s of vs) c.flows.push([s, `.${m.key.name}`]);
      } else if (m.type === 'MethodDefinition' && m.kind !== 'constructor') {
        functionValue(m.value, scope, undefined, 'method', name);
      }
    }
    if (cls.superClass && cls.superClass.type !== 'Identifier') walk(cls.superClass, scope, info.ctor);
    return info.ctor;
  }

  function statement(s: estree.Node, scope: Scope, fn: number) {
    switch (s.type) {
      case 'FunctionDeclaration': {
        const id = functionValue(s, scope, s.id?.name);
        if (s.id) {
          push(c.byName, s.id.name, id);
          c.flows.push([{ fn: id }, resolve(scope, s.id.name)]);
        }
        return id;
      }
      case 'ClassDeclaration': {
        const id = classValue(s, scope);
        if (s.id) {
          push(c.byName, s.id.name, id);
          c.flows.push([{ fn: id }, resolve(scope, s.id.name)]);
        }
        return id;
      }
      case 'VariableDeclaration':
        for (const d of s.declarations) {
          if (!d.init) continue;
          if (d.id.type === 'Identifier') {
            const isFn = d.init.type === 'FunctionExpression' || d.init.type === 'ArrowFunctionExpression';
            const vs = isFn ? [{ fn: functionValue(d.init as FunctionNode, scope, d.id.name) }] : sources(d.init, scope, fn);
            for (const v of vs) {
              c.flows.push([v, resolve(scope, d.id.name)]);
              if ('fn' in v) push(c.byName, d.id.name, v.fn);
            }
          } else walk(d.init, scope, fn);
        }
        return;
      case 'ReturnStatement':
        for (const v of sources(s.argument, scope, fn)) c.flows.push([v, `ret#${fn}`]);
        return;
      case 'ExportNamedDeclaration':
      case 'ExportDefaultDeclaration': {
        const d = s.declaration as estree.Node | null;
        if (!d) return;
        const before = c.fns.length;
        const id = d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration' ? statement(d, scope, fn) : d.type === 'VariableDeclaration' ? statement(d, scope, fn) : walk(d, scope, fn);
        if (typeof id === 'number') c.exported.push(id);
        else if (d.type === 'VariableDeclaration') for (let i = before; i < c.fns.length; i++) if (c.fns[i]!.kind === 'function' && d.declarations.some((x) => x.init && (x.init as Node).range[0] === c.fns[i]!.range[0])) c.exported.push(i);
        return;
      }
      case 'BlockStatement': {
        const inner = newScope(scope, false);
        hoistBlock(s, inner);
        for (const x of s.body) statement(x, inner, fn);
        return;
      }
      case 'ExpressionStatement':
        sources(s.expression, scope, fn);
        return;
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement': {
        const inner = newScope(scope, false);
        const init = s.type === 'ForStatement' ? s.init : s.left;
        if (init?.type === 'VariableDeclaration' && init.kind !== 'var') for (const d of init.declarations) if (d.id.type === 'Identifier') declare(inner, d.id.name);
        walk(s, inner, fn, true);
        return;
      }
      default:
        walk(s, scope, fn, true);
    }
  }

  /** Visits sub-nodes of a node that is not otherwise handled, so that nested calls and functions are found. */
  function walk(n: estree.Node | null | undefined, scope: Scope, fn: number, children = false): undefined {
    if (!n || typeof n !== 'object') return;
    if (!children && (n.type.endsWith('Statement') || n.type.endsWith('Declaration'))) return void statement(n, scope, fn);
    if (!children && (n.type.endsWith('Expression') || n.type === 'Identifier')) return void sources(n, scope, fn);
    if (n.type === 'ObjectExpression') {
      for (const p of n.properties) {
        if (p.type === 'Property' && !p.computed && (p.key.type === 'Identifier' || p.key.type === 'Literal')) {
          const key = p.key.type === 'Identifier' ? p.key.name : String(p.key.value);
          const isFn = p.value.type === 'FunctionExpression' || p.value.type === 'ArrowFunctionExpression';
          const vs = isFn ? [{ fn: functionValue(p.value as FunctionNode, scope, key) }] : sources(p.value, scope, fn);
          for (const v of vs) {
            c.flows.push([v, `.${key}`]);
            if ('fn' in v) push(c.byProp, key, v.fn);
          }
        } else walk(p as estree.Node, scope, fn, true);
      }
      return;
    }
    if (n.type === 'CatchClause') {
      const inner = newScope(scope, false);
      if (n.param?.type === 'Identifier') declare(inner, n.param.name);
      statement(n.body, inner, fn);
      return;
    }
    for (const [k, v] of Object.entries(n)) {
      if (k === 'range' || k === 'loc') continue;
      if (Array.isArray(v)) v.forEach((x) => x && typeof x === 'object' && 'type' in x && walk(x as estree.Node, scope, fn));
      else if (v && typeof v === 'object' && 'type' in v) walk(v as estree.Node, scope, fn);
    }
  }

  const top = newScope(undefined, true);
  hoist(program, top);
  hoistBlock(program, top);
  for (const s of program.body) statement(s as estree.Node, top, moduleFn);
  return c;
}

/** Classes that are `name` or extend it, directly or not. */
function subclassesOf(classes: Map<string, ClassInfo>, name: string): string[] {
  const out = [name];
  for (let i = 0; i < out.length; i++) for (const k of classes.values()) if (k.superName === out[i] && !out.includes(k.name)) out.push(k.name);
  return out;
}

export function buildCallGraph(source: string, algorithm: Algorithm): CallGraph {
  const c = collect(source);
  const roots = [0, ...c.exported];
  const edges: Edge[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (e: Edge) => {
    const key = `${e.site}>${e.target}`;
    if (!edgeKeys.has(key)) edgeKeys.add(key), edges.push(e);
  };
  const ctorOf = (name: string) => c.classes.get(name)?.ctor;
  const isMethod = (f: number) => c.fns[f]!.kind === 'method' || c.fns[f]!.kind === 'class';

  const libraryName = (site: Collected['sites'][number]) => {
    const callee = site.callee;
    if (callee.type === 'Identifier' && CALLBACK_FUNCTIONS.has(callee.name)) return callee.name;
    if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && CALLBACK_METHODS.has(callee.property.name)) return callee.property.name;
    return undefined;
  };
  /** Functions written directly as arguments of a library function that calls them: the syntactic rule. */
  const directCallbacks = (site: Collected['sites'][number]) =>
    libraryName(site) ? (c.argsOf.get(site.id) ?? []).flat().flatMap((a) => ('fn' in a && !isMethod(a.fn) ? [a.fn] : [])) : [];

  /** Name-based targets of a site; `live` restricts methods to live classes (RTA). */
  const nameTargets = (site: Collected['sites'][number], live?: Set<string>): number[] => {
    const callee = site.callee;
    if (callee.type === 'Identifier') {
      if (site.isNew) {
        const k = ctorOf(callee.name);
        return k === undefined ? [] : [k];
      }
      return (c.byName.get(callee.name) ?? []).filter((f) => c.fns[f]!.kind !== 'class' && !c.fns[f]!.name.endsWith('.constructor'));
    }
    if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
      return (c.byProp.get(callee.property.name) ?? []).filter((f) => !live || !c.methodClass.has(f) || live.has(c.methodClass.get(f)!));
    }
    return [];
  };

  if (algorithm === 'names') {
    for (const s of c.sites) {
      for (const t of nameTargets(s)) addEdge({ site: s.id, target: t });
      if (!nameTargets(s).length) for (const t of directCallbacks(s)) addEdge({ site: s.id, target: t, via: libraryName(s) });
    }
  } else if (algorithm === 'rta') {
    // Reachable functions and live classes grow together until neither changes.
    const reachable = new Set(roots);
    const live = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of reachable) for (const k of c.news.get(f) ?? []) if (c.classes.has(k) && !live.has(k)) live.add(k), (changed = true);
      // A class whose subclass is instantiated is live too: its methods may be inherited.
      for (const k of c.classes.values()) if (!live.has(k.name) && subclassesOf(c.classes, k.name).some((s) => live.has(s))) live.add(k.name), (changed = true);
      for (const s of c.sites) {
        if (!reachable.has(s.caller)) continue;
        const targets = nameTargets(s, live);
        for (const t of targets) {
          addEdge({ site: s.id, target: t });
          if (!reachable.has(t)) reachable.add(t), (changed = true);
        }
        if (!nameTargets(s).length)
          for (const t of directCallbacks(s)) {
            addEdge({ site: s.id, target: t, via: libraryName(s) });
            if (!reachable.has(t)) reachable.add(t), (changed = true);
          }
      }
    }
  } else {
    // Flow: propagate function values along the constraints, adding argument and return flows as calls resolve.
    const pts = new Map<string, Set<number>>();
    const succ = new Map<string, Set<string>>();
    const work: string[] = [];
    const addTo = (loc: string, fns: Iterable<number>) => {
      const set = pts.get(loc) ?? new Set<number>();
      let grew = false;
      for (const f of fns) if (!set.has(f)) set.add(f), (grew = true);
      pts.set(loc, set);
      if (grew) work.push(loc);
    };
    const link = (from: string, to: string) => {
      const s = succ.get(from) ?? new Set<string>();
      if (s.has(to)) return;
      s.add(to);
      succ.set(from, s);
      if (pts.get(from)?.size) addTo(to, pts.get(from)!);
    };
    const flow = (s: Source, to: string) => ('fn' in s ? addTo(to, [s.fn]) : link(s.loc, to));
    for (const [s, to] of c.flows) flow(s, to);
    const resolved = new Map<number, Set<number>>();
    let changed = true;
    while (changed) {
      changed = false;
      while (work.length) {
        const loc = work.pop()!;
        for (const to of succ.get(loc) ?? []) addTo(to, pts.get(loc) ?? []);
      }
      for (const s of c.sites) {
        const done = resolved.get(s.id) ?? new Set<number>();
        resolved.set(s.id, done);
        const targets = new Set<number>();
        for (const src of c.calleeOf.get(s.id) ?? []) for (const f of 'fn' in src ? [src.fn] : (pts.get(src.loc) ?? [])) targets.add(f);
        for (const f of targets) {
          // `new C()` runs the constructor; calling a class without `new` is an error, not a call edge.
          if (c.fns[f]!.kind === 'class' && !s.isNew) continue;
          if (done.has(f)) continue;
          done.add(f);
          changed = true;
          addEdge({ site: s.id, target: f });
          const params = c.params.get(f) ?? [];
          (c.argsOf.get(s.id) ?? []).forEach((arg, i) => params[i] && arg.forEach((a) => flow(a, params[i]!)));
          link(`ret#${f}`, `site#${s.id}`);
        }
        // Callbacks given to library functions are called by them.
        const name = libraryName(s);
        if (name && targets.size === 0) {
          for (const arg of c.argsOf.get(s.id) ?? [])
            for (const a of arg)
              for (const f of 'fn' in a ? [a.fn] : (pts.get(a.loc) ?? []))
                if (!done.has(f) && !isMethod(f)) {
                  done.add(f);
                  changed = true;
                  addEdge({ site: s.id, target: f, via: name });
                }
        }
      }
    }
  }

  // Reachability from the roots, over the edges found.
  const reachable = new Set<number>(roots);
  const queue = [...roots];
  while (queue.length) {
    const f = queue.shift()!;
    for (const e of edges) if (c.sites[e.site]!.caller === f && !reachable.has(e.target)) reachable.add(e.target), queue.push(e.target);
  }
  return {
    algorithm,
    fns: c.fns,
    sites: c.sites.map(({ callee: _c, args: _a, ...s }) => s),
    edges,
    reachable,
    roots,
  };
}

/** Targets of each site, by name, for tests and figures. */
export function targetsBySite(g: CallGraph): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const s of g.sites) {
    const key = `${s.text}@${s.line}`;
    const names = g.edges.filter((e) => e.site === s.id).map((e) => g.fns[e.target]!.name + (e.via ? ` (via ${e.via})` : ''));
    out.set(key, [...(out.get(key) ?? []), ...names].sort());
  }
  return out;
}

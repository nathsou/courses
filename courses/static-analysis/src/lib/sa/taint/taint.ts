/**
 * Taint analysis for Express applications (chapter 29), on the IFDS engine of chapter 26.
 *
 * Route handlers (functions passed to `app.get(…)`, `router.post(…)` and the like) are the entry points; their first
 * parameter is the request, whose `query`, `params`, `body`, `headers` and `cookies` are sources. A configuration
 * says what else is a source, which arguments of which calls are sinks, which calls sanitize, and which conditions
 * validate a variable on one of their branches. One configuration per kind of vulnerability, as in most taint
 * analysers, because a sanitizer for one sink (HTML encoding) is no sanitizer for another (a SQL query).
 *
 * This module is also the `workbench:taint` module that rules import in the workbench.
 */
import * as espree from 'espree';
import type estree from 'estree';
import type { SourceCode } from 'eslint';
import type { CfgNode } from '../flow/cfg.js';
import { buildSupergraph, solveTaint, witness, ZERO, RET, type Supergraph, type TaintModel } from '../interproc/ifds.js';

export interface TaintContext {
  /** Is this identifier the request parameter of a route handler? */
  isRequest(id: estree.Node): boolean;
  /** Is this identifier the response parameter of a route handler? */
  isResponse(id: estree.Node): boolean;
}

export interface TaintConfig {
  /** Does this expression produce untrusted data by itself? */
  isSource(node: estree.Node, ctx: TaintContext): boolean;
  /** For a call: the indices of the arguments that must not be tainted (none if the call is not a sink). */
  sinkArguments(call: estree.CallExpression, ctx: TaintContext): number[];
  /** Does this call return a value that is safe for the sink, whatever its arguments? */
  isSanitizer?(call: estree.CallExpression, ctx: TaintContext): boolean;
  /** The variables a condition proves safe on the branch where it evaluates to `outcome`. */
  validates?(test: estree.Node, outcome: boolean, ctx: TaintContext): string[];
}

export interface FlowStep {
  /** The function, by name: a declared function's name, or `GET /search` for an inline handler. */
  fn: string;
  text: string;
  line: number;
  range?: [number, number];
  /** The variable holding tainted data before this statement (`<ret>` for a return value). */
  fact: string;
  kind: 'start' | 'normal' | 'call' | 'return' | 'call-to-return';
}

export interface Flow {
  /** The sink call and the tainted argument. */
  call: [number, number];
  argument: [number, number];
  fn: string;
  /** From the statement where the tainted value appears to the sink. */
  steps: FlowStep[];
}

export interface Program {
  graph: Supergraph;
  entries: string[];
  ctx: TaintContext;
}

const ROUTE_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'all', 'use', 'options', 'head']);
type FunctionNode = estree.FunctionExpression | estree.ArrowFunctionExpression | estree.FunctionDeclaration;
const isFunction = (n: estree.Node): n is FunctionNode => n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration';

export function loadProgram(source: string): Program {
  const program = espree.parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true, loc: true }) as unknown as estree.Program;
  const handlers: { name: string; node: FunctionNode }[] = [];
  const named = new Set<string>();
  const requestNames = new Set<string>();
  const responseNames = new Set<string>();
  const declared = new Map<string, FunctionNode>();
  for (const s0 of program.body) {
    const s = (s0.type === 'ExportNamedDeclaration' || s0.type === 'ExportDefaultDeclaration' ? s0.declaration : s0) as estree.Node | null;
    if (s?.type === 'FunctionDeclaration' && s.id) declared.set(s.id.name, s);
    if (s?.type === 'VariableDeclaration') for (const d of s.declarations) if (d.id.type === 'Identifier' && d.init && isFunction(d.init)) declared.set(d.id.name, d.init);
  }
  const noteParams = (f: FunctionNode) => {
    if (f.params[0]?.type === 'Identifier') requestNames.add(f.params[0].name);
    if (f.params[1]?.type === 'Identifier') responseNames.add(f.params[1].name);
  };
  for (const s of program.body) {
    if (s.type !== 'ExpressionStatement' || s.expression.type !== 'CallExpression') continue;
    const call = s.expression;
    if (call.callee.type !== 'MemberExpression' || call.callee.computed || call.callee.property.type !== 'Identifier' || !ROUTE_METHODS.has(call.callee.property.name)) continue;
    const method = call.callee.property.name.toUpperCase();
    const path = call.arguments[0]?.type === 'Literal' ? String(call.arguments[0].value) : undefined;
    for (const a of call.arguments) {
      if (isFunction(a as estree.Node)) {
        const f = a as FunctionNode;
        const line = (f as estree.Node & { loc: estree.SourceLocation }).loc.start.line;
        handlers.push({ name: path ? `${method} ${path}` : `<handler, line ${line}>`, node: f });
        noteParams(f);
      } else if (a.type === 'Identifier' && declared.has(a.name)) {
        named.add(a.name);
        noteParams(declared.get(a.name)!);
      }
    }
  }
  const graph = buildSupergraph(source, { functions: handlers });
  // Entry points: route handlers; without any, every function (a library's functions can all be called).
  const entries = handlers.length || named.size ? [...handlers.map((h) => h.name), ...named] : [...graph.fns.keys()];
  const ctx: TaintContext = {
    isRequest: (id) => id.type === 'Identifier' && requestNames.has(id.name),
    isResponse: (id) => id.type === 'Identifier' && responseNames.has(id.name),
  };
  return { graph, entries, ctx };
}

export function modelOf(config: TaintConfig, ctx: TaintContext): TaintModel {
  return {
    source: (e) => (config.isSource(e, ctx) ? 'source' : undefined),
    sink: (call) => {
      const args = config.sinkArguments(call, ctx);
      return args.length ? { args, label: 'sink' } : undefined;
    },
    sanitizer: (call) => config.isSanitizer?.(call, ctx) ?? false,
    validates: config.validates ? (test, outcome) => config.validates!(test, outcome, ctx) : undefined,
  };
}

const lineAt = (source: string, offset: number) => source.slice(0, offset).split('\n').length;

/** Finds the flows from sources to sinks in a module. Returns nothing if the module does not parse as JavaScript. */
export function analyseSource(source: string, config: TaintConfig): Flow[] {
  let program: Program;
  try {
    program = loadProgram(source);
  } catch {
    return [];
  }
  const model = modelOf(config, program.ctx);
  const result = solveTaint(program.graph, { model, entries: program.entries });
  const flows: Flow[] = [];
  for (const leak of result.leaks) {
    if (!leak.call || !leak.argument) continue;
    const path = witness(result, leak, { model, entries: program.entries }) ?? [];
    const steps = path.map((st) => {
      const node: CfgNode = program.graph.fns.get(st.fn)!.nodes[st.node]!;
      return { fn: st.fn, text: node.text, line: node.range ? lineAt(source, node.range[0]) : 0, range: node.range, fact: st.fact === ZERO ? 'Λ' : st.fact, kind: st.kind };
    });
    flows.push({ call: leak.call, argument: leak.argument, fn: leak.fn, steps });
  }
  return flows.sort((a, b) => a.call[0] - b.call[0] || a.argument[0] - b.argument[0]);
}

/** The `workbench:taint` entry point for rules: flows in the file being linted, with ESLint's own nodes. */
export function findTaintFlows(sourceCode: SourceCode, config: TaintConfig): { call: estree.CallExpression; argument: estree.Node; steps: FlowStep[] }[] {
  const byRange = new Map<string, estree.Node>();
  const visit = (n: unknown) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(visit);
    const node = n as estree.Node & { range?: [number, number] };
    if (typeof node.type !== 'string') return;
    if (node.range) byRange.set(`${node.type}:${node.range[0]}:${node.range[1]}`, node);
    for (const [k, v] of Object.entries(node)) if (k !== 'parent' && k !== 'loc' && k !== 'range' && k !== 'tokens' && k !== 'comments') visit(v);
  };
  visit(sourceCode.ast);
  const find = (r: [number, number]) => [...byRange.entries()].find(([k]) => k.endsWith(`:${r[0]}:${r[1]}`))?.[1];
  return analyseSource(sourceCode.text, config).flatMap((f) => {
    const call = byRange.get(`CallExpression:${f.call[0]}:${f.call[1]}`) as estree.CallExpression | undefined;
    const argument = find(f.argument);
    return call && argument ? [{ call, argument, steps: f.steps }] : [];
  });
}

export { RET };

// ---------------------------------------------------------------------------------------------------------------
// The course's configurations, one per kind of vulnerability.

const REQUEST_FIELDS = new Set(['query', 'params', 'body', 'headers', 'cookies', 'url', 'originalUrl', 'path', 'hostname']);
const propName = (n: estree.Node) => (n.type === 'MemberExpression' && !n.computed && n.property.type === 'Identifier' ? n.property.name : undefined);
const calleeName = (call: estree.CallExpression) => (call.callee.type === 'Identifier' ? call.callee.name : propName(call.callee));
const calleeObject = (call: estree.CallExpression) => (call.callee.type === 'MemberExpression' && call.callee.object.type === 'Identifier' ? call.callee.object.name : undefined);

/** `req.query`, `req.body`… and `req.get('Header')`. */
export const isRequestSource = (n: estree.Node, ctx: TaintContext) =>
  (n.type === 'MemberExpression' && ctx.isRequest(n.object) && REQUEST_FIELDS.has(propName(n) ?? '')) ||
  (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && ctx.isRequest(n.callee.object) && ['get', 'header', 'param'].includes(propName(n.callee) ?? ''));

/** Converting to a number makes data safe for every sink of this chapter. */
const toNumber = (call: estree.CallExpression) => call.callee.type === 'Identifier' && ['Number', 'parseInt', 'parseFloat'].includes(call.callee.name);

/** Allowlist checks: `ALLOWED.has(x)`, `list.includes(x)`, `/^…$/.test(x)`, `Number.isInteger(x)`, `validator.isUUID(x)`. */
export function allowlistValidates(test: estree.Node, outcome: boolean): string[] {
  if (test.type === 'UnaryExpression' && test.operator === '!') return allowlistValidates(test.argument, !outcome);
  if (test.type === 'LogicalExpression') {
    if ((test.operator === '&&' && outcome) || (test.operator === '||' && !outcome)) return [...allowlistValidates(test.left, outcome), ...allowlistValidates(test.right, outcome)];
    return [];
  }
  if (!outcome || test.type !== 'CallExpression') return [];
  const name = calleeName(test);
  const arg = test.arguments[0] as estree.Node | undefined;
  if (!name || !arg) return [];
  if (['has', 'includes', 'test', 'isInteger', 'isSafeInteger'].includes(name) || /^is[A-Z]/.test(name)) {
    if (arg.type === 'Identifier') return [arg.name];
    // Checking a part of an object (`ALLOWED.has(url.hostname)`) vouches for the object.
    if (arg.type === 'MemberExpression' && arg.object.type === 'Identifier') return [arg.object.name];
  }
  return [];
}

const SQL_METHODS = new Set(['query', 'execute', 'raw', 'whereRaw', 'orderByRaw']);
const FS_METHODS = new Set(['readFile', 'readFileSync', 'createReadStream', 'writeFile', 'writeFileSync', 'unlink', 'unlinkSync', 'readdir']);

export const RULES: Record<string, { title: string; sink: string; config: TaintConfig }> = {
  sql: {
    title: 'SQL injection',
    sink: 'a SQL query',
    config: {
      isSource: isRequestSource,
      sinkArguments: (call) => (SQL_METHODS.has(calleeName(call) ?? '') && call.callee.type === 'MemberExpression' ? [0] : []),
      isSanitizer: (call) => toNumber(call) || ['escape', 'escapeLiteral', 'escapeId'].includes(calleeName(call) ?? ''),
      validates: allowlistValidates,
    },
  },
  xss: {
    title: 'Cross-site scripting',
    sink: 'an HTML response',
    config: {
      isSource: isRequestSource,
      sinkArguments: (call, ctx) => (call.callee.type === 'MemberExpression' && ctx.isResponse(call.callee.object) && ['send', 'write', 'end'].includes(propName(call.callee) ?? '') ? [0] : []),
      isSanitizer: (call) => toNumber(call) || ['escapeHtml', 'escape', 'encode', 'sanitize', 'encodeURIComponent'].includes(calleeName(call) ?? ''),
      validates: allowlistValidates,
    },
  },
  command: {
    title: 'Command injection',
    sink: 'a shell command',
    config: {
      isSource: isRequestSource,
      sinkArguments: (call) => {
        const name = calleeName(call);
        const object = calleeObject(call);
        const fromChildProcess = call.callee.type === 'Identifier' || /^(cp|childProcess|child_process)$/.test(object ?? '');
        return fromChildProcess && (name === 'exec' || name === 'execSync') ? [0] : [];
      },
      isSanitizer: toNumber,
      validates: allowlistValidates,
    },
  },
  path: {
    title: 'Path traversal',
    sink: 'a file path',
    config: {
      isSource: isRequestSource,
      sinkArguments: (call, ctx) =>
        (FS_METHODS.has(calleeName(call) ?? '') && calleeObject(call) === 'fs') || (call.callee.type === 'MemberExpression' && ctx.isResponse(call.callee.object) && ['sendFile', 'download'].includes(propName(call.callee) ?? '')) ? [0] : [],
      isSanitizer: (call) => toNumber(call) || (calleeName(call) === 'basename' && calleeObject(call) === 'path'),
      // `file.startsWith(ROOT + path.sep)` vouches for `file`.
      validates: (test, outcome) => {
        const found = allowlistValidates(test, outcome);
        const t = test.type === 'UnaryExpression' && test.operator === '!' ? test.argument : test;
        const positive = test === t ? outcome : !outcome;
        if (positive && t.type === 'CallExpression' && calleeName(t) === 'startsWith' && t.callee.type === 'MemberExpression' && t.callee.object.type === 'Identifier') found.push(t.callee.object.name);
        return found;
      },
    },
  },
  ssrf: {
    title: 'Server-side request forgery',
    sink: 'a server-side request',
    config: {
      isSource: isRequestSource,
      sinkArguments: (call) => {
        const name = calleeName(call);
        const object = calleeObject(call);
        if (call.callee.type === 'Identifier' && name === 'fetch') return [0];
        if (object && /^(axios|got|http|https|needle|superagent)$/.test(object) && ['get', 'post', 'put', 'delete', 'request', 'head'].includes(name ?? '')) return [0];
        return [];
      },
      validates: allowlistValidates,
    },
  },
};

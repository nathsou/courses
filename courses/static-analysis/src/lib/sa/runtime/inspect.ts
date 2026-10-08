/**
 * What the inspector shows about a piece of code: its ESTree, its scopes, its types and ESLint's code paths.
 * Computed by running a recording rule with the real Linter, so the reader sees exactly what a rule sees.
 */
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { lint } from './lint.js';
import { isRequiredParserServices } from '../kit/parser-services.js';

export interface AstNode {
  type: string;
  range: [number, number];
  /** A short description: an identifier's name, a literal's raw text, an operator. */
  label?: string;
  children: { key: string; nodes: AstNode[]; list: boolean }[];
}

export interface ScopeInfo {
  type: string;
  range: [number, number];
  variables: { name: string; defs: string[]; references: { range: [number, number]; read: boolean; write: boolean }[] }[];
  /** Names referenced in this scope but declared outside it. */
  through: string[];
  depth: number;
}

export interface SegmentInfo {
  id: string;
  reachable: boolean;
  next: string[];
  prev: string[];
  /** Ranges of the maximal nodes evaluated in the segment, in order. */
  nodes: { type: string; range: [number, number] }[];
}

export interface CodePathInfo {
  id: string;
  /** "program" or the function's name. */
  name: string;
  range: [number, number];
  initial: string;
  final: string[];
  returned: string[];
  thrown: string[];
  segments: SegmentInfo[];
  /** Back edges (loops): [from, to]. */
  loops: [string, string][];
}

export interface InspectResult {
  ast?: AstNode;
  scopes: ScopeInfo[];
  /** Range → type, for identifiers and expressions (when type information is on). */
  types: { range: [number, number]; type: string; nodeType: string }[];
  codePaths: CodePathInfo[];
  parseError?: string;
}

const SKIP_KEYS = new Set(['parent', 'loc', 'range', 'type', 'tokens', 'comments']);

function label(node: estree.Node): string | undefined {
  const n = node as unknown as Record<string, unknown>;
  if (node.type === 'Identifier' || (node.type as string) === 'PrivateIdentifier' || (node.type as string) === 'JSXIdentifier') return String(n.name);
  if (node.type === 'Literal') return String(n.raw);
  if (typeof n.operator === 'string') return n.operator;
  if (node.type === 'VariableDeclaration') return String(n.kind);
  if (node.type === 'TemplateElement') return JSON.stringify((n.value as { raw: string }).raw);
  return undefined;
}

function serialise(node: estree.Node, keys: Record<string, readonly string[]>): AstNode {
  const n = node as unknown as Record<string, unknown>;
  const children: AstNode['children'] = [];
  for (const key of keys[node.type] ?? Object.keys(n).filter((k) => !SKIP_KEYS.has(k))) {
    const v = n[key];
    if (Array.isArray(v)) {
      const nodes = v.filter((x): x is estree.Node => !!x && typeof x === 'object' && 'type' in x).map((x) => serialise(x, keys));
      children.push({ key, nodes, list: true });
    } else if (v && typeof v === 'object' && 'type' in (v as object)) {
      children.push({ key, nodes: [serialise(v as estree.Node, keys)], list: false });
    }
  }
  return { type: node.type, range: (node as unknown as { range: [number, number] }).range, label: label(node), children };
}

export function inspect(code: string, libs: Map<string, string>, opts: { file?: string; types?: boolean } = {}): InspectResult {
  const out: InspectResult = { scopes: [], types: [], codePaths: [] };
  const file = opts.file ?? '/inspect/input.ts';
  const recorder: Rule.RuleModule = {
    create(context) {
      const sourceCode = context.sourceCode;
      const services = sourceCode.parserServices;
      const stack: { info: CodePathInfo; current: Rule.CodePathSegment[]; byId: Map<string, SegmentInfo>; objects: Map<string, Rule.CodePathSegment> }[] = [];
      const record = (node: estree.Node) => {
        const top = stack[stack.length - 1];
        const seg = top?.current[top.current.length - 1];
        if (top && seg) top.byId.get(seg.id)?.nodes.push({ type: node.type, range: (node as unknown as { range: [number, number] }).range });
      };
      return {
        Program(node: estree.Program) {
          out.ast = serialise(node, sourceCode.visitorKeys);
          const walk = (scope: Scope.Scope, depth: number) => {
            out.scopes.push({
              type: scope.type,
              depth,
              range: (scope.block as unknown as { range: [number, number] }).range,
              variables: scope.variables
                .filter((v) => v.defs.length > 0)
                .map((v) => ({
                  name: v.name,
                  defs: v.defs.map((d) => d.type),
                  references: v.references.map((r) => ({ range: (r.identifier as unknown as { range: [number, number] }).range, read: r.isRead(), write: r.isWrite() })),
                })),
              through: [...new Set(scope.through.map((r) => r.identifier.name))],
            });
            for (const child of scope.childScopes) walk(child, depth + 1);
          };
          walk(sourceCode.scopeManager.globalScope!, 0);
        },
        '*'(node: estree.Node) {
          record(node);
          if (!isRequiredParserServices(services) || out.types.length > 600) return;
          const t = node.type as string;
          if (t === 'Identifier' || t.endsWith('Expression') || t === 'Literal' || t === 'TemplateLiteral') {
            try {
              const checker = services.program.getTypeChecker();
              const tsNode = services.esTreeNodeToTSNodeMap.get(node);
              if (tsNode && tsNode.kind !== ts.SyntaxKind.SourceFile) out.types.push({ range: (node as unknown as { range: [number, number] }).range, nodeType: t, type: checker.typeToString(checker.getTypeAtLocation(tsNode)) });
            } catch {
              /* some nodes have no type */
            }
          }
        },
        onCodePathStart(codePath: Rule.CodePath, node: estree.Node) {
          const fn = node as estree.Node & { id?: estree.Identifier | null };
          const name = node.type === 'Program' ? 'program' : fn.id?.name ?? `(${node.type.replace('Expression', '').replace('Declaration', '')})`;
          const range = (node as unknown as { range: [number, number] }).range;
          stack.push({ info: { id: codePath.id, name, range, initial: '', final: [], returned: [], thrown: [], segments: [], loops: [] }, current: [], byId: new Map(), objects: new Map() });
        },
        onCodePathEnd(codePath: Rule.CodePath) {
          const top = stack.pop()!;
          const info = top.info;
          info.initial = codePath.initialSegment.id;
          info.final = codePath.finalSegments.map((s) => s.id);
          info.returned = codePath.returnedSegments.map((s) => s.id);
          info.thrown = codePath.thrownSegments.map((s) => s.id);
          // Successors are linked as the analysis proceeds: read them once the path is complete.
          info.segments = [...top.byId.values()].map((s) => {
            const o = top.objects.get(s.id)!;
            return { ...s, next: o.allNextSegments.map((x) => x.id), prev: o.allPrevSegments.map((x) => x.id), nodes: maximal(s, top.byId) };
          });
          out.codePaths.push(info);
        },
        onCodePathSegmentStart(segment: Rule.CodePathSegment) {
          enter(segment, true);
        },
        onUnreachableCodePathSegmentStart(segment: Rule.CodePathSegment) {
          enter(segment, false);
        },
        onCodePathSegmentEnd() {
          stack[stack.length - 1]?.current.pop();
        },
        onUnreachableCodePathSegmentEnd() {
          stack[stack.length - 1]?.current.pop();
        },
        onCodePathSegmentLoop(from: Rule.CodePathSegment, to: Rule.CodePathSegment) {
          stack[stack.length - 1]?.info.loops.push([from.id, to.id]);
        },
      } as Rule.RuleListener;
      function enter(segment: Rule.CodePathSegment, reachable: boolean) {
        const top = stack[stack.length - 1];
        if (!top) return;
        top.current.push(segment);
        if (!top.byId.has(segment.id)) {
          top.byId.set(segment.id, { id: segment.id, reachable, next: [], prev: [], nodes: [] });
          top.objects.set(segment.id, segment);
        }
      }
    },
  };
  const r = lint({ files: { [file]: code }, rules: { INSPECT: recorder }, libs, types: opts.types !== false });
  if (r.parseErrors.length) out.parseError = `${r.parseErrors[0]!.line}:${r.parseErrors[0]!.column + 1} ${r.parseErrors[0]!.message}`;
  if (r.ruleErrors.length) out.parseError = r.ruleErrors[0]!.message;
  // Code paths end inner-first; show them in source order.
  out.codePaths.sort((a, b) => a.range[0] - b.range[0]);
  return out;
}

/** The maximal nodes of a segment: drop nodes containing a node of another segment, then nodes inside kept ones. */
function maximal(seg: SegmentInfo, all: Map<string, SegmentInfo>): SegmentInfo['nodes'] {
  const others: [number, number][] = [];
  for (const s of all.values()) if (s.id !== seg.id) for (const n of s.nodes) others.push(n.range);
  const contains = (a: [number, number], b: [number, number]) => a[0] <= b[0] && b[1] <= a[1] && (a[0] !== b[0] || a[1] !== b[1]);
  const own = seg.nodes.filter((n) => !others.some((o) => contains(n.range, o)));
  return own.filter((n) => !own.some((m) => m !== n && contains(m.range, n.range)));
}

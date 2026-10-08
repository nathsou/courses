/**
 * Walking up and down the tree. Counterpart of SonarJS's `rules/helpers/ancestor.ts`.
 *
 * ESLint gives every node a `parent` while it traverses; these helpers make that explicit.
 */
import type { SourceCode } from 'eslint';
import type estree from 'estree';

type Node = estree.Node;
type WithParent = Node & { parent?: Node };

/** The parent of `node` (undefined for the Program). */
export function getParent(node: Node): Node | undefined {
  return (node as WithParent).parent;
}

/** `node`'s ancestors, nearest first. */
export function ancestorsOf(node: Node): Node[] {
  const out: Node[] = [];
  for (let p = getParent(node); p; p = getParent(p)) out.push(p);
  return out;
}

/** The nearest ancestor satisfying `predicate`, or undefined. */
export function findFirstMatchingAncestor(node: Node, predicate: (n: Node) => boolean): Node | undefined {
  for (let p = getParent(node); p; p = getParent(p)) if (predicate(p)) return p;
  return undefined;
}

/** The direct children of `node`, using the parser's visitor keys (so TypeScript nodes are covered too). */
export function childrenOf(node: Node, visitorKeys: SourceCode.VisitorKeys): Node[] {
  const out: Node[] = [];
  for (const key of visitorKeys[node.type] ?? []) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) for (const c of child) { if (c && typeof c === 'object' && 'type' in c) out.push(c as Node); }
    else if (child && typeof child === 'object' && 'type' in child) out.push(child as Node);
  }
  return out;
}

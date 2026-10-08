/**
 * Walking up and down the tree. Counterpart of SonarJS's `rules/helpers/ancestor.ts`.
 *
 * ESLint gives every node a `parent` while it traverses; these helpers make that explicit.
 */
import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';

type Node = estree.Node;
type WithParent = Node & { parent?: Node };

/** The parent of `node` during the traversal (undefined for the Program), from the rule context. */
export function getParent(context: Rule.RuleContext, node: Node): Node | undefined {
  const ancestors = context.sourceCode.getAncestors(node);
  return ancestors.length > 0 ? ancestors[ancestors.length - 1] : undefined;
}

/** The `parent` property ESLint sets on every node (use `getParent` when a context is at hand). */
export function getNodeParent(node: Node): Node | undefined {
  return (node as WithParent).parent;
}

/** `node`'s ancestors, nearest first. */
export function ancestorsChain(node: Node): Node[] {
  const out: Node[] = [];
  for (let p = getNodeParent(node); p; p = getNodeParent(p)) out.push(p);
  return out;
}

/** The nearest ancestor satisfying `predicate`, or undefined. */
export function findFirstMatchingAncestor(node: Node, predicate: (n: Node) => boolean): Node | undefined {
  return ancestorsChain(node).find(predicate);
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

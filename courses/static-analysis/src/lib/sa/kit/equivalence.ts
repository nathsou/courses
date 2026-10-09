/**
 * Syntactic equivalence. Counterpart of SonarJS's `rules/helpers/equivalence.ts`.
 *
 * Two subtrees are equivalent when they have the same node type and the same tokens: `a.b + 1` and
 * `a . b+1` are equivalent (whitespace and comments do not count), `a.b + 1` and `a['b'] + 1` are not.
 * This is the "rebuild" exercise of chapter 3.
 */
import type { SourceCode } from 'eslint';
import type estree from 'estree';

export function areEquivalent(first: estree.Node | estree.Node[], second: estree.Node | estree.Node[], sourceCode: SourceCode): boolean {
  if (Array.isArray(first) && Array.isArray(second)) {
    return first.length === second.length && first.every((f, i) => areEquivalent(f, second[i]!, sourceCode));
  }
  if (Array.isArray(first) || Array.isArray(second)) return false;
  if (first.type !== second.type) return false;
  const a = sourceCode.getTokens(first);
  const b = sourceCode.getTokens(second);
  return a.length === b.length && a.every((t, i) => t.type === b[i]!.type && t.value === b[i]!.value);
}

/** Which nodes an ESLint selector matches in some code, found by running a one-listener rule with the real Linter. */
import type { Rule } from 'eslint';
import type estree from 'estree';
import { lint } from './lint.js';

export interface SelectResult {
  matches: { type: string; range: [number, number]; order: number }[];
  error?: string;
}

export function selectNodes(code: string, selector: string, libs: Map<string, string>): SelectResult {
  let order = 0;
  const matches: SelectResult['matches'] = [];
  const rule: Rule.RuleModule = {
    create: () => ({
      [selector](node: estree.Node) {
        matches.push({ type: node.type, range: (node as unknown as { range: [number, number] }).range, order: order++ });
      },
    }),
  };
  const r = lint({ files: { '/select/input.ts': code }, rules: { SELECT: rule }, libs, types: false });
  const error = r.ruleErrors[0]?.message ?? r.parseErrors[0]?.message;
  return { matches, error: error?.replace(/\nOccurred while linting[\s\S]*$/, '') };
}

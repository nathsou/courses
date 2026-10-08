import { describe, expect, test } from 'vitest';
import { loadLibs } from './libs.js';
import { runRule } from './run.js';
import { parseExpectations } from './comment-based.js';

const RULE = `
import type { Rule } from 'eslint';
import type estree from 'estree';
import { areEquivalent } from '../helpers/equivalence.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { generateMeta } from '../helpers/generate-meta.js';

const message = 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';

export const rule: Rule.RuleModule = {
  meta: generateMeta({ sonarKey: 'S1764', hasSecondaries: true }, { messages: { identical: message } }),
  create(context) {
    function check(expr: estree.BinaryExpression | estree.LogicalExpression) {
      if (['==', '===', '!=', '!==', '&&', '||', '-', '/', '<', '>', '<=', '>='].includes(expr.operator)
          && areEquivalent(expr.left as estree.Node, expr.right, context.sourceCode)) {
        report(context, { message, messageId: 'identical', data: { operator: expr.operator }, node: expr.right }, [toSecondaryLocation(expr.left as estree.Node)]);
      }
    }
    return { BinaryExpression: check, LogicalExpression: check };
  },
};
`;

const FIXTURE = `const a = 1, b = 2;
if (a == a) {} // Noncompliant {{Correct one of the identical sub-expressions on both sides of operator "=="}}
//  ^>   ^
if (a.b && a . b) {} // Noncompliant
if (a == b) {}
const x = 'http://example.com'; // not a comment
`;

describe('comment-based runner', () => {
  test('parses expectations', () => {
    const e = parseExpectations(FIXTURE);
    expect(e.errors).toEqual([]);
    expect(e.issues).toHaveLength(2);
    expect(e.issues[0]!.primary).toEqual({ line: 2, column: 9, endLine: 2, endColumn: 10 });
    expect(e.issues[0]!.secondaries).toEqual([{ line: 2, column: 4, endLine: 2, endColumn: 5, message: undefined }]);
  });

  test('a correct rule passes, with types', async () => {
    const libs = await loadLibs();
    const r = runRule({ ruleFiles: { '/rules/S1764/rule.ts': RULE }, entry: '/rules/S1764/rule.ts', ruleKey: 'S1764', fixtures: { 'cb.fixture.ts': FIXTURE }, libs });
    expect(r.loadError).toBeUndefined();
    expect(r.fixtures[0]!.check.entries.map((e) => [e.verdict, e.line, e.details])).toEqual([['matched', 2, []], ['matched', 4, []]]);
    expect(r.pass).toBe(true);
  });

  test('a rule that reports too much fails with an unexpected issue', async () => {
    const libs = await loadLibs();
    const broken = RULE.replace('&& areEquivalent(expr.left as estree.Node, expr.right, context.sourceCode)', '');
    const r = runRule({ ruleFiles: { '/rules/S1764/rule.ts': broken }, entry: '/rules/S1764/rule.ts', ruleKey: 'S1764', fixtures: { 'cb.fixture.ts': FIXTURE }, libs });
    expect(r.pass).toBe(false);
    expect(r.fixtures[0]!.check.entries.some((e) => e.verdict === 'unexpected' && e.line === 5)).toBe(true);
  });

  test('a syntax error is a load error', async () => {
    const libs = await loadLibs();
    const r = runRule({ ruleFiles: { '/rules/S1764/rule.ts': 'export const rule = {' }, entry: '/rules/S1764/rule.ts', ruleKey: 'S1764', fixtures: { 'cb.fixture.ts': FIXTURE }, libs });
    expect(r.loadError).toMatch(/rule\.ts:1/);
  });
});

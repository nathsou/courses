/**
 * The course's reference rules (loaded as reader code is, through the workbench loader: their imports of
 * `../helpers/*.js` resolve to the kit).
 */
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadLibs } from '../runtime/libs.js';
import { lint } from '../runtime/lint.js';
import { loadRule } from '../runtime/run.js';

const src = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('cognitive complexity totals and increments', async () => {
  const libs = await loadLibs();
  const rule = loadRule({ '/rules/S3776/rule.ts': src('cognitive-complexity.ts') }, '/rules/S3776/rule.ts');
  const code = `
function a(x: number) { if (x) { for (;;) { if (x) break; } } else if (x > 1) {} else {} }
function b(p: boolean, q: boolean, r: boolean) { return p && q || r && p ? 1 : 2; }
function c(xs: number[]) { try { xs.forEach((x) => { if (x) {} }); } catch (e) { outer: while (true) { continue outer; } } }
function d(k: string) { switch (k) { case 'a': return k ? 1 : 2; default: return 0; } }
`;
  const issues = lint({ files: { '/t.ts': code }, rules: { S3776: rule }, options: { S3776: [-1] }, libs, types: false }).issues;
  const totals = issues.map((i) => Number(/from (\d+)/.exec(i.message)![1]));
  // a: if 1 + for 2 + if 3 + else-if 1 + else 1 = 8; b: && 1 + && 1 + ? 1 = 3;
  // c: catch 1 + while 2 + continue-label 1 = 4, arrow: if 1; d: switch 1 + ? 2 = 3
  expect(totals).toEqual([8, 3, 4, 1, 3]);
  const ia = issues.find((i) => i.message.includes('from 8'))!;
  expect(ia.secondaryLocations.map((s) => s.message)).toEqual(['+1', '+2 (incl. 1 for nesting)', '+3 (incl. 2 for nesting)', '+1', '+1']);
});

/**
 * Every workbench exercise in the content is checked the way a reader's work would be:
 * - `rule`: the reference passes its visible and hidden fixtures, and the starter does not pass all of them;
 * - `helper`: the reference passes its visible and hidden tests, and the starter does not;
 * - `fixtures`: the fixtures given as the reference pass with the correct rule and catch every mutant, and the
 *   starter fixtures do not catch them all;
 * - `workbench` (playgrounds): the starter loads and every fixture is valid comment-based syntax.
 */
import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { loadLibs } from '../../src/lib/sa/runtime/libs';
import { runRule } from '../../src/lib/sa/runtime/run';
import { runTests } from '../../src/lib/sa/runtime/tests';
import { parseExpectations } from '../../src/lib/sa/runtime/comment-based';
import { absoluteFiles, entryPath, keyOf, testPath, type WorkbenchSpec } from '../../src/lib/sa/exercise';

const root = path.resolve(import.meta.dirname, '../../content');
const docs = ['chapters', 'appendices', 'parts'].flatMap((dir) => {
  const d = path.join(root, dir);
  return existsSync(d) ? readdirSync(d).map((c) => path.join(d, c, 'index.md')).filter((f) => existsSync(f)) : [];
});

export function workbenchBlocks(md: string): { kind: string; spec: WorkbenchSpec }[] {
  return [...md.matchAll(/^```(rule|helper|fixtures|workbench)\n([\s\S]*?)^```$/gm)].map((m) => ({ kind: m[1]!, spec: { ...(YAML.parse(m[2]!) as WorkbenchSpec), kind: m[1]! } }));
}

function ruleRun(spec: WorkbenchSpec, files: Record<string, string>, fixtures: Record<string, string>, libs: Map<string, string>) {
  return runRule({ ruleFiles: absoluteFiles(spec, files), entry: entryPath(spec), ruleKey: keyOf(spec), fixtures, options: spec.options, types: spec.types, libs });
}

function describeFailures(r: ReturnType<typeof runRule>): string[] {
  if (r.loadError) return [`load error: ${r.loadError}`];
  return [
    ...r.ruleErrors.map((e) => `rule error: ${e.message}`),
    ...r.fixtures.flatMap((f) => [...f.check.errors.map((e) => `${f.name}: ${e}`), ...f.check.entries.filter((e) => e.verdict !== 'matched').map((e) => `${f.name}:${e.line} ${e.verdict} ${e.actual?.message ?? e.expected?.message ?? ''} ${e.details.join('; ')}`)]),
  ];
}

describe('workbench exercises', () => {
  let count = 0;
  for (const doc of docs) {
    const md = readFileSync(doc, 'utf8');
    for (const { kind, spec } of workbenchBlocks(md)) {
      count++;
      const name = `${path.relative(root, doc)}: ${spec.id}`;
      test(name, async () => {
        const libs = await loadLibs();
        expect(spec.id, 'every exercise needs an id').toBeTruthy();
        if (kind === 'rule') {
          expect(spec.answer, 'a rule exercise needs an answer').toBeTruthy();
          const fixtures = { ...spec.fixtures, ...spec.hidden };
          const good = ruleRun(spec, { ...spec.files, ...spec.answer }, fixtures, libs);
          expect(describeFailures(good)).toEqual([]);
          const bad = ruleRun(spec, spec.files, fixtures, libs);
          expect(bad.pass, 'the starter must not already pass').toBe(false);
        } else if (kind === 'helper') {
          const tests = { ...spec.tests, ...spec.hiddenTests };
          const run = (files: Record<string, string>) =>
            Object.keys(tests).map((t) => runTests({ ...absoluteFiles(spec, files), ...Object.fromEntries(Object.entries(tests).map(([n, s]) => [testPath(n), s])) }, testPath(t), libs));
          const good = run({ ...spec.files, ...spec.answer });
          expect(good.flatMap((r) => [r.loadError ?? '', ...r.tests.filter((t) => !t.pass).map((t) => `${t.name}: ${t.message}`)]).filter(Boolean)).toEqual([]);
          expect(good.every((r) => r.tests.length > 0)).toBe(true);
          const bad = run(spec.files);
          expect(bad.every((r) => r.pass), 'the starter must not already pass').toBe(false);
        } else if (kind === 'fixtures') {
          const reference = spec.answer ?? spec.files;
          const goodFixtures = (spec as WorkbenchSpec & { answerFixtures?: Record<string, string> }).answerFixtures;
          expect(goodFixtures, 'a fixtures exercise needs answerFixtures').toBeTruthy();
          const ok = ruleRun(spec, reference, goodFixtures!, libs);
          expect(describeFailures(ok)).toEqual([]);
          for (const [m, code] of Object.entries(spec.mutants ?? {})) {
            const r = ruleRun(spec, { ...reference, [spec.entry ?? 'rule.ts']: code }, goodFixtures!, libs);
            expect(r.loadError, `mutant ${m} must load`).toBeUndefined();
            expect(r.pass, `the reference fixtures must catch mutant ${m}`).toBe(false);
          }
          const starterCatchesAll = Object.values(spec.mutants ?? {}).every((code) => !ruleRun(spec, { ...reference, [spec.entry ?? 'rule.ts']: code }, spec.fixtures ?? {}, libs).pass);
          expect(starterCatchesAll, 'the starter fixtures must not already catch every mutant').toBe(false);
        } else {
          for (const [n, src] of Object.entries(spec.fixtures ?? {})) expect(parseExpectations(src).errors, n).toEqual([]);
          const r = ruleRun(spec, spec.files, spec.fixtures ?? {}, libs);
          expect(r.loadError).toBeUndefined();
          expect(r.ruleErrors).toEqual([]);
        }
      }, 120_000);
    }
  }
  test('found exercises', () => expect(count).toBeGreaterThan(0));
});

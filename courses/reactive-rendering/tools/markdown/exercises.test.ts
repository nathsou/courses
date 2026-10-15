/**
 * Every TypeScript exercise in the chapters is checked the way a reader's answer would be: the reference solution
 * must pass every test (and the storage rule, where it applies), and the starter must not already pass.
 */
import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { runInWorker } from '../../src/lib/exercise/run';

const root = path.resolve(import.meta.dirname, '../../content/chapters');
const chapters = existsSync(root) ? readdirSync(root).filter((c) => existsSync(path.join(root, c, 'index.md'))) : [];

interface Ex {
  id?: string;
  title?: string;
  starter: string;
  solution: string;
  tests: string;
}

describe('Build exercises: the solution passes, the starter does not', () => {
  let n = 0;
  for (const ch of chapters) {
    const md = readFileSync(path.join(root, ch, 'index.md'), 'utf8');
    for (const m of md.matchAll(/^```build\n([\s\S]*?)^```$/gm)) {
      const ex = YAML.parse(m[1]!) as Ex;
      if (!ex || typeof ex !== 'object' || !('tests' in ex)) continue;
      n++;
      test(`${ch}: ${ex.title ?? ex.id ?? n}`, async () => {
        const good = await runInWorker({ id: 'x', code: ex.solution, tests: ex.tests });
        expect(good.error ?? 'ok').toBe('ok');
        expect(good.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.error}`)).toEqual([]);
        expect(good.results.length).toBeGreaterThan(0);
        const bad = await runInWorker({ id: 'x', code: ex.starter, tests: ex.tests });
        expect(bad.ok && bad.results.every((r) => r.passed)).toBe(false);
      }, 60000);
    }
  }
  if (!n) test.skip('no exercises yet', () => {});
});

describe('Find-the-bug exercises: the answer and every note point at real lines, and the bug is real', () => {
  let n = 0;
  for (const ch of chapters) {
    const md = readFileSync(path.join(root, ch, 'index.md'), 'utf8');
    for (const m of md.matchAll(/^```debug\n([\s\S]*?)^```$/gm)) {
      const ex = YAML.parse(m[1]!) as {
        id: string;
        code: string;
        answer: { line?: number; lines?: number[]; kind?: string };
        kinds?: { id: string }[];
        notes?: Record<string, string>;
        /** Optional evidence: tests that the code as shown fails, and replacement lines (by number) after which it passes. */
        tests?: string;
        fix?: Record<string, string>;
      };
      n++;
      test(`${ch}: ${ex.id}`, async () => {
        const count = ex.code.replace(/\n$/, '').split('\n').length;
        const right = ex.answer.lines ?? [ex.answer.line!];
        for (const l of right) expect(l >= 1 && l <= count).toBe(true);
        for (const k of Object.keys(ex.notes ?? {})) {
          expect(Number(k) >= 1 && Number(k) <= count).toBe(true);
          expect(right).not.toContain(Number(k));
        }
        if (ex.answer.kind) expect(ex.kinds?.map((k) => k.id)).toContain(ex.answer.kind);
        if (ex.tests) {
          expect(ex.fix, 'a debug exercise with tests needs a fix').toBeTruthy();
          const bad = await runInWorker({ id: 'x', code: ex.code, tests: ex.tests });
          expect(bad.ok && bad.results.every((r) => r.passed), 'the buggy code must fail the tests').toBe(false);
          const lines = ex.code.replace(/\n$/, '').split('\n');
          for (const [ln, text] of Object.entries(ex.fix!)) lines[Number(ln) - 1] = text;
          const fixed = await runInWorker({ id: 'x', code: lines.join('\n'), tests: ex.tests });
          expect(fixed.error ?? 'ok').toBe('ok');
          expect(fixed.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.error}`)).toEqual([]);
          expect(fixed.results.length).toBeGreaterThan(0);
        }
      }, 60000);
    }
  }
  if (!n) test.skip('no find-the-bug exercises yet', () => {});
});

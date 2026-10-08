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
  storage?: boolean;
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
        const good = await runInWorker({ id: 'x', code: ex.solution, tests: ex.tests, storage: ex.storage });
        expect(good.storage ?? []).toEqual([]);
        expect(good.error ?? 'ok').toBe('ok');
        expect(good.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.error}`)).toEqual([]);
        expect(good.results.length).toBeGreaterThan(0);
        const bad = await runInWorker({ id: 'x', code: ex.starter, tests: ex.tests, storage: ex.storage });
        expect(bad.ok && bad.results.every((r) => r.passed)).toBe(false);
      }, 60000);
    }
  }
  if (!n) test.skip('no exercises yet', () => {});
});

describe('Mote exercises: the solution passes every check, the starter does not', async () => {
  const { checkMote } = await import('../../src/lib/mm/mote/task');
  let n = 0;
  for (const ch of chapters) {
    const md = readFileSync(path.join(root, ch, 'index.md'), 'utf8');
    for (const m of md.matchAll(/^```mote-task\n([\s\S]*?)^```$/gm)) {
      const ex = YAML.parse(m[1]!) as { id?: string; title?: string; setting: never; starter: string; solution: string; expect?: string[]; leaks?: boolean };
      n++;
      test(`${ch}: ${ex.title ?? ex.id ?? n}`, () => {
        const good = checkMote(ex.solution, ex);
        expect(good.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.detail}`)).toEqual([]);
        expect(checkMote(ex.starter, ex).ok).toBe(false);
      });
    }
  }
  if (!n) test.skip('no Mote exercises yet', () => {});
});

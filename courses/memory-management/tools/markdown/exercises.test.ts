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

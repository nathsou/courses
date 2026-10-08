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

describe('Find-the-bug exercises: the answer and every note point at real lines, and Mote answers match the oracle', async () => {
  const { Vm } = await import('../../src/lib/mm/mote/vm');
  const { compile } = await import('../../src/lib/mm/mote/compile');
  const { makeManager } = await import('../../src/lib/mm/managers/managers');
  const ORACLE: Record<string, string> = { uaf: 'uaf', double: 'double-free', overflow: 'overflow', invalid: 'invalid-free' };
  let n = 0;
  for (const ch of chapters) {
    const md = readFileSync(path.join(root, ch, 'index.md'), 'utf8');
    for (const m of md.matchAll(/^```debug\n([\s\S]*?)^```$/gm)) {
      const ex = YAML.parse(m[1]!) as { id: string; code: string; lang?: string; answer: { line?: number; lines?: number[]; kind?: string }; kinds?: { id: string }[]; notes?: Record<string, string> };
      n++;
      test(`${ch}: ${ex.id}`, () => {
        const count = ex.code.replace(/\n$/, '').split('\n').length;
        const right = ex.answer.lines ?? [ex.answer.line!];
        for (const l of right) expect(l >= 1 && l <= count).toBe(true);
        for (const k of Object.keys(ex.notes ?? {})) {
          expect(Number(k) >= 1 && Number(k) <= count).toBe(true);
          expect(right).not.toContain(Number(k));
        }
        if (ex.answer.kind) expect(ex.kinds?.map((k) => k.id)).toContain(ex.answer.kind);
        if ((ex.lang ?? 'mote') === 'mote' && ex.answer.kind && ORACLE[ex.answer.kind]) {
          const vm = new Vm(compile(ex.code), makeManager('manual'), {});
          let guard = 0;
          while (vm.status !== 'done' && vm.status !== 'error' && guard++ < 1e6) vm.step();
          const lines = vm.events.filter((e) => e.kind === ORACLE[ex.answer.kind!]).map((e) => (e as { pos?: { line: number } }).pos?.line);
          expect(lines).toEqual(expect.arrayContaining(right));
        }
      });
    }
  }
  if (!n) test.skip('no find-the-bug exercises yet', () => {});
});

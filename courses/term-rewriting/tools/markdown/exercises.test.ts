/**
 * Every `code` exercise in every chapter: its reference solution passes all its tests, its starter code does not
 * (so no test is vacuous), and the reference still passes when the reader's engine is made of the reference
 * solutions of every earlier engine module (so carried-forward code works). Engine modules match
 * src/lib/code/engine-modules.ts. Every `numeric` exercise has a finite answer. Exercise ids are unique.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import YAML from 'yaml';
import { runTests } from '../../src/lib/code/run';
import { ENGINE_MODULES } from '../../src/lib/code/engine-modules';
import type { EngineModule } from '../../src/lib/code/protocol';

const root = path.resolve(import.meta.dirname, '../../content');

function markdownFiles(): string[] {
  const out: string[] = [];
  for (const kind of ['chapters', 'appendices']) {
    const dir = path.join(root, kind);
    if (!existsSync(dir)) continue;
    for (const d of readdirSync(dir).sort()) {
      const f = path.join(dir, d, 'index.md');
      if (existsSync(f)) out.push(f);
    }
  }
  return out;
}

function blocks(src: string, lang: string): string[] {
  const re = new RegExp('^```' + lang + '\\s*\\n([\\s\\S]*?)^```\\s*$', 'gm');
  return [...src.matchAll(re)].map((m) => m[1]!);
}

type Code = { id: string; starter: string; tests: string; solution: string; provides?: string[]; title?: string };
const ids = new Set<string>();
const engineSoFar: EngineModule[] = [];
const found: { id: string; chapter: string; provides: string[] }[] = [];

for (const file of markdownFiles()) {
  const rel = path.relative(root, file);
  const src = readFileSync(file, 'utf8');
  const codes = blocks(src, 'code').map((b) => YAML.parse(b) as Code);
  const nums = blocks(src, 'numeric').map((b) => YAML.parse(b) as Record<string, unknown>);
  const chapter = path.basename(path.dirname(file)).replace(/^[0-9a-z]{1,2}-/, '');
  if (!codes.length && !nums.length) continue;
  describe(rel, () => {
    for (const ex of codes) {
      const earlier = engineSoFar.slice();
      if (ex.provides?.length) {
        engineSoFar.push({ id: ex.id, code: ex.solution, provides: ex.provides });
        found.push({ id: ex.id, chapter, provides: ex.provides });
      }
      test(`code exercise ${ex.id}: reference passes, starter fails, carried-forward engine works`, async () => {
        expect(ex.id, 'exercise needs an id').toBeTruthy();
        expect(ids.has(ex.id), `duplicate exercise id ${ex.id}`).toBe(false);
        ids.add(ex.id);
        for (const k of ['starter', 'tests', 'solution'] as const) expect(ex[k], `${ex.id} needs ${k}`).toBeTruthy();
        const good = await runTests(ex.id, ex.solution, ex.tests);
        expect(good.error, `reference solution of ${ex.id}`).toBeUndefined();
        expect(good.results.length, 'has tests').toBeGreaterThan(0);
        expect(good.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.error}`), `reference of ${ex.id} must pass`).toEqual([]);
        const bad = await runTests(ex.id, ex.starter, ex.tests);
        const starterPasses = bad.ok && bad.results.length > 0 && bad.results.every((r) => r.passed);
        expect(starterPasses, `the starter code of ${ex.id} already passes every test`).toBe(false);
        if (earlier.length) {
          const carried = await runTests(ex.id, ex.solution, ex.tests, earlier);
          expect(carried.broken ?? [], 'engine modules load').toEqual([]);
          expect(carried.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.error}`), `reference of ${ex.id} on the carried-forward engine`).toEqual([]);
        }
      }, 120_000);
    }
    for (const ex of nums) {
      test(`numeric exercise ${ex.id} has a finite answer`, () => {
        expect(ex.id).toBeTruthy();
        expect(ids.has(String(ex.id))).toBe(false);
        ids.add(String(ex.id));
        expect(Number.isFinite(Number(ex.answer))).toBe(true);
      });
    }
  });
}

test('engine modules are listed in src/lib/code/engine-modules.ts, in course order', () => {
  expect(ENGINE_MODULES.map((m) => ({ id: m.id, chapter: m.chapter, provides: m.provides }))).toEqual(found);
});

test('every name an engine module provides exists in the reference engine', async () => {
  const trs = (await import('../../src/lib/trs/index')) as Record<string, unknown>;
  for (const m of ENGINE_MODULES) for (const name of m.provides) expect(typeof trs[name], `${m.id} provides ${name}`).toBe('function');
});

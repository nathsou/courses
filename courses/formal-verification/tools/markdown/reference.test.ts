/** Every example in the Vouch reference (appendix B) type-checks, and no engine finds it wrong. */
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '../../src/lib/fv/vouch/syntax/parser';
import { check } from '../../src/lib/fv/vouch/check/checker';
import { verifyDocument } from '../../src/lib/fv/verify/document';

const file = path.resolve(import.meta.dirname, '../../content/appendices/b-vouch-reference/index.md');
const blocks = [...readFileSync(file, 'utf8').matchAll(/```vouch\n([\s\S]*?)```/g)].map((m) => m[1]!);

test.each(blocks.map((b, i) => [i + 1, b] as const))('example %i', async (_i, src) => {
  const p = parse(src);
  const c = check(p.program);
  expect([...p.diagnostics, ...c.diagnostics].filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
  const r = await verifyDocument(c, { timeout: 8000 });
  const bad = r.flatMap((d) => d.verdicts.filter((v) => v.status !== 'verified' && !(v.badge.kind === 'counted' || v.badge.kind === 'instance' || v.badge.kind === 'bounded' || v.badge.kind === 'exhaustive')).map((v) => `${d.decl}: ${v.subject}: ${v.status} ${v.message ?? ''}`));
  expect(r.flatMap((d) => d.verdicts).length).toBeGreaterThan(0);
  expect(bad).toEqual([]);
}, 60000);

/** The Rosetta appendix (E): the Vouch versions behave as the text says, and the SMT-LIB versions as Z3 says. */
const rosetta = readFileSync(path.resolve(import.meta.dirname, '../../content/appendices/e-rosetta/index.md'), 'utf8');

test('Rosetta: the Vouch versions', async () => {
  const blocks = [...rosetta.matchAll(/```vouch\n([\s\S]*?)```/g)].map((m) => m[1]!);
  const got: string[] = [];
  for (const src of blocks) {
    const p = parse(src);
    const c = check(p.program);
    expect([...p.diagnostics, ...c.diagnostics].filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    for (const d of await verifyDocument(c, { timeout: 8000 })) for (const v of d.verdicts) got.push(`${d.decl}:${v.status}`);
  }
  expect(got).toEqual(['max:verified', 'find:verified', 'swap:verified', 'DieHard:violated', 'FileSystem:violated']);
}, 60000);

test('Rosetta: the SMT-LIB versions', async () => {
  const { z3Check } = await import('../../src/lib/fv/testing/z3');
  const blocks = [...rosetta.matchAll(/```smt\n([\s\S]*?)```/g)].map((m) => m[1]!.replace(/\(check-sat\)|\(get-model\)/g, ''));
  expect(await Promise.all(blocks.map((b) => z3Check(b)))).toEqual(['unsat', 'sat']);
}, 60000);

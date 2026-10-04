import { describe, expect, test } from 'vitest';
import { CHECKS, SWITCHES, runChecks, sources } from './ledger';

/** The checks that do not verify, for a set of switches. */
async function failing(on: string[], fixed = false): Promise<string[]> {
  const r = await runChecks(sources(on, fixed), { link: true });
  expect(r.map((x) => x.id).sort()).toEqual(CHECKS.map((k) => k.id).sort());
  return r.filter((x) => x.status !== 'verified').map((x) => x.id).sort();
}

describe('the Ledger', () => {
  test('every layer verifies, and only the step handler for local transfers fails', async () => {
    expect(await failing([])).toEqual(['link.local']);
    const r = await runChecks(sources([]), { link: true });
    expect(r.find((x) => x.id === 'link.local')!.message).toMatch(/precondition of transfer/);
    expect(r.find((x) => x.id === 'link.local')!.badge).toMatch(/replayed/);
  });

  test('without the link checks, everything is green', async () => {
    const r = await runChecks(sources([]), { link: false });
    expect(r.every((x) => x.status === 'verified')).toBe(true);
    expect(r.some((x) => x.id.startsWith('link.'))).toBe(false);
  });

  test('the fix closes the gap', async () => {
    expect(await failing([], true)).toEqual([]);
  });

  test.each([
    ['overdraft', ['spec.solvent']],
    ['duplicate', ['protocol.refines']],
    ['lose', ['protocol.refines']],
    ['overflow', ['impl.transfer']],
    ['fee-limit', ['impl.fee']],
    ['leak', ['impl.undo']],
    ['skim', ['link.deliver']],
    ['fee-rate', []],
  ])('switch %s is caught by %j', async (id, caught) => {
    expect(SWITCHES.some((s) => s.id === id)).toBe(true);
    expect(await failing([id], true)).toEqual(caught);
  });
});

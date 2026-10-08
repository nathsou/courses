import { expect, test } from 'vitest';
import { ZOO } from '../mote/zoo';
import { DETECTORS, runUnder } from './detectors';

// The goggles' table (chapter 16): which detector catches which error. The prose depends on it.
const EXPECTED: Record<string, Record<string, boolean>> = {
  uaf: { none: false, guard: true, redzones: true, hardened: false },
  double: { none: false, guard: true, redzones: true, hardened: true },
  overflow: { none: false, guard: true, redzones: true, hardened: false },
  jump: { none: false, guard: true, redzones: false, hardened: false },
  overread: { none: false, guard: true, redzones: true, hardened: false },
  confusion: { none: false, guard: true, redzones: true, hardened: false },
  leak: { none: false, guard: false, redzones: true, hardened: false },
};

test('each detector catches exactly the errors the chapter says it does', () => {
  for (const p of ZOO) {
    for (const mk of DETECTORS) {
      const r = runUnder(p.src, mk, p.error);
      expect(`${p.id}/${r.detector}: ${r.caught}`).toBe(`${p.id}/${r.detector}: ${EXPECTED[p.id]![r.detector]}`);
    }
  }
});

test('without a detector the zoo misbehaves exactly as chapter 15 shows', () => {
  const out = (id: string) => runUnder(ZOO.find((p) => p.id === id)!.src, DETECTORS[0]!, 'x').output;
  expect(out('uaf')).toEqual(['a.balance after free: 100', 'a.balance now: 5000', 'b.balance now: 0']);
  expect(out('double')).toEqual(['same block? true', 'alice.admin: true']);
  expect(out('overflow')).toEqual(['balance: 999999']);
  expect(out('jump')).toEqual(['balance: 100']);
  expect(out('confusion')).toEqual(['ADMIN ACCESS GRANTED']);
  expect(out('overread').slice(5, 8)).toEqual(['31337', '27182', '16180']);
});

test('the redzones change the layout, and the jumping overflow lands in the account', () => {
  const r = runUnder(ZOO.find((p) => p.id === 'jump')!.src, DETECTORS[2]!, 'overflow');
  expect(r.output).toEqual(['balance: 999999']);
});

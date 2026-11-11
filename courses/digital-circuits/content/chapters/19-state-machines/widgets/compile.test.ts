import { expect, test } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { toWeft } from './weft';
import { compileStats } from './compile';
import { PRESETS, TRAFFIC_LIGHT } from './presets';

const synth = nodeSynth();

test('synth builds each encoding: flip-flops match the code width', async () => {
  const ff = (e: 'binary' | 'gray' | 'onehot') => compileStats(synth, toWeft(TRAFFIC_LIGHT, e), TRAFFIC_LIGHT);
  expect(await ff('binary')).toMatchObject({ ok: true, flipFlops: 2 });
  expect(await ff('gray')).toMatchObject({ ok: true, flipFlops: 2 });
  expect(await ff('onehot')).toMatchObject({ ok: true, flipFlops: 4 });
  expect((await ff('binary')).luts).toBeGreaterThan(0);
});
test('every preset compiles in every encoding', async () => {
  for (const p of PRESETS) for (const e of ['binary', 'gray', 'onehot'] as const) expect((await compileStats(synth, toWeft(p.fsm, e), p.fsm)).ok, `${p.id} ${e}`).toBe(true);
});

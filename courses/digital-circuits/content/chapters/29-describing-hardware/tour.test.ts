/**
 * The diagnostics tour: every broken program is rejected by synth and every fixed one compiles without a
 * word, and the messages the figure shows are synth's (`tour-messages.json`; UPDATE_TOUR=1 rewrites it).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyze, format } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { MESSAGES, STOPS, type Message } from './widgets/tour';

const synth = nodeSynth();
const file = new URL('./widgets/tour-messages.json', import.meta.url);

async function diagnose(code: string, id: string, chip: boolean): Promise<Message> {
  const a = await analyze(synth, [{ name: `${id}.weft`, text: code }], { testbench: !chip });
  return { text: a.diagnostics.map((d) => d.rendered).join('\n').trimEnd(), errors: a.diagnostics.filter((d) => d.severity === 'error').length };
}

describe('the diagnostics tour', () => {
  it('rejects every broken program and accepts every fixed one, with the recorded messages', async () => {
    const out: Record<string, { broken: Message; fixed: Message }> = {};
    for (const s of STOPS) {
      const broken = await diagnose(s.broken, s.id, !!s.chip);
      const fixed = await diagnose(s.fixed, s.id, !!s.chip);
      expect(broken.errors, `${s.id} broken`).toBeGreaterThan(0);
      expect(fixed.text, `${s.id} fixed`).toBe('');
      out[s.id] = { broken, fixed };
    }
    if (process.env.UPDATE_TOUR) writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
    else expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(out);
    expect(Object.keys(MESSAGES).length).toBe(STOPS.length);
  });

  it('has twelve stops with unique ids, in synth’s format', async () => {
    expect(STOPS).toHaveLength(12);
    expect(new Set(STOPS.map((s) => s.id)).size).toBe(STOPS.length);
    for (const s of STOPS) expect(await format(synth, s.fixed), s.id).toBe(s.fixed);
  });
});

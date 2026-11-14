/**
 * What synth makes of the generated text: the flip-flops, the AND gates of its optimised gate network and
 * the iCE40 LUTs (synth: crates/synth-playground, `run` stopped after synthesis). Unlike the two-level
 * minimiser of `synth.ts`, synth optimises the whole machine as a multi-level network and maps it to LUTs.
 */
import type { Synth } from '$lib/synth/api';
import { run } from '$lib/synth/api';
import { moduleName } from './weft';
import type { Fsm } from './fsm';

export interface CompileResult {
  ok: boolean;
  problems: string[];
  flipFlops: number;
  /** AND gates after synth's optimisation (inverters are free in an and-inverter graph). */
  ands: number;
  /** iCE40 4-input LUTs after mapping. */
  luts: number;
}

export async function compileStats(synth: Synth, code: string, fsm: Fsm): Promise<CompileResult> {
  const r = await run(synth, { files: [{ name: 'fsm.weft', text: code }], top: moduleName(fsm.title), stop: 'synth', testbench: true });
  if (!r.ok) {
    const errors = r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message);
    return { ok: false, problems: errors.length ? errors : [r.error ?? 'synth failed'], flipFlops: 0, ands: 0, luts: 0 };
  }
  const st = (id: string) => r.stages.find((s) => s.id === id)?.stats ?? {};
  return { ok: true, problems: [], flipFlops: st('gates_optimised').FF ?? 0, ands: st('gates_optimised').AND ?? 0, luts: st('mapped').SB_LUT4 ?? 0 };
}

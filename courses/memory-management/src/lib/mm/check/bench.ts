/**
 * The lab bench (PLAN §7): every trace in the bank, each under a memory limit, scored with the malloc lab's
 * performance index. A trace whose allocator runs out of memory, or breaks a checker rule, scores zero.
 */
import { TRACE_BANK, peakLive, type Op } from '../trace/trace';
import { runTrace, performanceIndex, type CheckReport } from './checker';
import type { AllocatorFactory } from '../heap/api';

/** The heap may grow to four times the trace's peak live data, and never less than 16 KiB. */
export const benchCapacity = (ops: Op[]) => Math.ceil(Math.max(4 * peakLive(ops), 16384) / 4096) * 4096;

export interface BenchRow {
  id: string;
  name: string;
  ok: boolean;
  utilisation: number;
  cycles: number;
  index: number;
  failure?: string;
}

export function benchRow(id: string, name: string, r: CheckReport): BenchRow {
  const failure = r.failure ? (r.failure.kind === 'null' ? `out of memory at operation ${r.failure.at + 1} (the limit is 4× the peak live data)` : `operation ${r.failure.at + 1}: ${r.failure.message}`) : undefined;
  return { id, name, ok: r.ok, utilisation: r.utilisation, cycles: r.cyclesPerOp, index: performanceIndex(r), failure };
}

export function bench(make: AllocatorFactory): BenchRow[] {
  return TRACE_BANK.map((t) => benchRow(t.id, t.name, runTrace(make, t.ops, { cache: true, capacity: benchCapacity(t.ops) })));
}

export const benchScore = (rows: BenchRow[]) => (rows.length ? rows.reduce((s, r) => s + r.index, 0) / rows.length : 0);

/** The test file the lab bench runs in a worker against the reader's code: one log line per trace. */
export const BENCH_TESTS = `import { test } from '@mm/test';
import { runTrace } from '@mm/check';
import { TRACE_BANK } from '@mm/trace';
import { benchCapacity, benchRow } from '@mm/bench';
import { createAllocator } from './solution';
test('the bench', () => {
  for (const t of TRACE_BANK) {
    const r = runTrace(createAllocator, t.ops, { cache: true, capacity: benchCapacity(t.ops) });
    console.log('@@' + JSON.stringify(benchRow(t.id, t.name, r)));
  }
});`;

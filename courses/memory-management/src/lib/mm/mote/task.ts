/**
 * Mote exercises (```mote-task blocks): the reader's program runs under a given memory-management setting and is
 * checked for what the exercise asks: the expected output, no memory errors (the oracle's record), and no leaks.
 */
import { Vm } from './vm';
import { MoteError } from './syntax';
import { makeManager, type Setting } from '../managers/managers';

export interface MoteTask {
  setting: Setting;
  /** Expected output, one entry per printed line. */
  expect?: string[] | string;
  /** Allow objects to remain unfreed at exit (default: not allowed). */
  leaks?: boolean;
}

export interface MoteCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface MoteVerdict {
  ok: boolean;
  checks: MoteCheck[];
  output: string[];
  error?: { message: string; line?: number };
}

export function checkMote(src: string, task: MoteTask): MoteVerdict {
  let vm: Vm;
  try {
    vm = new Vm(src, makeManager(task.setting), { maxSteps: 2_000_000 });
  } catch (e) {
    const err = e instanceof MoteError ? { message: e.message, line: e.pos?.line } : { message: String(e) };
    return { ok: false, checks: [{ name: 'The program compiles', passed: false, detail: err.message }], output: [], error: err };
  }
  try {
    vm.run();
  } catch (e) {
    /* recorded in vm.status */
    void e;
  }
  const checks: MoteCheck[] = [];
  const error = vm.error ? { message: vm.error.message, line: vm.error.pos?.line } : undefined;
  checks.push({ name: 'It runs to the end without a memory error', passed: vm.status === 'done' && !vm.error, detail: error?.message });
  const s = vm.summary();
  if (vm.status === 'done' && (s.uaf || s.doubleFree)) checks[0] = { ...checks[0]!, passed: false, detail: `${s.uaf} use(s) after free, ${s.doubleFree} double free(s)` };
  if (task.expect !== undefined) {
    const want = Array.isArray(task.expect) ? task.expect.map(String) : String(task.expect).split('\n');
    const same = vm.output.length === want.length && vm.output.every((l, i) => l === want[i]);
    checks.push({ name: `It prints ${want.map((w) => `“${w}”`).join(', ')}`, passed: same, detail: same ? undefined : `it printed ${vm.output.length ? vm.output.map((w) => `“${w}”`).join(', ') : 'nothing'}` });
  }
  if (!task.leaks) {
    const live = s.stillLive;
    checks.push({ name: 'Every object is freed by the end', passed: vm.status === 'done' && live === 0, detail: vm.status === 'done' && live ? `${live} object(s) were never freed` : undefined });
  }
  return { ok: checks.every((c) => c.passed), checks, output: vm.output, error };
}

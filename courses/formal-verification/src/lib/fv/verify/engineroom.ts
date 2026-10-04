/**
 * The engine room (PLAN §5): one system or function run under every engine that applies, side by side, so that the
 * badge ladder can be read on a single example. Systems: the explorer, BDD reachability, bounded model checking,
 * k-induction and IC3. Functions: random testing, symbolic execution, the program verifier and interval analysis.
 * Each engine gets its own time budget and reports a verdict; nothing here decides which engine is right.
 */
import type { Checked, FnInfo } from '../vouch/check/checker';
import type { Verdict } from '../engines';
import { SystemRuntime } from '../vouch/interp/system';
import { explore } from '../explore/explorer';
import { Reachability, reachVerdicts } from '../bdd/reach';
import { bmc, bmcVerdicts } from '../bmc/bmc';
import { BmcError } from '../bmc/symbolic';
import { kInduction, kindVerdicts } from '../ic3/kind';
import { ic3, ic3Verdicts } from '../ic3/ic3';
import { testFunction } from './document';
import { verifyFunction } from '../vouch/vc/verify';
import { SymbolicExplorer } from '../symex/symex';
import { analyse } from '../absint/analyse';
import { NonRelational, IntervalValues, type StateDomain } from '../absint/domain';
import { RuntimeFailure } from '../vouch/interp/eval';

export interface RoomResult {
  engine: string;
  /** One verdict per property (systems) or one for the function. */
  verdicts: Verdict[];
  ms: number;
}

export interface RoomOptions {
  /** Time budget per engine, in milliseconds. */
  timeout?: number;
  /** Bound for bounded model checking. */
  bound?: number;
  onResult?: (r: RoomResult) => void;
}

const failed = (engine: string, subject: string, reason: string): Verdict => ({
  engine,
  status: 'unknown',
  subject,
  badge: { kind: 'unknown', reason },
  certificate: { kind: 'none', checked: false, checker: '' },
  assumptions: [],
  stats: {},
  message: reason,
});

function timed(engine: string, f: () => Verdict[], subject: string, emit: (r: RoomResult) => void): void {
  const t0 = Date.now();
  let verdicts: Verdict[];
  try {
    verdicts = f();
  } catch (e) {
    if (!(e instanceof BmcError) && !(e instanceof RuntimeFailure)) throw e;
    verdicts = [failed(engine, subject, e.message)];
  }
  emit({ engine, verdicts, ms: Date.now() - t0 });
}

/** Run every system engine on the invariants of `system`. */
export function systemRoom(checked: Checked, system: string, opts: RoomOptions = {}): RoomResult[] {
  const out: RoomResult[] = [];
  const emit = (r: RoomResult) => {
    out.push(r);
    opts.onResult?.(r);
  };
  const timeout = opts.timeout ?? 8000;
  const rt = () => new SystemRuntime(checked, system);
  timed('explorer', () => explore(rt(), { timeout, symmetry: true }).verdicts.filter((v) => v.subject.startsWith('invariant')), system, emit);
  timed(
    'BDD reachability',
    () => {
      const reach = new Reachability(rt());
      const r = reach.run({ timeout });
      return r.done ? reachVerdicts(rt(), r, reach) : [failed('bdd', system, 'the reachable set did not converge within the time budget')];
    },
    system,
    emit,
  );
  timed('bounded model checking', () => bmcVerdicts(rt(), bmc(rt(), { maxK: opts.bound ?? 10, timeout })), system, emit);
  timed('k-induction', () => kindVerdicts(rt(), kInduction(rt(), { maxK: 6, timeout, certifyBudget: Math.min(3000, timeout) })), system, emit);
  timed('IC3', () => ic3Verdicts(rt(), ic3(rt(), { timeout, certifyBudget: Math.min(3000, timeout) })), system, emit);
  return out;
}

/** Run every program engine on `fn`. */
export function functionRoom(checked: Checked, fn: string, source: string, opts: RoomOptions = {}): RoomResult[] {
  const out: RoomResult[] = [];
  const emit = (r: RoomResult) => {
    out.push(r);
    opts.onResult?.(r);
  };
  const info = checked.fns.get(fn) as FnInfo;
  const subject = `${fn} meets its contract`;
  timed('random testing', () => testFunction(checked, info, 300), subject, emit);
  timed('symbolic execution', () => [symexVerdict(checked, info, source, subject)], subject, emit);
  timed('program verifier', () => verifyFunction(checked, info, { timeout: opts.timeout ?? 8000 }).verdicts, subject, emit);
  timed('interval analysis', () => [absintVerdict(checked, info, source, subject)], subject, emit);
  return out;
}

function symexVerdict(checked: Checked, info: FnInfo, source: string, subject: string): Verdict {
  const ex = new SymbolicExplorer(checked, info, source, { maxUnroll: 6, maxNodes: 300, timeout: 2000 }).all();
  const failure = ex.nodes.flatMap((n) => n.failures).find((f) => f.replayed);
  const cut = ex.nodes.filter((n) => n.kind === 'cut' || n.kind === 'unknown').length;
  const paths = ex.nodes.filter((n) => n.kind === 'leaf').length;
  const base = { engine: 'symex', subject, assumptions: [] as string[], stats: { paths, nodes: ex.nodes.length, queries: ex.queries } };
  if (failure) {
    return { ...base, status: 'violated', badge: { kind: 'violated', replayed: true }, certificate: { kind: 'trace', checked: true, checker: 'the reference interpreter (the failing run is the certificate)' }, message: `${failure.message} Input: ${failure.input}.` };
  }
  if (cut) {
    return { ...base, status: 'unknown', badge: { kind: 'bounded', bound: 6, what: 'loop iterations' }, certificate: { kind: 'none', checked: false, checker: '' }, assumptions: ['paths with more loop iterations were cut'], message: `No failure on ${paths} complete path${paths === 1 ? '' : 's'}; ${cut} path${cut === 1 ? ' was' : 's were'} cut at the unrolling bound.` };
  }
  return { ...base, status: 'verified', badge: { kind: 'verified', scope: 'every path' }, certificate: { kind: 'none', checked: false, checker: 'the SMT solver’s answers for each path (not re-checked)' }, message: `All ${paths} path${paths === 1 ? '' : 's'} explored; no check can fail on any of them.` };
}

function absintVerdict(checked: Checked, info: FnInfo, source: string, subject: string): Verdict {
  const r = analyse(checked, info, new NonRelational(IntervalValues) as StateDomain<unknown>, source, { widenDelay: 2, narrowing: 1, maxIterations: 40 });
  const alarms = r.checks.filter((c) => c.status === 'alarm');
  const base = { engine: 'absint', subject: `${info.decl.name}: run-time checks and assertions`, assumptions: ['postconditions are not checked by this analysis'], stats: { checks: r.checks.length, alarms: alarms.length } };
  if (!alarms.length) return { ...base, status: 'verified', badge: { kind: 'verified', scope: 'all inputs (run-time checks only)' }, certificate: { kind: 'none', checked: false, checker: 'the analyser itself (no certificate)' }, message: `All ${r.checks.length} checks proved.` };
  void subject;
  return { ...base, status: 'unknown', badge: { kind: 'unknown', reason: `${alarms.length} alarm${alarms.length === 1 ? '' : 's'}` }, certificate: { kind: 'none', checked: false, checker: '' }, message: alarms.map((a) => `line ${a.line}: ${a.message}`).join(' ') };
}

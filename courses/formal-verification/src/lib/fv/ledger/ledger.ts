/**
 * The Ledger, assembled (chapter 28): a specification, a protocol that refines it, an implementation, and the step
 * handlers that connect the implementation to the protocol. Each layer is a Vouch document checked by the engine
 * that suits it; "break it" switches patch the documents to inject a bug into one layer, and the dashboard shows
 * which checks catch it.
 *
 * The documents are small on purpose: three accounts, amounts of one to three coins, two shards. What each check
 * covers, and what connects the layers, is listed in `ASSUMPTIONS`.
 */
import { parse } from '../vouch/syntax/parser';
import { check, type Checked } from '../vouch/check/checker';
import { verifyDocument } from '../verify/document';
import { badgeText, type Verdict } from '../engines';
import { analyse } from '../absint/analyse';
import { NonRelational, IntervalValues, type StateDomain } from '../absint/domain';
import { triage } from '../absint/triage';

export type DocId = 'spec' | 'protocol' | 'impl' | 'link';
export type LayerId = 'spec' | 'protocol' | 'impl' | 'link';

export const SPEC = `// Three accounts holding four coins between them. A transfer moves one to three coins.
system Ledger {
  var bal: [int] = [2, 1, 1]

  action transfer(a: 0..3, b: 0..3, n: 1..4) when bal[a] >= n {
    bal[a] = bal[a] - n
    bal[b] = bal[b] + n
  }

  invariant conserved: sum([bal[a] | a in 0..3]) == 4
  invariant solvent: forall a: 0..3 :: bal[a] >= 0
}`;

export const PROTOCOL = `// Accounts 0 and 1 live on one shard, account 2 on another. A transfer within a shard is local;
// across shards, the sender's shard debits and sends a credit message, which is delivered later.
system Shards {
  var bal: [int] = [2, 1, 1]
  // Coins sent to each account and not yet delivered.
  var inflight: [int] = [0, 0, 0]

  action local(a: 0..3, b: 0..3, n: 1..4) when (a < 2) == (b < 2) && bal[a] >= n {
    bal[a] = bal[a] - n
    bal[b] = bal[b] + n
  }
  action send(a: 0..3, b: 0..3, n: 1..4) when (a < 2) != (b < 2) && bal[a] >= n {
    bal[a] = bal[a] - n
    inflight[b] = inflight[b] + n
  }
  action deliver(b: 0..3) when inflight[b] > 0 {
    bal[b] = bal[b] + inflight[b]
    inflight[b] = 0
  }

  // What the protocol's state means: money in flight already belongs to its recipient.
  refines Ledger via { bal = [bal[a] + inflight[a] | a in 0..3] }
}`;

export const IMPL = `const MAX: u64 = 18446744073709551615

// Balances are 64-bit unsigned integers in one array, indexed by account.
fn transfer(inout bal: [u64], from: int, to: int, amount: u64)
  requires 0 <= from < len(bal) && 0 <= to < len(bal) && from != to
  requires bal[from] >= amount
  requires bal[to] <= MAX - amount
  ensures len(bal) == len(old(bal))
  ensures bal[from] == old(bal[from]) - amount
  ensures bal[to] == old(bal[to]) + amount
  ensures forall k :: 0 <= k < len(bal) && k != from && k != to ==> bal[k] == old(bal[k])
{
  let f = bal[from]
  let t = bal[to]
  bal[from] = f - amount
  bal[to] = t + amount
}

fn debit(inout bal: [u64], from: int, amount: u64)
  requires 0 <= from < len(bal) && bal[from] >= amount
  ensures len(bal) == len(old(bal))
  ensures bal[from] == old(bal[from]) - amount
  ensures forall k :: 0 <= k < len(bal) && k != from ==> bal[k] == old(bal[k])
{
  bal[from] = bal[from] - amount
}

fn credit(inout bal: [u64], to: int, amount: u64)
  requires 0 <= to < len(bal) && bal[to] <= MAX - amount
  ensures len(bal) == len(old(bal))
  ensures bal[to] == old(bal[to]) + amount
  ensures forall k :: 0 <= k < len(bal) && k != to ==> bal[k] == old(bal[k])
{
  bal[to] = bal[to] + amount
}

// The fee on a transfer, in basis points (chapter 26).
fn fee(amount: u32, rate_bp: u32) -> u32
  requires amount <= 429496 && rate_bp <= 10000
{
  return amount * rate_bp / 10000
}

// The journal of applied transfers, latest first (chapter 22).
class Entry {
  amount: int
  next: ref Entry?
}

fn undo(journal: ref Entry) -> ref Entry?
  requires list(journal)
  ensures list(result)
{
  let rest = journal.next
  free journal
  return rest
}`;

export const HANDLERS = `// The step handlers: the code that carries out each protocol step with the implementation's functions.
// Each one's contract is the protocol step, transcribed: the step's guard as the precondition, its effect on
// the balances as the postcondition.

fn on_local(inout bal: [u64], a: int, b: int, n: u64)
  requires 0 <= a < len(bal) && 0 <= b < len(bal) && n >= 1
  requires (a < 2) == (b < 2) && bal[a] >= n
  requires bal[b] <= MAX - n
  ensures len(bal) == len(old(bal))
  ensures forall k :: 0 <= k < len(bal) ==> bal[k] == old(bal[k]) - (if k == a { n } else { 0 }) + (if k == b { n } else { 0 })
{
  transfer(bal, a, b, n)
}

fn on_send(inout bal: [u64], a: int, n: u64)
  requires 0 <= a < len(bal) && n >= 1 && bal[a] >= n
  ensures len(bal) == len(old(bal))
  ensures forall k :: 0 <= k < len(bal) ==> bal[k] == old(bal[k]) - (if k == a { n } else { 0 })
{
  debit(bal, a, n)
}

fn on_deliver(inout bal: [u64], b: int, n: u64)
  requires 0 <= b < len(bal) && n >= 1
  requires bal[b] <= MAX - n
  ensures len(bal) == len(old(bal))
  ensures bal[b] == old(bal[b]) + n
  ensures forall k :: 0 <= k < len(bal) && k != b ==> bal[k] == old(bal[k])
{
  credit(bal, b, n)
}`;

export type Engine = 'explorer' | 'refinement' | 'vc' | 'absint' | 'heap';

export interface CheckDef {
  id: string;
  layer: LayerId;
  doc: DocId;
  /** The declaration the check is about. */
  decl: string;
  /** For system checks: the verdict's subject. */
  subject?: string;
  title: string;
  engine: Engine;
}

export const ENGINE_NAMES: Record<Engine, string> = {
  explorer: 'explicit-state explorer (chapter 1)',
  refinement: 'refinement checker (chapter 4)',
  vc: 'program verifier with SMT (chapters 16–19)',
  absint: 'interval analysis with triage (chapter 26)',
  heap: 'separation-logic verifier (chapters 21–22)',
};

export const CHECKS: CheckDef[] = [
  { id: 'spec.conserved', layer: 'spec', doc: 'spec', decl: 'Ledger', subject: 'invariant conserved', title: 'Money is conserved', engine: 'explorer' },
  { id: 'spec.solvent', layer: 'spec', doc: 'spec', decl: 'Ledger', subject: 'invariant solvent', title: 'No balance goes negative', engine: 'explorer' },
  { id: 'protocol.refines', layer: 'protocol', doc: 'protocol', decl: 'Shards', title: 'Shards refines Ledger', engine: 'refinement' },
  { id: 'impl.transfer', layer: 'impl', doc: 'impl', decl: 'transfer', title: 'transfer meets its contract', engine: 'vc' },
  { id: 'impl.debit', layer: 'impl', doc: 'impl', decl: 'debit', title: 'debit meets its contract', engine: 'vc' },
  { id: 'impl.credit', layer: 'impl', doc: 'impl', decl: 'credit', title: 'credit meets its contract', engine: 'vc' },
  { id: 'impl.fee', layer: 'impl', doc: 'impl', decl: 'fee', title: 'fee cannot overflow', engine: 'absint' },
  { id: 'impl.undo', layer: 'impl', doc: 'impl', decl: 'undo', title: 'undo is memory-safe', engine: 'heap' },
  { id: 'link.local', layer: 'link', doc: 'link', decl: 'on_local', title: 'on_local carries out local', engine: 'vc' },
  { id: 'link.send', layer: 'link', doc: 'link', decl: 'on_send', title: 'on_send carries out send', engine: 'vc' },
  { id: 'link.deliver', layer: 'link', doc: 'link', decl: 'on_deliver', title: 'on_deliver carries out deliver', engine: 'vc' },
];

export interface Patch {
  doc: Exclude<DocId, 'link'> | 'handlers';
  find: string;
  replace: string;
}

export interface Switch {
  id: string;
  layer: LayerId;
  label: string;
  /** What the bug is, in a sentence. */
  detail: string;
  patches: Patch[];
}

export const SWITCHES: Switch[] = [
  {
    id: 'overdraft',
    layer: 'spec',
    label: 'Allow an overdraft of one coin',
    detail: 'The specification’s transfer is allowed when the sender has one coin less than the amount.',
    patches: [{ doc: 'spec', find: '(a: 0..3, b: 0..3, n: 1..4) when bal[a] >= n {', replace: '(a: 0..3, b: 0..3, n: 1..4) when bal[a] >= n - 1 {' }],
  },
  {
    id: 'duplicate',
    layer: 'protocol',
    label: 'Deliver a credit twice',
    detail: 'deliver credits the coins in flight but leaves them in flight, so they can be delivered again.',
    patches: [{ doc: 'protocol', find: '    bal[b] = bal[b] + inflight[b]\n    inflight[b] = 0\n', replace: '    bal[b] = bal[b] + inflight[b]\n' }],
  },
  {
    id: 'lose',
    layer: 'protocol',
    label: 'Let the network lose a credit',
    detail: 'A new step drops the coins in flight to an account, as a network that loses a message would.',
    patches: [{ doc: 'protocol', find: '\n  // What the protocol', replace: '\n  action lose(b: 0..3) when inflight[b] > 0 {\n    inflight[b] = 0\n  }\n\n  // What the protocol' }],
  },
  {
    id: 'overflow',
    layer: 'impl',
    label: 'Drop transfer’s overflow precondition',
    detail: 'transfer no longer requires the destination to have room for the amount.',
    patches: [{ doc: 'impl', find: '  requires bal[from] >= amount\n  requires bal[to] <= MAX - amount\n', replace: '  requires bal[from] >= amount\n' }],
  },
  {
    id: 'fee-limit',
    layer: 'impl',
    label: 'Remove the fee’s limit on the amount',
    detail: 'fee accepts any 32-bit amount.',
    patches: [{ doc: 'impl', find: 'requires amount <= 429496 && rate_bp <= 10000', replace: 'requires rate_bp <= 10000' }],
  },
  {
    id: 'leak',
    layer: 'impl',
    label: 'undo forgets to free the entry',
    detail: 'undo returns the rest of the journal and leaves the removed entry allocated.',
    patches: [{ doc: 'impl', find: '  let rest = journal.next\n  free journal\n  return rest\n', replace: '  return journal.next\n' }],
  },
  {
    id: 'skim',
    layer: 'impl',
    label: 'credit rounds down (and its contract says less)',
    detail: 'credit rounds the amount down to a whole hundred, and its postcondition was weakened to “the balance does not decrease”, so credit still meets its contract.',
    patches: [
      { doc: 'impl', find: '  ensures bal[to] == old(bal[to]) + amount\n  ensures forall k :: 0 <= k < len(bal) && k != to', replace: '  ensures bal[to] >= old(bal[to])\n  ensures forall k :: 0 <= k < len(bal) && k != to' },
      { doc: 'impl', find: '  bal[to] = bal[to] + amount\n}', replace: '  bal[to] = bal[to] + amount / 100 * 100\n}' },
    ],
  },
  {
    id: 'fee-rate',
    layer: 'impl',
    label: 'Charge ten times the fee',
    detail: 'fee divides by 1000 instead of 10000.',
    patches: [{ doc: 'impl', find: 'return amount * rate_bp / 10000', replace: 'return amount * rate_bp / 1000' }],
  },
];

/** The fix for the bug that slips between the layers: the handler skips a transfer to the same account. */
export const FIX: Patch = { doc: 'handlers', find: '{\n  transfer(bal, a, b, n)\n}', replace: '{\n  if a != b {\n    transfer(bal, a, b, n)\n  }\n}' };

export interface Sources {
  spec: string;
  protocol: string;
  impl: string;
  handlers: string;
}

export function applyPatch(src: string, p: Patch): string {
  const i = src.indexOf(p.find);
  if (i < 0) throw new Error(`Patch not found: ${p.find}`);
  return src.slice(0, i) + p.replace + src.slice(i + p.find.length);
}

/** The layers' sources with the given switches on (and the handler fix, if asked). */
export function sources(on: Iterable<string>, fixed = false): Sources {
  const s: Sources = { spec: SPEC, protocol: PROTOCOL, impl: IMPL, handlers: HANDLERS };
  const ids = new Set(on);
  for (const sw of SWITCHES) if (ids.has(sw.id)) for (const p of sw.patches) s[p.doc] = applyPatch(s[p.doc], p);
  if (fixed) s.handlers = applyPatch(s.handlers, FIX);
  return s;
}

/** The Vouch document each check runs on. */
export function documentText(s: Sources, doc: DocId): string {
  switch (doc) {
    case 'spec':
      return s.spec;
    case 'protocol':
      return `${s.spec}\n\n${s.protocol}`;
    case 'impl':
      return s.impl;
    case 'link':
      return `${s.impl}\n\n${s.handlers}`;
  }
}

export interface CheckResult {
  id: string;
  status: 'verified' | 'violated' | 'unknown' | 'error';
  badge: string;
  /** The certificate and whether a trusted checker re-checked it, in words. */
  certificate: string;
  message: string;
  ms: number;
}

function fromVerdict(id: string, v: Verdict, ms: number): CheckResult {
  const status = v.status === 'timeout' ? 'unknown' : v.status;
  const cert = v.certificate.kind === 'none' ? 'no certificate: the engine is trusted' : `${v.certificate.kind}, ${v.certificate.checked ? `checked by ${v.certificate.checker}` : 'not re-checked'}`;
  return { id, status, badge: badgeText(v.badge), certificate: cert, message: v.message ?? '', ms };
}

function compile(text: string): Checked {
  const p = parse(text);
  const c = check(p.program);
  const errs = [...p.diagnostics, ...c.diagnostics].filter((d) => d.severity === 'error');
  if (errs.length) throw new Error(errs.map((d) => d.message).join(' '));
  return c;
}

/** The fee check: interval analysis, then triage of any alarm (a confirmed alarm is replayed by the interpreter). */
function feeCheck(c: Checked, text: string): Omit<CheckResult, 'id' | 'ms'> {
  const info = c.fns.get('fee')!;
  const r = analyse(c, info, new NonRelational(IntervalValues) as StateDomain<unknown>, text, { widenDelay: 2, narrowing: 1, maxIterations: 40 });
  const alarms = r.checks.filter((k) => k.status === 'alarm');
  const n = r.checks.length;
  if (!alarms.length) {
    return { status: 'verified', badge: `${n} of ${n} checks proved for all inputs`, certificate: 'no certificate: the analyser is trusted', message: 'The intervals bound every intermediate value within the 32-bit range.' };
  }
  const t = triage(c, info, text, alarms).checks;
  const confirmed = t.find((k) => k.verdict === 'confirmed');
  if (confirmed) {
    return { status: 'violated', badge: 'violated · counterexample replayed', certificate: 'trace, checked by the reference interpreter', message: `${confirmed.failure ?? confirmed.message} Input: ${confirmed.input ?? ''}.` };
  }
  return { status: 'unknown', badge: `${alarms.length} alarm${alarms.length === 1 ? '' : 's'}, not confirmed`, certificate: 'none', message: alarms.map((a) => a.message).join(' ') };
}

/**
 * Run the checks on the given sources, one document at a time; `onResult` is called as each check finishes.
 * Checks of the link layer run only when `link` is set.
 */
export async function runChecks(s: Sources, opts: { link: boolean; onResult?: (r: CheckResult) => void; timeout?: number }): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const emit = (r: CheckResult) => {
    out.push(r);
    opts.onResult?.(r);
  };
  const docs: DocId[] = opts.link ? ['spec', 'protocol', 'impl', 'link'] : ['spec', 'protocol', 'impl'];
  for (const doc of docs) {
    const defs = CHECKS.filter((k) => k.doc === doc);
    const text = documentText(s, doc);
    const t0 = Date.now();
    let c: Checked;
    try {
      c = compile(text);
    } catch (e) {
      for (const k of defs) emit({ id: k.id, status: 'error', badge: 'error', certificate: 'none', message: (e as Error).message, ms: 0 });
      continue;
    }
    const wanted = new Set(defs.filter((k) => k.engine !== 'absint').map((k) => k.decl));
    const results = await verifyDocument(c, { timeout: opts.timeout ?? 8000, fnVerifier: (_c, info) => (wanted.has(info.decl.name) ? undefined : []) });
    const ms = Date.now() - t0;
    for (const k of defs) {
      if (k.engine === 'absint') {
        const t1 = Date.now();
        emit({ id: k.id, ...feeCheck(c, text), ms: Date.now() - t1 });
        continue;
      }
      const d = results.find((r) => r.decl === k.decl);
      const vs = (d?.verdicts ?? []).filter((v) => !k.subject || v.subject === k.subject);
      const bad = vs.find((v) => v.status === 'violated' || v.status === 'error') ?? vs.find((v) => v.status !== 'verified');
      const v = bad ?? vs[0];
      if (!v) emit({ id: k.id, status: 'error', badge: 'error', certificate: 'none', message: `No verdict for ${k.decl}.`, ms });
      else emit(fromVerdict(k.id, v, ms));
    }
  }
  return out;
}

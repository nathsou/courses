/**
 * Checking an HDL exercise (```rtl blocks). Three kinds of check, each saying exactly what it established:
 *
 * - `equivalent` (the default when there is a reference design): the reader's design is proved to behave like
 *   the reference on the compared signals, in every reachable state, for every input.
 * - `prove`: the reader's design must contain assertions, and they must hold in every reachable state.
 * - `catch`: the reader adds assertions to a buggy design without changing its behaviour; they must fail on it
 *   and hold on the reference (correct) design.
 *
 * `tests` (explicit input vectors with expected values) can be added to any of them.
 */
import { describeInputs, equivalent, prove } from './check';
import { parse, type Design, type Env } from './hdl';
import { simulate } from './sim';

export interface RtlTest {
  name?: string;
  inputs: Env[];
  /** Expected values, cycle by cycle (signals not listed are not checked). */
  expect: Record<string, number>[];
}

export interface RtlSpec {
  id: string;
  title?: string;
  prompt?: string;
  /** The starting design. */
  code: string;
  /** A design that passes (checked by the content tests, shown on request). */
  solution?: string;
  /** The specification, as a design. */
  reference?: string;
  /** Signals compared with the reference (default: the reference's outputs). */
  compare?: string[];
  mode?: 'equivalent' | 'prove' | 'catch';
  tests?: RtlTest[];
  /** A stimulus for the waveform shown under the editor. */
  trace?: Env[];
  hints?: string[];
  why?: string;
}

export type RtlVerdict = { ok: true; message: string } | { ok: false; message: string; line?: number; stimulus?: Env[] };

function parsed(src: string, who: string): Design | RtlVerdict {
  const r = parse(src);
  if (r.ok) return r.design;
  const e = r.errors[0]!;
  return { ok: false, message: `${who}line ${e.line}: ${e.message}`, line: e.line };
}

const isVerdict = (x: Design | RtlVerdict): x is RtlVerdict => 'ok' in x;

function stimulusText(stimulus: Env[]): string {
  if (stimulus.length === 1) return `in the first cycle, with ${describeInputs(stimulus[0]!)}`;
  return `in cycle ${stimulus.length - 1} (counting from 0), after the inputs ${stimulus.map((s) => `(${describeInputs(s)})`).join(', ')}`;
}

export function checkRtl(spec: RtlSpec, source: string): RtlVerdict {
  const mine = parsed(source, '');
  if (isVerdict(mine)) return mine;
  const mode = spec.mode ?? (spec.reference || spec.tests?.length ? 'equivalent' : 'prove');
  const ref = spec.reference ? parsed(spec.reference, 'the reference design, ') : undefined;
  if (ref && isVerdict(ref)) return ref;
  const said: string[] = [];

  if (mode === 'catch') {
    if (!mine.asserts.length) return { ok: false, message: 'Add at least one assert: a condition that a correct design satisfies in every cycle.' };
    const original = parsed(spec.code, 'the starting design, ');
    if (isVerdict(original)) return original;
    const outs = original.outputs.map((o) => o.name);
    const same = equivalent(mine, original, outs);
    if (!same.ok) return { ok: false, message: `This exercise asks for assertions only, but your design now behaves differently: ${same.signal} is ${same.got} where the original gives ${same.expected}, ${stimulusText(same.counterexample.stimulus)}.`, stimulus: same.counterexample.stimulus };
    const onBuggy = prove(mine);
    if (onBuggy.ok) return { ok: false, message: `Your assertions hold in all ${onBuggy.states} reachable states of the buggy design, so they cannot catch its bug. Which value does the buggy design reach that a correct one never does?` };
    if (!ref) return { ok: false, message: 'This exercise has no reference design.' };
    const extended = parsed(`${spec.reference}\n${mine.asserts.map((a) => `assert ${a.text}`).join('\n')}\n${mine.assumes.map((a) => `assume ${a.text}`).join('\n')}\n`, 'your assertion, added to the correct design, ');
    if (isVerdict(extended)) return extended;
    const onGood = prove(extended);
    if (!onGood.ok) return { ok: false, message: `Your assertion “${onGood.check.text}” also fails on a correct design, ${stimulusText(onGood.counterexample.stimulus)}. It must hold whenever the design is right.`, stimulus: onGood.counterexample.stimulus };
    return { ok: true, message: `Checked: “${onBuggy.check.text}” fails on the buggy design ${stimulusText(onBuggy.counterexample.stimulus)}, and your assertions hold in all ${onGood.states} reachable states of the correct design.` };
  }

  if (mode === 'prove' && !mine.asserts.length) return { ok: false, message: 'Add at least one assert for the proof to check.' };
  if (mine.asserts.length) {
    const p = prove(mine);
    if (!p.ok) return { ok: false, message: `Assertion “${p.check.text}” (line ${p.check.line}) fails ${stimulusText(p.counterexample.stimulus)}.`, line: p.check.line, stimulus: p.counterexample.stimulus };
    said.push(p.complete ? `every assertion holds in all ${p.states} reachable states` : `no assertion failed in the first ${p.states} states explored`);
  }

  if (ref && (mode === 'equivalent' || mode === 'prove')) {
    const compare = spec.compare ?? ref.outputs.map((o) => o.name);
    for (const name of compare) {
      const theirs = ref.signals.get(name)!;
      const s = mine.signals.get(name);
      if (!s) return { ok: false, message: `Your design has no ${theirs.kind} called “${name}”.` };
      if (s.width !== theirs.width) return { ok: false, message: `“${name}” should be ${theirs.width} bit${theirs.width === 1 ? '' : 's'} wide, not ${s.width}.`, line: s.line };
    }
    for (const i of mine.inputs) {
      const t = ref.signals.get(i.name);
      if (!t || t.kind !== 'input') return { ok: false, message: `The specification has no input called “${i.name}”.`, line: i.line };
      if (t.width !== i.width) return { ok: false, message: `The input “${i.name}” should be ${t.width} bit${t.width === 1 ? '' : 's'} wide.`, line: i.line };
    }
    const eq = equivalent(mine, ref, compare);
    if (!eq.ok) return { ok: false, message: `Not equivalent to the specification: ${eq.signal} is ${eq.got} but should be ${eq.expected}, ${stimulusText(eq.counterexample.stimulus)}.`, stimulus: eq.counterexample.stimulus };
    said.push(eq.complete ? `it is proved equivalent to the specification (${eq.states} reachable state pairs, every input)` : `it matched the specification in the first ${eq.states} state pairs explored`);
  }

  for (const [n, t] of (spec.tests ?? []).entries()) {
    const tr = simulate(mine, t.inputs);
    for (const [c, exp] of t.expect.entries()) {
      for (const [name, v] of Object.entries(exp)) {
        const got = tr.cycles[c]?.values[name];
        if (got === undefined) return { ok: false, message: `Your design has no signal called “${name}”.` };
        if (got !== v) return { ok: false, message: `Test ${t.name ?? n + 1}: in cycle ${c}, ${name} is ${got} but should be ${v}.`, stimulus: t.inputs.slice(0, c + 1) };
      }
    }
  }
  if (spec.tests?.length) said.push(`${spec.tests.length === 1 ? 'the test passes' : `all ${spec.tests.length} tests pass`}`);
  if (!said.length) return { ok: false, message: 'Nothing to check.' };
  return { ok: true, message: `Checked: ${said.join('; ')}.` };
}

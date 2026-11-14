/**
 * The Weft text of a drawn machine: an `enum` of states, one `reg`, and a `match` on it.
 *
 *     enum State { Red, RedAmber, Green, Amber }
 *
 *     module traffic_light(in clk: clock, in tick: bool, out red: bool, out amber: bool, out green: bool) {
 *         reg state: State = .Red;
 *
 *         state := match state {
 *             .Red => if tick { .RedAmber } else { .Red },
 *             …
 *         };
 *         red = state == .Red || state == .RedAmber;
 *     }
 *
 * The encoding is not part of the machine's logic: binary leaves it to the compiler, and Gray and one-hot
 * give the enum its codes (`enum State: uint<4> { Red = 0b0001, … }`). The text is in synth's format (a test
 * checks that `synth fmt` leaves it alone), and a test compiles it with synth and runs it against `step` for
 * every encoding.
 */
import { allInputs, cap, matches, mergePatterns, step, toSnake, type Fsm } from './fsm';
import { codeText, encode, type Encoding } from './synth';
import { WEFT_KEYWORDS, WEFT_TYPES, WEFT_BUILTINS } from '$lib/weft/highlight';

/** A state's name as an enum variant: the first letter capitalised. */
export const variant = cap;

const RESERVED = new Set([...WEFT_KEYWORDS, ...WEFT_TYPES, ...WEFT_BUILTINS, 'clk', 'state']);

/** A name usable as a Weft port: snake case, and not a keyword (`in` becomes `in_`). */
export function portName(name: string): string {
  const s = toSnake(name).replace(/[^a-z0-9_]/g, '_');
  return RESERVED.has(s) ? `${s}_` : s;
}

/** A machine's title as a module name: `Traffic light` → `traffic_light`. */
export function moduleName(title: string): string {
  const words = title.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.toLowerCase());
  let name = words.join('_') || 'machine';
  if (/^[0-9]/.test(name)) name = `m${name}`;
  return RESERVED.has(name) ? `${name}_` : name;
}

/** `tick`, `!tick`, `five && !ten`: the pattern as a Boolean expression (undefined when it matches every input). */
function guard(pattern: string, inputs: readonly string[]): string | undefined {
  const lits: string[] = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') lits.push(portName(inputs[i]!));
    else if (pattern[i] === '0') lits.push('!' + portName(inputs[i]!));
  }
  return lits.length ? lits.join(' && ') : undefined;
}

/** The condition "the inputs are one of these combinations", as a sum of the fewest patterns the merge finds. */
function condition(minterms: string[], inputs: readonly string[]): string {
  const gs = mergePatterns(minterms).map((p) => guard(p, inputs) ?? 'true');
  // Weft does not let `&&` and `||` mix without brackets.
  return gs.length > 1 ? gs.map((g) => (g.includes('&&') ? `(${g})` : g)).join(' || ') : gs[0]!;
}

/**
 * The next state from `from`: an `if` chain with one branch for each state it can go to, and the most common
 * destination (staying put, when it ties) as the final `else`.
 */
function nextExpr(fsm: Fsm, from: string): string {
  const byTarget = new Map<string, string[]>();
  for (const v of allInputs(fsm.inputs.length)) {
    const to = step(fsm, from, v).next;
    byTarget.set(to, [...(byTarget.get(to) ?? []), v.join('')]);
  }
  const targets = [...byTarget.keys()];
  const size = (t: string) => byTarget.get(t)!.length;
  const fallback = targets.reduce((best, t) => (size(t) > size(best) || (size(t) === size(best) && t === from) ? t : best), targets[0]!);
  const others = targets.filter((t) => t !== fallback);
  const target = (t: string) => `.${variant(t)}`;
  if (!others.length) return target(fallback);
  return others.map((t, i) => `${i === 0 ? 'if' : ' else if'} ${condition(byTarget.get(t)!, fsm.inputs)} { ${target(t)} }`).join('') + ` else { ${target(fallback)} }`;
}

/** A Mealy output in a state: true for exactly the input combinations on which the machine takes an arrow that sets it. */
function mealyExpr(fsm: Fsm, from: string, o: number): string {
  const ones = allInputs(fsm.inputs.length).filter((v) => step(fsm, from, v).out[o] === '1');
  if (!ones.length) return 'false';
  if (ones.length === 1 << fsm.inputs.length) return 'true';
  return condition(ones.map((v) => v.join('')), fsm.inputs);
}

/** The `enum` line: no codes for binary (the compiler chooses), the codes otherwise. */
function enumLine(fsm: Fsm, encoding: Encoding): string {
  const names = fsm.states.map((s) => variant(s.name));
  if (encoding === 'binary') return `enum State { ${names.join(', ')} }`;
  const e = encode(fsm, encoding);
  return `enum State: uint<${e.bits}> { ${fsm.states.map((s) => `${variant(s.name)} = 0b${codeText(e.code[s.name]!, e.bits)}`).join(', ')} }`;
}

export function toWeft(fsm: Fsm, encoding: Encoding): string {
  const name = moduleName(fsm.title);
  const ports = ['in  clk: clock', ...fsm.inputs.map((i) => `in  ${portName(i)}: bool`), ...fsm.outputs.map((o) => `out ${portName(o)}: bool`)];
  const codeWord = encoding === 'binary' ? 'binary' : encoding === 'gray' ? 'Gray' : 'one-hot';
  const lines: string[] = [];
  lines.push(`/// ${fsm.title}: a ${fsm.kind === 'moore' ? 'Moore' : 'Mealy'} machine, states coded ${codeWord}.`);
  lines.push(enumLine(fsm, encoding));
  lines.push('');
  const header = `module ${name}(${ports.map((p) => p.replace(/^(in|out) +/, '$1 ')).join(', ')}) {`;
  if (header.length > 100) {
    lines.push(`module ${name}(`);
    lines.push(...ports.map((p) => `    ${p},`));
    lines.push(') {');
  } else lines.push(header);
  lines.push(`    reg state: State = .${variant(fsm.states[0]!.name)};`);
  lines.push('');
  lines.push('    state := match state {');
  for (const s of fsm.states) lines.push(`        .${variant(s.name)} => ${nextExpr(fsm, s.name)},`);
  lines.push('    };');
  fsm.outputs.forEach((o, k) => {
    const port = portName(o);
    if (fsm.kind === 'moore') {
      const on = fsm.states.filter((s) => s.out[k] === '1');
      const rhs = on.length === 0 ? 'false' : on.length === fsm.states.length ? 'true' : on.map((s) => `state == .${variant(s.name)}`).join(' || ');
      lines.push(`    ${port} = ${rhs};`);
    } else {
      lines.push(`    ${port} = match state {`);
      for (const s of fsm.states) lines.push(`        .${variant(s.name)} => ${mealyExpr(fsm, s.name, k)},`);
      lines.push('    };');
    }
  });
  lines.push('}');
  return lines.join('\n') + '\n';
}

// ── Stimulus, for the tests and the widget ─────────────────────────────────────

/** Every input combination, as the port values the Weft module takes. */
export const inputVectors = (fsm: Fsm): number[][] => allInputs(fsm.inputs.length);

export { matches };

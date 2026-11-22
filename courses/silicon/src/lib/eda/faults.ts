/**
 * Manufacturing test: the stuck-at fault model and fault simulation. A fault "net n stuck at v" models a defect
 * that ties a wire to ground or to the supply. With full scan, every flip-flop can be loaded and read directly,
 * so the logic between them is tested as a combinational circuit: a test vector sets the inputs and the
 * flip-flops' outputs, and the circuit's outputs and flip-flop inputs are compared with the fault-free values.
 */
import { evalNetlist, type Netlist } from './techmap';

export interface Fault {
  net: string;
  value: 0 | 1;
}

export const faultName = (f: Fault) => `${f.net} stuck-at-${f.value}`;

/** Inputs of the combinational test (primary inputs and flip-flop outputs) and its observed points. */
export function testPorts(nl: Netlist): { controls: string[]; observes: string[] } {
  return { controls: [...nl.inputs, ...nl.flops.map((f) => f.q)], observes: [...new Set([...nl.outputs.map((o) => o.net), ...nl.flops.map((f) => f.d)])] };
}

/** Every stuck-at fault on every net driven by an input, a flip-flop or a cell. */
export function allFaults(nl: Netlist): Fault[] {
  const { controls } = testPorts(nl);
  const nets = [...controls, ...nl.instances.map((i) => i.out)];
  return nets.flatMap((net) => [
    { net, value: 0 as const },
    { net, value: 1 as const },
  ]);
}

export type Vector = Record<string, number>;

/** Faults a vector detects. */
export function detects(nl: Netlist, vec: Vector, faults: Fault[]): Fault[] {
  const { observes } = testPorts(nl);
  const good = evalNetlist(nl, vec);
  return faults.filter((f) => {
    const bad = evalNetlist(nl, vec, f);
    return observes.some((o) => good[o] !== bad[o]);
  });
}

export interface Coverage {
  detected: Set<string>;
  total: number;
  coverage: number;
}

export function coverage(nl: Netlist, vectors: Vector[], faults = allFaults(nl)): Coverage {
  const detected = new Set<string>();
  for (const v of vectors) for (const f of detects(nl, v, faults)) detected.add(faultName(f));
  return { detected, total: faults.length, coverage: faults.length ? detected.size / faults.length : 1 };
}

/** Vector from a number: bit i of n sets control i. */
export function vectorOf(nl: Netlist, n: number): Vector {
  const { controls } = testPorts(nl);
  return Object.fromEntries(controls.map((c, i) => [c, (n >>> i) & 1]));
}

/**
 * A small automatic test pattern generator: greedily pick, among all input combinations (feasible for a few
 * dozen inputs at most… here a dozen), the vector that detects the most undetected faults, until none is left.
 * Faults no vector detects are redundant: the logic that would show them is unobservable.
 */
export function atpg(nl: Netlist, faults = allFaults(nl)): { vectors: Vector[]; redundant: Fault[] } {
  const { controls } = testPorts(nl);
  if (controls.length > 14) throw new Error('too many inputs for exhaustive pattern search');
  const all = Array.from({ length: 2 ** controls.length }, (_, n) => vectorOf(nl, n));
  const table = all.map((v) => new Set(detects(nl, v, faults).map(faultName)));
  const remaining = new Set(faults.map(faultName));
  const anyDetect = new Set(table.flatMap((s) => [...s]));
  for (const f of [...remaining]) if (!anyDetect.has(f)) remaining.delete(f);
  const vectors: Vector[] = [];
  while (remaining.size) {
    let best = 0;
    let bestN = -1;
    table.forEach((s, i) => {
      let n = 0;
      for (const f of s) if (remaining.has(f)) n++;
      if (n > bestN) {
        bestN = n;
        best = i;
      }
    });
    vectors.push(all[best]!);
    for (const f of table[best]!) remaining.delete(f);
  }
  return { vectors, redundant: faults.filter((f) => !anyDetect.has(faultName(f))) };
}

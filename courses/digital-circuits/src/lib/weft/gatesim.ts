/**
 * Driving a design's gates (`gates.ts`) on the course's digital engine as a testbench drives the design:
 * set inputs, pulse the clock, read ports. The clock is a manual switch: `tick()` lets everything settle,
 * raises it, lets the flip-flops update and lowers it again, so inputs never change near a clock edge.
 */
import { createDigitalEngine, type DigitalEngine, type DigitalEngineOptions } from '../sim/digital';
import type { FlatNetlist, Logic } from '../sim/netlist/types';
import type { GateNetlist } from './gates';

export interface GateSim {
  readonly engine: DigitalEngine;
  set(port: string, value: number | bigint): void;
  /** The value of a port, or `undefined` while a bit is X or Z. */
  get(port: string): bigint | undefined;
  bits(port: string): Logic[];
  tick(clock?: string): void;
  step(n?: number): void;
  /** Power-up state, inputs kept. */
  reset(): void;
  settle(): void;
}

export function createGateSim(g: GateNetlist, netlist: FlatNetlist = g.netlist, options: DigitalEngineOptions = {}): GateSim {
  const engine = createDigitalEngine(netlist, options);
  const index = new Map(netlist.elements.map((e) => [e.id, e]));
  const port = (name: string) => {
    const p = g.ports.find((x) => x.name === name);
    if (!p) throw new Error(`no port ${name}`);
    return p;
  };
  // Long enough for any path through the gates to settle (1 ns per gate by default).
  const settleTime = (g.stats.elements + 20) * 2e-9;
  let dirty = false;
  const settle = () => {
    engine.advance(settleTime);
    dirty = false;
  };
  const setBits = (p: ReturnType<typeof port>, value: bigint) => {
    p.elements.forEach((id, i) => engine.setParam(id, 'on', ((value >> BigInt(i)) & 1n) === 1n));
    dirty = true;
  };
  settle();
  const sim: GateSim = {
    engine,
    set(name, value) {
      const p = port(name);
      if (p.dir !== 'in') throw new Error(`${name} is not an input`);
      if (p.clock) throw new Error(`${name} is a clock: use tick()`);
      const v = BigInt(value);
      setBits(p, v & ((1n << BigInt(p.width)) - 1n));
    },
    bits(name) {
      if (dirty) settle();
      const p = port(name);
      return p.elements.map((id, i) => {
        const el = index.get(id);
        return engine.logic(el ? el.pins[0]! : p.nets[i]!);
      });
    },
    get(name) {
      const b = sim.bits(name);
      let v = 0n;
      for (let i = 0; i < b.length; i++) {
        if (b[i]! > 1) return undefined;
        if (b[i] === 1) v |= 1n << BigInt(i);
      }
      return v;
    },
    tick(clock) {
      const clocks = g.ports.filter((p) => p.dir === 'in' && p.clock && (clock === undefined || p.name === clock));
      if (clock !== undefined && clocks.length === 0) throw new Error(`no clock ${clock}`);
      settle();
      for (const p of clocks) setBits(p, 1n);
      settle();
      for (const p of clocks) setBits(p, 0n);
      settle();
    },
    step(n = 1) {
      for (let i = 0; i < n; i++) sim.tick();
    },
    reset() {
      engine.reset();
      for (const p of g.ports) {
        if (p.dir !== 'in') continue;
        let v = 0n;
        p.elements.forEach((id, i) => {
          if (!p.clock && index.get(id)?.params.on === true) v |= 1n << BigInt(i);
        });
        setBits(p, v);
      }
      settle();
    },
    settle,
  };
  return sim;
}

/**
 * Circuits for Part II, built on the transistor model of devices.ts: the CMOS inverter's transfer curve and
 * noise margins, series–parallel switch networks (static CMOS gates), transients of a gate driving a load,
 * sizing a chain of inverters, and the six-transistor SRAM cell. Currents in A, voltages in V, capacitance
 * in F, time in s.
 */
import { NFET, PFET, drainCurrent, type Fet } from './devices';

export const scaled = (f: Fet, k: number): Fet => ({ ...f, beta: f.beta * k });

// ───────────────────────── The inverter ─────────────────────────

export interface Inverter {
  vdd: number;
  n: Fet;
  p: Fet;
}

/** The balanced inverter of the course: the pMOS is 2.5 times as wide as the nMOS, to match its current. */
export const INVERTER: Inverter = { vdd: 1.0, n: NFET, p: scaled(PFET, 2.5) };

/** Pull-down and pull-up currents for given input and output voltages. */
export function currents(inv: Inverter, vin: number, vout: number): { down: number; up: number } {
  return { down: drainCurrent(inv.n, vin, vout), up: drainCurrent(inv.p, inv.vdd - vin, inv.vdd - vout) };
}

/** The static output voltage: where the nMOS current equals the pMOS current (bisection; the difference is monotonic). */
export function vout(inv: Inverter, vin: number): number {
  let lo = 0;
  let hi = inv.vdd;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const c = currents(inv, vin, mid);
    if (c.down > c.up) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function vtc(inv: Inverter, steps = 200): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = (inv.vdd * i) / steps;
    return [x, vout(inv, x)];
  });
}

/** The switching threshold V_M, where V_out = V_in. */
export function switchingThreshold(inv: Inverter): number {
  let lo = 0;
  let hi = inv.vdd;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vout(inv, mid) > mid) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface NoiseMargins {
  vil: number;
  vih: number;
  voh: number;
  vol: number;
  nmh: number;
  nml: number;
  vm: number;
  /** Largest small-signal gain magnitude. */
  gain: number;
}

/** Noise margins from the unity-gain points of the transfer curve. */
export function noiseMargins(inv: Inverter): NoiseMargins {
  const N = 600;
  const pts = Array.from({ length: N + 1 }, (_, i) => (inv.vdd * i) / N);
  const out = pts.map((x) => vout(inv, x));
  const slope = (i: number) => (out[i + 1]! - out[i]!) / (pts[i + 1]! - pts[i]!);
  let vil = 0;
  let vih = inv.vdd;
  let gain = 0;
  for (let i = 0; i < N; i++) {
    const s = slope(i);
    gain = Math.max(gain, -s);
    if (s <= -1 && vil === 0) vil = pts[i]!;
    if (s <= -1) vih = pts[i + 1]!;
  }
  const voh = vout(inv, vil);
  const vol = vout(inv, vih);
  return { vil, vih, voh, vol, nmh: voh - vih, nml: vil - vol, vm: switchingThreshold(inv), gain };
}

// ───────────────────────── Switch networks ─────────────────────────

/** A series–parallel network of transistors, each controlled by an input. */
export type Net = { k: 'in'; name: string } | { k: 'ser'; parts: Net[] } | { k: 'par'; parts: Net[] };

/**
 * Parse a pull-down network written as a Boolean expression: inputs are letters, `·` `*` `&` or juxtaposition is
 * series (AND), `+` or `|` is parallel (OR), parentheses group. "A(B+C)" is A in series with B‖C.
 */
export function parseNet(src: string): Net {
  const s = src.replace(/\s+/g, '');
  let i = 0;
  const fail = (m: string): never => {
    throw new Error(m);
  };
  const par = (): Net => {
    const parts = [ser()];
    while (s[i] === '+' || s[i] === '|') {
      i++;
      parts.push(ser());
    }
    return parts.length === 1 ? parts[0]! : { k: 'par', parts };
  };
  const ser = (): Net => {
    const parts = [atom()];
    for (;;) {
      if (s[i] === '·' || s[i] === '*' || s[i] === '&' || s[i] === '.') {
        i++;
        parts.push(atom());
      } else if (s[i] !== undefined && (/[A-Za-z(]/.test(s[i]!))) parts.push(atom());
      else break;
    }
    return parts.length === 1 ? parts[0]! : { k: 'ser', parts };
  };
  const atom = (): Net => {
    const c = s[i];
    if (c === undefined) return fail('the expression ends too early');
    if (c === '(') {
      i++;
      const n = par();
      if (s[i] !== ')') fail('a “(” is not closed');
      i++;
      return n;
    }
    if (/[A-Za-z]/.test(c)) {
      i++;
      return { k: 'in', name: c.toUpperCase() };
    }
    return fail(`unexpected “${c}”`);
  };
  if (!s) fail('write a network, for example A·B');
  const n = par();
  if (i < s.length) fail(`unexpected “${s[i]}”`);
  return n;
}

/** Whether a network conducts. nMOS transistors conduct when their input is 1; pMOS (`pmos`) when it is 0. */
export function conducts(n: Net, env: Record<string, number>, pmos = false): boolean {
  if (n.k === 'in') return pmos ? !env[n.name] : !!env[n.name];
  if (n.k === 'ser') return n.parts.every((p) => conducts(p, env, pmos));
  return n.parts.some((p) => conducts(p, env, pmos));
}

/** The dual network: series and parallel swapped. A static CMOS gate's pull-up is the dual of its pull-down. */
export function dual(n: Net): Net {
  if (n.k === 'in') return n;
  return { k: n.k === 'ser' ? 'par' : 'ser', parts: n.parts.map(dual) };
}

export function inputsOf(n: Net, out = new Set<string>()): string[] {
  if (n.k === 'in') out.add(n.name);
  else for (const p of n.parts) inputsOf(p, out);
  return [...out].sort();
}

export function transistorCount(n: Net): number {
  return n.k === 'in' ? 1 : n.parts.reduce((s, p) => s + transistorCount(p), 0);
}

/** Longest chain of transistors in series: it sets how much the gate's transistors must be widened. */
export function seriesDepth(n: Net): number {
  if (n.k === 'in') return 1;
  if (n.k === 'ser') return n.parts.reduce((s, p) => s + seriesDepth(p), 0);
  return Math.max(...n.parts.map(seriesDepth));
}

export function netToString(n: Net, top = true): string {
  if (n.k === 'in') return n.name;
  if (n.k === 'ser') return n.parts.map((p) => netToString(p, false)).join('·');
  const s = n.parts.map((p) => netToString(p, false)).join(' + ');
  return top ? s : `(${s})`;
}

/** Truth table of the static CMOS gate whose pull-down network is `pdn`: output = NOT(pdn conducts). */
export function gateTable(pdn: Net, inputs = inputsOf(pdn)): { env: Record<string, number>; out: number }[] {
  return Array.from({ length: 2 ** inputs.length }, (_, r) => {
    const env = Object.fromEntries(inputs.map((name, i) => [name, (r >> (inputs.length - 1 - i)) & 1]));
    return { env, out: conducts(pdn, env) ? 0 : 1 };
  });
}

// ───────────────────────── Transients ─────────────────────────

export interface Transient {
  t: number[];
  vin: number[];
  vout: number[];
  /** Propagation delay from the input's 50 % crossing to the output's, s. */
  tpd: number;
  /** Energy drawn from the supply during the transition, J. */
  energy: number;
}

/**
 * An inverter's output falling as its input rises in a ramp of duration `rise`, driving capacitance `c` (F).
 * Euler integration of C dV/dt = I_up − I_down.
 */
export function fallingTransient(inv: Inverter, c: number, rise = 10e-12, tEnd?: number): Transient {
  const iMax = currents(inv, inv.vdd, inv.vdd).down;
  const dt = Math.max(1e-16, (c * inv.vdd) / iMax / 400);
  const end = tEnd ?? Math.max(rise * 3, (c * inv.vdd) / iMax * 8);
  let v = vout(inv, 0);
  const t: number[] = [];
  const vin: number[] = [];
  const vo: number[] = [];
  let tIn = NaN;
  let tOut = NaN;
  let energy = 0;
  const every = Math.max(1, Math.round(end / dt / 300));
  for (let k = 0, time = 0; time <= end; k++, time += dt) {
    const x = Math.min(inv.vdd, (time / rise) * inv.vdd);
    const { down, up } = currents(inv, x, v);
    energy += up * inv.vdd * dt;
    const next = v + ((up - down) * dt) / c;
    if (Number.isNaN(tIn) && x >= inv.vdd / 2) tIn = time;
    if (Number.isNaN(tOut) && v > inv.vdd / 2 && next <= inv.vdd / 2) tOut = time;
    v = Math.max(0, Math.min(inv.vdd, next));
    if (k % every === 0) {
      t.push(time);
      vin.push(x);
      vo.push(v);
    }
  }
  return { t, vin, vout: vo, tpd: tOut - tIn, energy };
}

/** The course's unit inverter: input capacitance and output (parasitic) capacitance, F. */
export const C_UNIT = 1e-15;
export const C_PARASITIC = 1e-15;

/** Delay (s) of the unit inverter with supply `vdd` driving `fanout` copies of itself. */
export function inverterDelay(fanout: number, vdd = 1.0, rise = 10e-12): number {
  return fallingTransient({ ...INVERTER, vdd }, C_PARASITIC + fanout * C_UNIT, rise).tpd;
}

// ───────────────────────── Sizing a chain ─────────────────────────

/** Delay of a chain of N inverters driving a load H times its input, in units of τ: N(H^(1/N) + p). */
export function chainDelay(h: number, stages: number, parasitic = 1): number {
  return stages * (h ** (1 / stages) + parasitic);
}

export function bestStages(h: number, parasitic = 1, max = 20): number {
  let best = 1;
  for (let n = 2; n <= max; n++) if (chainDelay(h, n, parasitic) < chainDelay(h, best, parasitic)) best = n;
  return best;
}

// ───────────────────────── The 6T SRAM cell ─────────────────────────

export interface SramSizes {
  /** Pull-down nMOS width, relative to the access transistor (the cell ratio). */
  pullDown: number;
  /** Pull-up pMOS width, relative to the access transistor. */
  pullUp: number;
}

export interface SramTrace {
  t: number[];
  q: number[];
  qb: number[];
  bl: number[];
  blb: number[];
  /** The stored value at the end (1 if Q is high). */
  stored: number;
}

const C_NODE = 0.4e-15;
const C_BITLINE = 20e-15;

/**
 * Simulate an operation on a 6T cell storing `q0` (Q = q0·V_DD, Q̄ its complement). For a read, both bitlines
 * start precharged to V_DD and float; for a write of `value`, BL and BL̄ are driven to value and its complement.
 * The word line rises at 10 ps and falls at 150 ps; the trace ends at 250 ps.
 *
 * `mismatch` (V) models random variation in the worst direction for a read of a stored 0: the pull-down that
 * holds Q low has its threshold raised by it, and the opposite pull-down has its threshold lowered by it.
 */
export function sram(op: 'read' | 'write', sizes: SramSizes, q0: number, value = 0, vdd = 1.0, mismatch = 0): SramTrace {
  const acc = NFET;
  const weak = q0 ? -mismatch : mismatch;
  const pdQ = { ...scaled(NFET, sizes.pullDown), vt: NFET.vt + weak };
  const pdQb = { ...scaled(NFET, sizes.pullDown), vt: NFET.vt - weak };
  const pu = scaled(PFET, sizes.pullUp);
  let q = q0 ? vdd : 0;
  let qb = vdd - q;
  let bl = op === 'read' ? vdd : value ? vdd : 0;
  let blb = op === 'read' ? vdd : value ? 0 : vdd;
  const dt = 0.05e-12;
  const out: SramTrace = { t: [], q: [], qb: [], bl: [], blb: [], stored: 0 };
  for (let k = 0, time = 0; time <= 250e-12; k++, time += dt) {
    const wl = time > 10e-12 && time < 150e-12 ? vdd : 0;
    // Inverter driving Q from Q̄, and Q̄ from Q.
    const iq = drainCurrent(pu, vdd - qb, vdd - q) - drainCurrent(pdQ, qb, q);
    const iqb = drainCurrent(pu, vdd - q, vdd - qb) - drainCurrent(pdQb, q, qb);
    // Access transistors: current from the bitline into the node (source taken at the node).
    const aq = drainCurrent(acc, wl - q, bl - q);
    const aqb = drainCurrent(acc, wl - qb, blb - qb);
    q += ((iq + aq) * dt) / C_NODE;
    qb += ((iqb + aqb) * dt) / C_NODE;
    if (op === 'read') {
      bl -= (aq * dt) / C_BITLINE;
      blb -= (aqb * dt) / C_BITLINE;
    }
    q = Math.max(0, Math.min(vdd, q));
    qb = Math.max(0, Math.min(vdd, qb));
    if (k % 20 === 0) {
      out.t.push(time);
      out.q.push(q);
      out.qb.push(qb);
      out.bl.push(bl);
      out.blb.push(blb);
    }
  }
  out.stored = q > qb ? 1 : 0;
  return out;
}

// ───────────────────────── Two inverters in a loop ─────────────────────────

/** An inverter's static curve with small-signal gain `g` at its midpoint (a smooth model, V_DD = 1). */
export const tanhInverter = (g: number) => (v: number) => 0.5 * (1 - Math.tanh(2 * g * (v - 0.5)));

/**
 * Two identical inverters in a loop, each output a node with time constant τ: dx/dt = (f(y) − x)/τ and
 * dy/dt = (f(x) − y)/τ. Returns the trajectory from (x0, y0) and the time (in units of τ) until both nodes are
 * within 5 % of a stable state. Near the middle the difference x − y grows as e^((g−1)t/τ), so every factor of
 * ten closer to the middle adds τ ln 10 / (g − 1).
 */
export function latchSettle(gain: number, x0: number, y0: number, maxT = 60): { path: [number, number][]; settle: number } {
  const f = tanhInverter(gain);
  let x = x0;
  let y = y0;
  const dt = 0.005;
  const path: [number, number][] = [[x, y]];
  let settle = maxT;
  const hi = f(0);
  const lo = f(1);
  for (let k = 1, t = dt; t < maxT; k++, t += dt) {
    const nx = x + (f(y) - x) * dt;
    const ny = y + (f(x) - y) * dt;
    x = nx;
    y = ny;
    if (k % 10 === 0) path.push([x, y]);
    const near = (a: number, b: number) => Math.abs(a - b) < 0.05;
    if ((near(x, hi) && near(y, lo)) || (near(x, lo) && near(y, hi))) {
      settle = t;
      path.push([x, y]);
      break;
    }
  }
  return { path, settle };
}

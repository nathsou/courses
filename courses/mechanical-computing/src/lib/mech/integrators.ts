/**
 * Integrating machines: the wheel-and-disc integrator, the polar planimeter and the tide predictor.
 *
 * Wheel and disc: a wheel of radius ρ rests on a turning disc at distance y from its centre. When the disc
 * turns by dx radians, the disc's surface under the wheel moves y·dx, and the wheel turns by y·dx/ρ. Over a
 * run, the wheel's total turn is (1/ρ)∫ y dx: the machine integrates y with respect to x.
 *
 * Polar planimeter: a pole arm (length R, about a fixed pole) and a tracer arm (length L) hinged together.
 * A measuring wheel on the tracer arm rolls only in the direction perpendicular to the arm. Trace round a
 * closed curve (pole outside it) and the wheel's roll s gives the area: A = L·s.
 *
 * Tide predictor: the height of the tide is a sum of cosines, one per tidal constituent, each with the period
 * set by the Moon and Sun. Kelvin's machine added them with pulleys and a wire.
 */

export interface Point {
  x: number;
  y: number;
}

/** Integrate y(x) by the wheel-and-disc rule, step by step; returns the wheel's turns (in radians). */
export function wheelDisc(y: (x: number) => number, x0: number, x1: number, rho: number, steps = 1000): number {
  let s = 0;
  const h = (x1 - x0) / steps;
  for (let i = 0; i < steps; i++) s += y(x0 + (i + 0.5) * h) * h;
  return s / rho;
}

/** Where the elbow of a polar planimeter is when the tracer is at p (the elbow on the given side). */
export function elbow(pole: Point, p: Point, R: number, L: number, side = 1): Point | null {
  const dx = p.x - pole.x, dy = p.y - pole.y;
  const d = Math.hypot(dx, dy);
  if (d > R + L || d < Math.abs(R - L)) return null;
  const a = (R * R - L * L + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, R * R - a * a));
  const mx = pole.x + (a * dx) / d, my = pole.y + (a * dy) / d;
  return { x: mx - (side * h * dy) / d, y: my + (side * h * dx) / d };
}

/**
 * Trace a closed path with a polar planimeter; returns the measuring wheel's roll at each sample (cumulative)
 * and the elbow positions. The wheel sits on the tracer arm at distance `w` from the elbow.
 */
export function planimeter(pole: Point, path: Point[], R: number, L: number, w = 0.5): { roll: number[]; elbows: Point[] } {
  const roll: number[] = [0];
  const elbows: Point[] = [];
  let prevWheel: Point | null = null;
  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    const e = elbow(pole, p, R, L);
    if (!e) throw new Error('the tracer is out of reach of the arms');
    elbows.push(e);
    const ux = (p.x - e.x) / L, uy = (p.y - e.y) / L; // along the tracer arm
    const wheel = { x: e.x + ux * w, y: e.y + uy * w };
    if (prevWheel) {
      // The wheel rolls with the motion perpendicular to the arm (normal = arm turned +90°).
      const nx = -uy, ny = ux;
      const ds = (wheel.x - prevWheel.x) * nx + (wheel.y - prevWheel.y) * ny;
      roll.push(roll.at(-1)! + ds);
    }
    prevWheel = wheel;
  }
  return { roll, elbows };
}

/** Area of a closed polygon (shoelace formula), positive when counter-clockwise. */
export function polygonArea(path: Point[]): number {
  let a = 0;
  for (let i = 0; i < path.length; i++) {
    const p = path[i]!, q = path[(i + 1) % path.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** Densify a polygon into a closed path of small steps. */
export function densify(poly: Point[], step = 0.02): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!, q = poly[(i + 1) % poly.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / step));
    for (let k = 0; k < n; k++) out.push({ x: p.x + ((q.x - p.x) * k) / n, y: p.y + ((q.y - p.y) * k) / n });
  }
  out.push({ ...poly[0]! });
  return out;
}

/** Tidal constituents: name, period in hours, and a description. */
export const CONSTITUENTS = [
  { id: 'M2', period: 12.4206, what: 'principal lunar, twice a day' },
  { id: 'S2', period: 12.0, what: 'principal solar, twice a day' },
  { id: 'N2', period: 12.6583, what: 'lunar elliptic: the Moon’s changing distance' },
  { id: 'K1', period: 23.9345, what: 'lunisolar, once a day' },
  { id: 'O1', period: 25.8193, what: 'principal lunar, once a day' },
] as const;

export type ConstituentId = (typeof CONSTITUENTS)[number]['id'];

/** Height of the tide at time t hours: Σ A cos(2πt/T − φ). */
export function tide(t: number, amp: Record<string, number>, phase: Record<string, number> = {}): number {
  let h = 0;
  for (const c of CONSTITUENTS) h += (amp[c.id] ?? 0) * Math.cos((2 * Math.PI * t) / c.period - (phase[c.id] ?? 0));
  return h;
}

/** Period of the beat between two constituents (spring–neap cycle for M2 and S2), in hours. */
export function beat(p1: number, p2: number): number {
  return 1 / Math.abs(1 / p1 - 1 / p2);
}

/**
 * The harmonic analyser's job: from a record h(t) over a span, the amplitude of the component of period T,
 * by integrating h·cos and h·sin (each with a wheel-and-disc integrator).
 */
export function analyse(h: (t: number) => number, T: number, span: number, steps = 20000): { amp: number; phase: number } {
  let c = 0, s = 0;
  const dt = span / steps;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) * dt;
    c += h(t) * Math.cos((2 * Math.PI * t) / T) * dt;
    s += h(t) * Math.sin((2 * Math.PI * t) / T) * dt;
  }
  c *= 2 / span;
  s *= 2 / span;
  return { amp: Math.hypot(c, s), phase: Math.atan2(s, c) };
}

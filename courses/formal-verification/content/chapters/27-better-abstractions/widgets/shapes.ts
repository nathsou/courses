/**
 * Plane geometry for the domain comparison (chapter 27): the region an abstract state describes for two variables
 * (a box for intervals, an octagon), as a convex polygon clipped to a viewing window; the convex hull of a set of
 * points (the smallest polyhedron containing them); and whether a polygon lies inside a half-plane.
 */
export type Pt = [number, number];
/** a·x + b·y ≤ c */
export interface HalfPlane {
  a: number;
  b: number;
  c: number;
}

/** Clip a convex polygon by a half-plane (Sutherland–Hodgman). */
export function clip(poly: Pt[], h: HalfPlane): Pt[] {
  const inside = (p: Pt) => h.a * p[0] + h.b * p[1] <= h.c + 1e-9;
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    const ip = inside(p);
    const iq = inside(q);
    if (ip) out.push(p);
    if (ip !== iq) {
      const dp = h.a * p[0] + h.b * p[1] - h.c;
      const dq = h.a * q[0] + h.b * q[1] - h.c;
      const t = dp / (dp - dq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

export function region(planes: HalfPlane[], window: [number, number, number, number]): Pt[] {
  const [x0, y0, x1, y1] = window;
  let poly: Pt[] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  for (const h of planes) poly = clip(poly, h);
  return poly;
}

/** Monotone-chain convex hull. */
export function hull(points: Pt[]): Pt[] {
  const ps = [...new Map(points.map((p) => [`${p[0]},${p[1]}`, p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (ps.length < 3) return ps;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of ps) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (const p of [...ps].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * The half-planes of an abstract state over x and y, from the analyser's display: intervals "[lo, hi]" or a
 * constant, and relations such as "x ≤ y + 2", "x < y", "x = y − 1", "x + y ≤ 10", "x + y ≥ 3".
 */
export function planesOf(vars: Record<string, string>, relations: string[], x: string, y: string): { planes: HalfPlane[]; bounded: boolean } {
  const planes: HalfPlane[] = [];
  let bounded = true;
  const bound = (name: string, a: number, b: number) => {
    const v = vars[name];
    if (v === undefined) return (bounded = false);
    const single = /^(-?\d+)$/.exec(v);
    const m = /^\[(−∞|-?\d+), (\+∞|-?\d+)\]$/.exec(v);
    const lo = single ? Number(single[1]) : m && m[1] !== '−∞' ? Number(m[1]) : undefined;
    const hi = single ? Number(single[1]) : m && m[2] !== '+∞' ? Number(m[2]) : undefined;
    if (hi !== undefined) planes.push({ a, b, c: hi });
    else bounded = false;
    if (lo !== undefined) planes.push({ a: -a, b: -b, c: -lo });
    else bounded = false;
    return true;
  };
  bound(x, 1, 0);
  bound(y, 0, 1);
  const num = (s: string) => Number(s.replace('−', '-').replace(/\s/g, ''));
  for (const r of relations) {
    const t = r.replace(/−/g, '-');
    for (const [p, q, sx, sy] of [
      [x, y, 1, -1],
      [y, x, -1, 1],
    ] as const) {
      const esc = (s: string) => s.replace(/[|]/g, '\\|');
      let m = new RegExp(`^${esc(p)} ([<≤=]) ${esc(q)}(?: ([+-]) (\\d+))?$`).exec(t);
      if (m) {
        const k = m[2] ? (m[2] === '-' ? -Number(m[3]) : Number(m[3])) : 0;
        // p − q ≤ k (or < k: ≤ k − 1; = k: both ways)
        const c = m[1] === '<' ? k - 1 : k;
        planes.push({ a: sx, b: sy, c });
        if (m[1] === '=') planes.push({ a: -sx, b: -sy, c: -k });
      }
      m = new RegExp(`^${esc(p)} \\+ ${esc(q)} ([≤≥]) (-?\\d+)$`).exec(t);
      if (m && p === x) {
        if (m[1] === '≤') planes.push({ a: 1, b: 1, c: num(m[2]!) });
        else planes.push({ a: -1, b: -1, c: -num(m[2]!) });
      }
    }
  }
  return { planes, bounded };
}

export const insideAll = (poly: Pt[], h: HalfPlane) => poly.length > 0 && poly.every((p) => h.a * p[0] + h.b * p[1] <= h.c + 1e-9);

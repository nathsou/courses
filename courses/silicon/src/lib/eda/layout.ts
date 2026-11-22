/**
 * Layout of the CMOS inverter as rectangles on five layers, in λ units (half the smallest drawable feature, in the
 * style of Mead and Conway's scalable rules), with y increasing downwards. Design-rule checking (DRC) checks the
 * geometry against minimum widths, spacings, extensions and enclosures; layout-versus-schematic (LVS) extracts
 * the transistors (where poly crosses active) and their connections, and compares them with an inverter.
 */

export type Layer = 'nwell' | 'active' | 'poly' | 'contact' | 'metal1';
export const LAYERS: Layer[] = ['nwell', 'active', 'poly', 'contact', 'metal1'];

export interface Rect {
  id: string;
  layer: Layer;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Label {
  name: 'VDD' | 'GND' | 'IN' | 'OUT';
  x: number;
  y: number;
}

export interface Layout {
  w: number;
  h: number;
  rects: Rect[];
  labels: Label[];
}

const r = (id: string, layer: Layer, x0: number, y0: number, x1: number, y1: number): Rect => ({ id, layer, x0, y0, x1, y1 });

/** A correct inverter: pMOS on top in the n-well, nMOS below, a vertical poly gate shared by both. */
export const INVERTER_LAYOUT: Layout = {
  w: 32,
  h: 44,
  rects: [
    r('nwell', 'nwell', 0, 0, 32, 20),
    r('p-active', 'active', 6, 8, 26, 15),
    r('n-active', 'active', 6, 27, 26, 33),
    r('gate', 'poly', 14, 6, 16, 35),
    r('poly-pad', 'poly', 9, 20, 16, 26),
    r('c-in', 'contact', 10, 22, 12, 24),
    r('c-vdd', 'contact', 8, 10, 10, 12),
    r('c-pout', 'contact', 20, 10, 22, 12),
    r('c-nout', 'contact', 20, 29, 22, 31),
    r('c-gnd', 'contact', 8, 29, 10, 31),
    r('vdd-rail', 'metal1', 0, 1, 32, 5),
    r('gnd-rail', 'metal1', 0, 39, 32, 43),
    r('vdd-strap', 'metal1', 7, 1, 11, 13),
    r('gnd-strap', 'metal1', 7, 28, 11, 43),
    r('out', 'metal1', 19, 9, 23, 32),
    r('out-pin', 'metal1', 19, 18, 30, 22),
    r('in-pin', 'metal1', 2, 21, 13, 25),
  ],
  labels: [
    { name: 'VDD', x: 28, y: 3 },
    { name: 'GND', x: 28, y: 41 },
    { name: 'IN', x: 3, y: 23 },
    { name: 'OUT', x: 28, y: 20 },
  ],
};

/** The same inverter with four design-rule errors (and so an LVS error too), for the reader to fix. */
export const BUGGY_INVERTER_LAYOUT: Layout = {
  ...INVERTER_LAYOUT,
  rects: INVERTER_LAYOUT.rects.map((x) => {
    if (x.id === 'gate') return { ...x, y1: 34 };
    if (x.id === 'gnd-strap') return { ...x, y0: 27 };
    if (x.id === 'vdd-strap') return { ...x, y1: 10 };
    if (x.id === 'nwell') return { ...x, y1: 17 };
    return x;
  }),
};

export interface Rule {
  id: string;
  text: string;
}

export const RULES: Rule[] = [
  { id: 'width', text: 'Minimum width: active 3λ, poly 2λ, metal 1 3λ.' },
  { id: 'spacing', text: 'Minimum spacing between separate shapes on one layer: active 3λ, poly 2λ, metal 1 3λ, contact 2λ.' },
  { id: 'endcap', text: 'Poly must extend at least 2λ beyond the active it crosses (the gate end cap).' },
  { id: 'sd', text: 'Active must extend at least 3λ beyond each side of a gate (room for the source and drain).' },
  { id: 'contact-size', text: 'Contacts are exactly 2λ × 2λ.' },
  { id: 'contact-under', text: 'A contact must sit on active or poly, enclosed by at least 1λ.' },
  { id: 'contact-metal', text: 'A contact must be covered by metal 1, enclosed by at least 1λ.' },
  { id: 'contact-gate', text: 'A contact on active must be at least 2λ from a gate.' },
  { id: 'well', text: 'The n-well must enclose p-type active (inside it) by 3λ, and stay 3λ from n-type active (outside it).' },
];

const MIN_WIDTH: Partial<Record<Layer, number>> = { active: 3, poly: 2, metal1: 3 };
const MIN_SPACE: Partial<Record<Layer, number>> = { active: 3, poly: 2, metal1: 3, contact: 2 };

export interface Violation {
  rule: string;
  message: string;
  rects: string[];
  /** Where to draw the marker. */
  at: { x0: number; y0: number; x1: number; y1: number };
}

const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const touches = (a: Rect, b: Rect) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
const inside = (a: Rect, b: Rect, m = 0) => a.x0 >= b.x0 + m && a.x1 <= b.x1 - m && a.y0 >= b.y0 + m && a.y1 <= b.y1 - m;
const gap = (a: Rect, b: Rect) => {
  const dx = Math.max(0, b.x0 - a.x1, a.x0 - b.x1);
  const dy = Math.max(0, b.y0 - a.y1, a.y0 - b.y1);
  return Math.hypot(dx, dy);
};
const box = (rs: Rect[]) => ({ x0: Math.min(...rs.map((x) => x.x0)), y0: Math.min(...rs.map((x) => x.y0)), x1: Math.max(...rs.map((x) => x.x1)), y1: Math.max(...rs.map((x) => x.y1)) });

/** Groups of shapes on one layer that touch or overlap (connected components). */
function components(rs: Rect[]): Rect[][] {
  const parent = rs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (touches(rs[i]!, rs[j]!)) parent[find(i)] = find(j);
  const groups = new Map<number, Rect[]>();
  rs.forEach((x, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), x]));
  return [...groups.values()];
}

/** Gates: the intersection of each poly shape with each active shape it crosses, with the channel direction. */
export function gates(l: Layout): { poly: Rect; active: Rect; region: Rect; vertical: boolean }[] {
  const out: { poly: Rect; active: Rect; region: Rect; vertical: boolean }[] = [];
  for (const p of l.rects.filter((x) => x.layer === 'poly'))
    for (const a of l.rects.filter((x) => x.layer === 'active')) {
      if (!overlaps(p, a)) continue;
      const region: Rect = { id: `${p.id}×${a.id}`, layer: 'poly', x0: Math.max(p.x0, a.x0), y0: Math.max(p.y0, a.y0), x1: Math.min(p.x1, a.x1), y1: Math.min(p.y1, a.y1) };
      // A poly line crossing active: vertical if it spans the active's height, horizontal if its width.
      const vertical = p.y0 <= a.y0 && p.y1 >= a.y1 ? true : p.x0 <= a.x0 && p.x1 >= a.x1 ? false : p.y1 - p.y0 >= p.x1 - p.x0;
      out.push({ poly: p, active: a, region, vertical });
    }
  return out;
}

export function drc(l: Layout): Violation[] {
  const v: Violation[] = [];
  const of = (layer: Layer) => l.rects.filter((x) => x.layer === layer);
  for (const x of l.rects) {
    const min = MIN_WIDTH[x.layer];
    if (min && Math.min(x.x1 - x.x0, x.y1 - x.y0) < min) v.push({ rule: 'width', message: `${x.layer} narrower than ${min}λ`, rects: [x.id], at: x });
  }
  for (const layer of LAYERS) {
    const min = MIN_SPACE[layer];
    if (!min) continue;
    const comps = components(of(layer));
    for (let i = 0; i < comps.length; i++)
      for (let j = i + 1; j < comps.length; j++)
        for (const a of comps[i]!)
          for (const b of comps[j]!) {
            const g = gap(a, b);
            if (g < min) v.push({ rule: 'spacing', message: `${layer} shapes ${g.toFixed(1)}λ apart (minimum ${min}λ)`, rects: [a.id, b.id], at: box([a, b]) });
          }
  }
  for (const g of gates(l)) {
    const { poly: p, active: a } = g;
    if (g.vertical) {
      if (p.y0 > a.y0 - 2 || p.y1 < a.y1 + 2) v.push({ rule: 'endcap', message: 'gate end cap shorter than 2λ', rects: [p.id, a.id], at: { x0: p.x0, y0: Math.min(p.y0, a.y0), x1: p.x1, y1: Math.max(p.y1, a.y1) } });
      if (a.x0 > p.x0 - 3 || a.x1 < p.x1 + 3) v.push({ rule: 'sd', message: 'active extends less than 3λ beside the gate', rects: [p.id, a.id], at: g.region });
    } else {
      if (p.x0 > a.x0 - 2 || p.x1 < a.x1 + 2) v.push({ rule: 'endcap', message: 'gate end cap shorter than 2λ', rects: [p.id, a.id], at: { x0: Math.min(p.x0, a.x0), y0: p.y0, x1: Math.max(p.x1, a.x1), y1: p.y1 } });
      if (a.y0 > p.y0 - 3 || a.y1 < p.y1 + 3) v.push({ rule: 'sd', message: 'active extends less than 3λ beside the gate', rects: [p.id, a.id], at: g.region });
    }
  }
  const gateRegions = gates(l).map((g) => g.region);
  for (const c of of('contact')) {
    if (c.x1 - c.x0 !== 2 || c.y1 - c.y0 !== 2) v.push({ rule: 'contact-size', message: 'contact is not 2λ × 2λ', rects: [c.id], at: c });
    const under = [...of('active'), ...of('poly')].some((x) => inside(c, x, 1));
    if (!under) v.push({ rule: 'contact-under', message: 'contact not enclosed by active or poly', rects: [c.id], at: c });
    if (!of('metal1').some((m) => inside(c, m, 1))) v.push({ rule: 'contact-metal', message: 'contact not covered by metal 1 with 1λ to spare', rects: [c.id], at: c });
    const onActive = of('active').some((a) => overlaps(c, a));
    for (const g of gateRegions) if (onActive && gap(c, g) < 2) v.push({ rule: 'contact-gate', message: 'contact closer than 2λ to a gate', rects: [c.id], at: box([c, g]) });
  }
  for (const a of of('active')) {
    const wells = of('nwell').filter((w) => overlaps(a, w));
    if (wells.length) {
      if (!wells.some((w) => inside(a, w, 3))) v.push({ rule: 'well', message: 'n-well encloses p-type active by less than 3λ', rects: [a.id, ...wells.map((w) => w.id)], at: a });
    } else
      for (const w of of('nwell')) if (gap(a, w) < 3) v.push({ rule: 'well', message: 'n-type active closer than 3λ to the n-well', rects: [a.id, w.id], at: box([a, w]) });
  }
  return v;
}

// ───────────────────────── Extraction and LVS ─────────────────────────

export interface Extracted {
  transistors: { type: 'n' | 'p'; gate: string; a: string; b: string }[];
  /** Net name (from labels, or n1, n2…) of every label. */
  nets: Record<string, string>;
}

/** Extract transistors and connectivity. Nodes: metal-1 shapes, poly shapes, and active split by gates. */
export function extract(l: Layout): Extracted {
  type Node = { key: string; rect: Rect; layer: 'metal1' | 'poly' | 'diff' };
  const nodes: Node[] = [];
  for (const x of l.rects) if (x.layer === 'metal1' || x.layer === 'poly') nodes.push({ key: x.id, rect: x, layer: x.layer });
  const gs = gates(l);
  // Split each active rectangle into diffusion pieces on either side of its gates.
  for (const a of l.rects.filter((x) => x.layer === 'active')) {
    const mine = gs.filter((g) => g.active === a);
    if (!mine.length) {
      nodes.push({ key: `${a.id}`, rect: a, layer: 'diff' });
      continue;
    }
    const vertical = mine[0]!.vertical;
    const cuts = mine.map((g) => (vertical ? [g.region.x0, g.region.x1] : [g.region.y0, g.region.y1])).sort((p, q) => p[0]! - q[0]!);
    let start = vertical ? a.x0 : a.y0;
    cuts.forEach(([c0, c1], k) => {
      if (c0! > start) nodes.push({ key: `${a.id}#${k}`, rect: vertical ? { ...a, x0: start, x1: c0! } : { ...a, y0: start, y1: c0! }, layer: 'diff' });
      start = c1!;
    });
    const end = vertical ? a.x1 : a.y1;
    if (end > start) nodes.push({ key: `${a.id}#${cuts.length}`, rect: vertical ? { ...a, x0: start } : { ...a, y0: start }, layer: 'diff' });
  }
  const parent = new Map(nodes.map((n) => [n.key, n.key]));
  const find = (k: string): string => (parent.get(k) === k ? k : find(parent.get(k)!));
  const join = (a: string, b: string) => parent.set(find(a), find(b));
  for (const a of nodes) for (const b of nodes) if (a !== b && a.layer === b.layer && a.layer !== 'diff' && touches(a.rect, b.rect)) join(a.key, b.key);
  // Contacts join metal 1 to the poly or diffusion beneath.
  for (const c of l.rects.filter((x) => x.layer === 'contact')) {
    const metals = nodes.filter((n) => n.layer === 'metal1' && overlaps(n.rect, c));
    const below = nodes.filter((n) => n.layer !== 'metal1' && overlaps(n.rect, c));
    for (const m of metals) for (const b of below) join(m.key, b.key);
  }
  const named = new Map<string, string>();
  for (const lab of l.labels) {
    const n = nodes.find((x) => x.layer === 'metal1' && lab.x >= x.rect.x0 && lab.x <= x.rect.x1 && lab.y >= x.rect.y0 && lab.y <= x.rect.y1);
    if (n) named.set(find(n.key), lab.name);
  }
  let k = 0;
  const netName = (key: string) => {
    const root = find(key);
    if (!named.has(root)) named.set(root, `n${++k}`);
    return named.get(root)!;
  };
  const wells = l.rects.filter((x) => x.layer === 'nwell');
  const transistors = gs.map((g) => {
    const sides = nodes.filter((n) => n.layer === 'diff' && n.key.startsWith(`${g.active.id}#`) && touches(n.rect, g.region));
    return {
      type: (wells.some((w) => overlaps(w, g.region)) ? 'p' : 'n') as 'n' | 'p',
      gate: netName(g.poly.id),
      a: sides[0] ? netName(sides[0].key) : '?',
      b: sides[1] ? netName(sides[1].key) : '?',
    };
  });
  const nets: Record<string, string> = {};
  for (const lab of l.labels) {
    const n = nodes.find((x) => x.layer === 'metal1' && lab.x >= x.rect.x0 && lab.x <= x.rect.x1 && lab.y >= x.rect.y0 && lab.y <= x.rect.y1);
    nets[lab.name] = n ? netName(n.key) : '(no metal under the label)';
  }
  return { transistors, nets };
}

/** Compare the extracted circuit with an inverter. Returns the differences (empty: LVS clean). */
export function lvsInverter(l: Layout): string[] {
  const e = extract(l);
  const problems: string[] = [];
  for (const name of ['VDD', 'GND', 'IN', 'OUT']) if (e.nets[name] !== name) problems.push(`${name} label is not on its own net (it is on ${e.nets[name]})`);
  const ns = e.transistors.filter((t) => t.type === 'n');
  const ps = e.transistors.filter((t) => t.type === 'p');
  if (ns.length !== 1) problems.push(`expected one nMOS transistor, found ${ns.length}`);
  if (ps.length !== 1) problems.push(`expected one pMOS transistor, found ${ps.length}`);
  const pair = (t: { a: string; b: string }, x: string, y: string) => (t.a === x && t.b === y) || (t.a === y && t.b === x);
  for (const t of ns) {
    if (t.gate !== 'IN') problems.push(`the nMOS gate is on ${t.gate}, not IN`);
    if (!pair(t, 'GND', 'OUT')) problems.push(`the nMOS connects ${t.a} and ${t.b}; it should connect GND and OUT`);
  }
  for (const t of ps) {
    if (t.gate !== 'IN') problems.push(`the pMOS gate is on ${t.gate}, not IN`);
    if (!pair(t, 'VDD', 'OUT')) problems.push(`the pMOS connects ${t.a} and ${t.b}; it should connect VDD and OUT`);
  }
  return problems;
}

/** The layers crossed by a horizontal cut at height y: intervals along x, for drawing cross-sections and masks. */
export function cutAt(l: Layout, y: number): Record<Layer, [number, number][]> {
  const out = Object.fromEntries(LAYERS.map((k) => [k, [] as [number, number][]])) as Record<Layer, [number, number][]>;
  for (const x of l.rects) if (y > x.y0 && y < x.y1) out[x.layer].push([x.x0, x.x1]);
  for (const k of LAYERS) {
    const s = out[k].sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const iv of s) {
      const last = merged.at(-1);
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
      else merged.push([...iv]);
    }
    out[k] = merged;
  }
  return out;
}

/**
 * A cross-section process simulator. The wafer is a row of thin vertical columns; each has a silicon surface
 * height, the doping of its silicon, and a stack of films on top. Operations act on every column: deposit a film,
 * coat and expose resist through a mask, develop, etch the topmost material straight down, implant (blocked by
 * resist, by poly, or by thick films), grow oxide on bare silicon, polish to a height. It draws the classic
 * textbook cross-section of a CMOS inverter, with every mask taken from the layout of chapter 12.
 *
 * Simplifications (Appendix B): etches are perfectly anisotropic, deposits are planar on each column (no
 * sidewall coverage), there are no spacers, lightly doped drains, silicide or well taps, and vertical sizes are
 * not to scale.
 */
import { INVERTER_LAYOUT, cutAt, type Layer } from '../eda/layout';

export type Material = 'oxide' | 'nitride' | 'poly' | 'resist' | 'tungsten' | 'copper';

export interface Film {
  mat: Material;
  t: number;
  /** Resist only: exposed to light (dissolves in the developer). */
  exposed?: boolean;
}

export interface Column {
  si: number;
  well: 'p' | 'n';
  sd: null | 'n+' | 'p+';
  stack: Film[];
}

export const COLS_PER_LAMBDA = 4;
export const WIDTH = 64; // λ: the pMOS cut, then the nMOS cut

export type Interval = [number, number];

/** The masks, from the inverter's layout: a cut through the pMOS (y = 11.5λ) beside a cut through the nMOS (y = 30λ). */
export function masks(): Record<'active' | 'nwell' | 'poly' | 'nplus' | 'pplus' | 'contact' | 'metal1', Interval[]> {
  const p = cutAt(INVERTER_LAYOUT, 11.5);
  const n = cutAt(INVERTER_LAYOUT, 30);
  const both = (layer: Layer) => [...p[layer], ...n[layer].map(([a, b]) => [a + 32, b + 32] as Interval)];
  return {
    active: both('active'),
    nwell: p.nwell,
    poly: both('poly'),
    nplus: n.active.map(([a, b]) => [a + 32, b + 32] as Interval),
    pplus: p.active,
    contact: both('contact'),
    metal1: both('metal1'),
  };
}

export class Wafer {
  cols: Column[];
  constructor() {
    this.cols = Array.from({ length: WIDTH * COLS_PER_LAMBDA }, () => ({ si: 0, well: 'p' as const, sd: null, stack: [] }));
  }
  clone(): Wafer {
    const w = new Wafer();
    w.cols = this.cols.map((c) => ({ ...c, stack: c.stack.map((f) => ({ ...f })) }));
    return w;
  }
  x(i: number): number {
    return (i + 0.5) / COLS_PER_LAMBDA;
  }
  height(c: Column): number {
    return c.si + c.stack.reduce((s, f) => s + f.t, 0);
  }
  private inside(i: number, ivs: Interval[]): boolean {
    const x = this.x(i);
    return ivs.some(([a, b]) => x > a && x < b);
  }

  deposit(mat: Material, t: number): this {
    for (const c of this.cols) {
      const top = c.stack.at(-1);
      if (top && top.mat === mat && !top.exposed) top.t += t;
      else c.stack.push({ mat, t });
    }
    return this;
  }
  /** Expose resist where the mask is clear: inside the intervals, or outside them if `outside`. */
  expose(ivs: Interval[], outside = false): this {
    this.cols.forEach((c, i) => {
      const top = c.stack.at(-1);
      if (top?.mat === 'resist' && this.inside(i, ivs) !== outside) top.exposed = true;
    });
    return this;
  }
  develop(): this {
    for (const c of this.cols) if (c.stack.at(-1)?.mat === 'resist' && c.stack.at(-1)!.exposed) c.stack.pop();
    return this;
  }
  strip(): this {
    for (const c of this.cols) c.stack = c.stack.filter((f) => f.mat !== 'resist');
    return this;
  }
  /** Remove up to `depth` of material `mat` from the top of each column where it is the topmost film; 'si' cuts the silicon where it is bare. */
  etch(mat: Material | 'si', depth = Infinity): this {
    for (const c of this.cols) {
      if (mat === 'si') {
        if (!c.stack.length) c.si -= depth;
        continue;
      }
      let left = depth;
      while (left > 0 && c.stack.at(-1)?.mat === mat) {
        const top = c.stack.at(-1)!;
        const cut = Math.min(top.t, left);
        top.t -= cut;
        left -= cut;
        if (top.t <= 1e-9) c.stack.pop();
      }
    }
    return this;
  }
  /** Polish every column down to height h. */
  polish(h: number): this {
    for (const c of this.cols) {
      while (c.stack.length && this.height(c) > h + 1e-9) {
        const top = c.stack.at(-1)!;
        const excess = this.height(c) - h;
        if (top.t > excess) top.t -= excess;
        else c.stack.pop();
      }
    }
    return this;
  }
  /** Grow oxide of thickness t on bare silicon. */
  oxidize(t: number): this {
    for (const c of this.cols) if (!c.stack.length) c.stack.push({ mat: 'oxide', t });
    return this;
  }
  /** Implant: wells go through anything but resist; source/drain implants stop in resist, poly or thick films. */
  implant(kind: 'nwell' | 'n+' | 'p+'): this {
    for (const c of this.cols) {
      if (c.stack.some((f) => f.mat === 'resist')) continue;
      if (kind === 'nwell') {
        c.well = 'n';
        continue;
      }
      if (c.stack.some((f) => f.mat === 'poly') || c.stack.reduce((s, f) => s + f.t, 0) > 4) continue;
      c.sd = kind;
    }
    return this;
  }
  maxHeight(): number {
    return Math.max(...this.cols.map((c) => this.height(c)));
  }
  /** Height of the top of the topmost film of a material, in the first column that has it. */
  topOf(mat: Material): number {
    for (const c of this.cols) {
      let h = c.si;
      for (const f of c.stack) {
        h += f.t;
        if (f.mat === mat) return h;
      }
    }
    return NaN;
  }
}

export interface Step {
  title: string;
  text: string;
  /** The mask used, if any: its name and clear intervals (for drawing). */
  mask?: { name: string; layer: string; clear: Interval[]; inverted?: boolean };
  apply: (w: Wafer) => void;
}

/** The inverter's process flow, from bare wafer to first metal. */
export function inverterFlow(): Step[] {
  const m = masks();
  const lithoStep = (title: string, text: string, name: string, layer: string, ivs: Interval[], outside: boolean): Step => ({
    title,
    text,
    mask: { name, layer, clear: ivs, inverted: outside },
    apply: (w) => w.deposit('resist', 14).expose(ivs, outside).develop(),
  });
  return [
    { title: 'Start: a p-type wafer', text: 'A polished wafer of single-crystal silicon, lightly doped with boron throughout (chapter 13).', apply: () => {} },
    { title: 'Pad oxide and nitride', text: 'A thin layer of oxide is grown, then a layer of silicon nitride deposited on top. The nitride will protect the active regions and serve as a stop for polishing.', apply: (w) => w.oxidize(2).deposit('nitride', 7) },
    lithoStep('Mask 1: active regions', 'Resist is spun on and exposed everywhere except where transistors will go; the exposed resist dissolves in the developer.', 'Active', 'active', m.active, true),
    { title: 'Etch the isolation trenches', text: 'A plasma etch cuts through the nitride and oxide and into the silicon wherever the resist is gone, leaving islands of silicon under the resist.', apply: (w) => w.etch('nitride').etch('oxide').etch('si', 24) },
    { title: 'Strip the resist', text: 'The resist has done its job and is removed, by an oxygen plasma and a wet clean.', apply: (w) => w.strip() },
    { title: 'Fill the trenches with oxide', text: 'Oxide is deposited by CVD, filling the trenches and burying everything.', apply: (w) => w.deposit('oxide', 40) },
    { title: 'Polish down to the nitride', text: 'Chemical-mechanical polishing removes the oxide down to the top of the nitride, which polishes much more slowly and acts as a stop. Oxide remains only in the trenches: shallow trench isolation.', apply: (w) => w.polish(w.topOf('nitride')) },
    { title: 'Remove nitride and pad oxide', text: 'Hot phosphoric acid strips the nitride, a short dip in hydrofluoric acid the pad oxide. The active islands are bare silicon, ringed by oxide.', apply: (w) => w.etch('nitride').etch('oxide', 2) },
    lithoStep('Mask 2: the n-well', 'Resist again, exposed over the region where the pMOS transistor will sit.', 'N-well', 'nwell', m.nwell, false),
    { title: 'Implant the n-well', text: 'High-energy phosphorus ions pass through the oxide but not the resist, making a deep n-type well in the p-type wafer. (A p-well implant into the nMOS region, done the same way, is left out here.)', apply: (w) => w.implant('nwell') },
    { title: 'Strip the resist and anneal', text: 'The resist is removed, and an anneal repairs the crystal and spreads the well’s phosphorus.', apply: (w) => w.strip() },
    { title: 'Grow the gate oxide', text: 'The thinnest and most critical layer of all: a gate dielectric a nanometre or two thick, grown on the bare silicon of the active regions (in modern processes, a thin oxide topped with a high-k film by ALD).', apply: (w) => w.oxidize(1.5) },
    { title: 'Deposit the gate', text: 'Polysilicon is deposited over everything (in modern processes, a temporary placeholder later replaced by metal).', apply: (w) => w.deposit('poly', 10) },
    lithoStep('Mask 3: the gates', 'The most demanding exposure of the front end: resist is exposed everywhere except the gate lines, the narrowest features on the chip.', 'Poly', 'poly', m.poly, true),
    { title: 'Etch the gates', text: 'A plasma etch removes the polysilicon wherever the resist is gone, stopping on the thin gate oxide without breaking through it.', apply: (w) => w.etch('poly') },
    { title: 'Strip the resist', text: 'Two gate lines are left, one across each active island.', apply: (w) => w.strip() },
    lithoStep('Mask 4: n⁺ select', 'Resist exposed over the nMOS active region only.', 'N select', 'active (nMOS)', m.nplus, false),
    { title: 'Implant the nMOS source and drain', text: 'Arsenic ions dope the silicon n⁺ on both sides of the nMOS gate. The gate itself blocks them, so the source and drain line up with it exactly: they are self-aligned.', apply: (w) => w.implant('n+').strip() },
    lithoStep('Mask 5: p⁺ select', 'Resist exposed over the pMOS active region only.', 'P select', 'active (pMOS)', m.pplus, false),
    { title: 'Implant the pMOS source and drain, and anneal', text: 'Boron makes the pMOS source and drain p⁺, again self-aligned to its gate. A very short, very hot anneal activates both implants. Both transistors now exist.', apply: (w) => w.implant('p+').strip() },
    { title: 'Bury it in glass', text: 'A thick insulating layer of oxide (the pre-metal dielectric) is deposited and polished flat. The front end of the line is finished; the back end, the wiring, begins.', apply: (w) => {
        const h = w.maxHeight();
        w.deposit('oxide', 40).polish(h + 22);
      } },
    lithoStep('Mask 6: contacts', 'Resist exposed where the contacts will go: on the sources and drains (and, out of this cut, on the gate).', 'Contact', 'contact', m.contact, false),
    { title: 'Etch the contact holes', text: 'A plasma etch drills through the oxide down to the silicon.', apply: (w) => w.etch('oxide').strip() },
    { title: 'Fill the contacts with tungsten', text: 'Tungsten is deposited by CVD, which fills narrow holes well, then polished back so that it remains only in the holes: contact plugs.', apply: (w) => {
        const h = w.maxHeight();
        w.deposit('tungsten', 30).polish(h);
      } },
    { title: 'Deposit the metal-1 dielectric', text: 'Another layer of oxide (in real processes a porous low-k glass) for the first metal’s trenches.', apply: (w) => w.deposit('oxide', 12) },
    lithoStep('Mask 7: metal 1', 'Resist exposed where the first-level wires will run.', 'Metal 1', 'metal1', m.metal1, false),
    { title: 'Etch the wire trenches', text: 'The trenches are etched through the oxide, stopping on the tungsten plugs and the oxide below.', apply: (w) => w.etch('oxide', 12).strip() },
    { title: 'Copper, then polish: damascene', text: 'A thin barrier and a copper seed are sputtered, the trenches are filled by electroplating copper, and polishing removes the copper on top. The wires sit inlaid in the glass, like the metalwork of Damascus that gave the process its name. Above this, the loop repeats for every metal layer.', apply: (w) => {
        const h = w.maxHeight();
        w.deposit('copper', 20).polish(h);
      } },
  ];
}

/** The wafer after the first n steps of the flow. */
export function waferAfter(n: number, flow = inverterFlow()): Wafer {
  const w = new Wafer();
  for (const s of flow.slice(0, n + 1)) s.apply(w);
  return w;
}

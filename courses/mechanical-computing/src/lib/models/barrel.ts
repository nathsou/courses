/**
 * A barrel of the Analytical Engine's mill: a drum with studs set in rows. At each step the barrel turns by
 * one row; every stud in the row at the top lifts the lever resting above it, and each lever starts one
 * action in the mill. A row is one microinstruction; the barrel is the microprogram.
 */
import { box, Builder, cylinderZ, merge } from '$lib/gl/mesh';
import { TAU } from '$lib/gl/math';
import { nodeIndex, part, type ModelDef, type NodeDef } from '$lib/gl/model';
import { LEVERS, type BarrelRow } from '$lib/mech/carry';
import { fixed } from './util';

export const ROWS = 12;
const R = 1.25;
const LEN = 7.2;
const COLS = LEVERS.length;
const colX = (c: number) => -LEN / 2 + 0.6 + (c * (LEN - 1.2)) / (COLS - 1);
const STEP = TAU / ROWS;

export interface BarrelView {
  /** Barrel position in rows (fractional while turning). */
  pos: number;
}

/** Lift of the lever in column c when the barrel is at `pos`: a stud under it at the top lifts it. */
export function leverLift(rows: BarrelRow[], c: number, pos: number): number {
  let lift = 0;
  rows.forEach((row, r) => {
    if (!row.levers.includes(c)) return;
    let d = pos - r;
    d -= Math.round(d / ROWS) * ROWS;
    lift = Math.max(lift, Math.max(0, 1 - Math.abs(d) * 2.2));
  });
  return lift;
}

export function barrelModel(rows: BarrelRow[], key: string): ModelDef<BarrelView> {
  const meshes: ModelDef['meshes'] = {
    drum: () => {
      const b = new Builder();
      // Drum along x (built along z, then axes swapped below).
      b.append(cylinderZ(R, LEN, 64));
      // Raised rings between the lever columns, so the stud tracks read clearly.
      for (let c = 0; c <= COLS; c++) {
        const x = c === 0 ? -LEN / 2 + 0.15 : c === COLS ? LEN / 2 - 0.15 : (colX(c - 1) + colX(c)) / 2;
        b.append(cylinderZ(R + 0.04, 0.06, 64), 0, 0, x);
      }
      rows.forEach((row, r) => {
        // Row r reaches the top (angle π/2 about the drum axis) when the barrel has turned r rows.
        const a = Math.PI / 2 - r * STEP;
        for (const c of row.levers) {
          const stud = cylinderZ(0.17, 0.4, 14);
          const at = b.count;
          b.append(stud);
          // Point the stud radially: rotate its z axis onto the radius at angle a, place it at column c.
          for (let k = at * 3; k < b.p.length; k += 3) {
            const x = b.p[k]!, y = b.p[k + 1]!, z = b.p[k + 2]! + R + 0.16;
            // Local stud axis z → radial (cos a, sin a); x stays along the drum axis.
            const ca = Math.cos(a), sa = Math.sin(a);
            b.p[k] = z * ca - y * sa;
            b.p[k + 1] = z * sa + y * ca;
            b.p[k + 2] = x + colX(c);
            const nx = b.n[k]!, ny = b.n[k + 1]!, nz = b.n[k + 2]!;
            b.n[k] = nz * ca - ny * sa;
            b.n[k + 1] = nz * sa + ny * ca;
            b.n[k + 2] = nx;
          }
        }
      });
      return b.done();
    },
    lever: () => merge(box(0.22, 0.2, 2.3, 0, 0, 1.0).done(), box(0.22, 0.5, 0.2, 0, -0.18, 2.1).done(), box(0.3, 0.3, 0.3, 0, 0.0, -0.2).done()),
    rod: () => cylinderZ(0.08, LEN + 1, 12),
    frame: () => merge(box(0.3, 3.6, 4.2, -LEN / 2 - 0.55, 0.3, -0.8).done(), box(0.3, 3.6, 4.2, LEN / 2 + 0.55, 0.3, -0.8).done(), box(LEN + 1.4, 0.25, 4.2, 0, -1.55, -0.8).done()),
  };
  const nodes: NodeDef[] = [
    { name: 'frame', parts: [part('frame', 'iron')] },
    { name: 'drum', label: 'Barrel', info: 'Each row of studs is one step of a microprogram: the studs in a row lift the levers that start that step’s actions.', parts: [part('drum', 'brass')] },
    { name: 'rod', parts: [part('rod', 'steel')] },
    ...LEVERS.map((l, c) => ({ name: `lever${c}`, label: `Lever: ${l}`, info: 'Lifted by a stud, it engages the mechanism for this action.', parts: [part('lever', c === 3 ? 'red' : 'steel')] })),
  ];
  const ix = nodeIndex(nodes);
  return {
    key,
    meshes,
    nodes,
    camera: { target: [0, 0.8, -0.5], distance: 10, yaw: 0.4, pitch: 0.72, fov: 0.6, aspect: 1.5 },
    pose(m, v) {
      fixed(m, ix.frame!, 0, 0, 0);
      // Swap: the drum mesh lies along z; turn it to lie along x, then rotate about x by the barrel position.
      const ang = v.pos * STEP;
      // rotation about x by ang, after mapping z→x: compose by hand.
      const c = Math.cos(ang), s = Math.sin(ang), o = ix.drum! * 16;
      // Columns: images of local x, y, z: local z (the drum axis) → world x, local x → (0, sin, −cos), local y → (0, cos, sin).
      m.set([0, s, -c, 0, 0, c, s, 0, 1, 0, 0, 0, 0, 0, 0, 1], o);
      const ro = ix.rod! * 16;
      m.set([0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, R + 0.62, -2.05, 1], ro);
      for (let k = 0; k < COLS; k++) {
        const lift = leverLift(rows, k, v.pos);
        fixed(m, ix[`lever${k}`]!, colX(k), R + 0.62, -2.05, 1, 0, 0, -0.32 * lift);
      }
    },
  };
}

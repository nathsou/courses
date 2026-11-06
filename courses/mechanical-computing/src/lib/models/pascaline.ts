/**
 * A Pascaline, opened up. Each column (units on the right) is one digit:
 *
 *   input wheel (spoked, turned clockwise with a stylus to the stop) on a vertical shaft
 *   → crown wheel of pins at the foot of the shaft
 *   → lantern pinion on a front-to-back axle, which carries
 *       the number drum (two rows: the digit, and its complement) under the windows, and
 *       the carry wheel, whose pin lifts the sautoir as the digit climbs from 0 to 9;
 *   the sautoir (a weighted lever on a rod along the machine) falls at 9 → 0 and its pawl pushes the next
 *   column's pinion one step.
 *
 * The layout follows the descriptions of the surviving machines; proportions are simplified so that every
 * part can be seen. The sliding bar covers one row of drum windows: the digits or their complements.
 */
import { box, Builder, cylinderY, cylinderZ, disc, faceDigits, merge, pinWheel, rimDigits, spokedWheel, extrudeStar, circleOutline } from '$lib/gl/mesh';
import { TAU } from '$lib/gl/math';
import { nodeIndex, part, type ModelDef, type NodeDef } from '$lib/gl/model';
import type { Pascaline } from '$lib/mech/pascaline';
import { fixed, onAxis, Z_TO_NEG_Y, Z_TO_Y } from './util';

export interface PascalineView {
  machine: Pascaline;
  /** Which row of drum windows the bar leaves open. */
  row: 'direct' | 'complement';
}

const S = 3.2; // column spacing
const DRUM_Y = -2.85;
const PIN_X = 0.85; // pinion axle offset from the input shaft
const DRUM_Z = 1.8;
const CARRY_Z = -1.4;
const ROD_Y = -2.0;
const ROD_Z = -2.35;

export function pascalineModel(radices: number[]): ModelDef<PascalineView> {
  const n = radices.length;
  const colX = (k: number) => ((n - 1) / 2) * S - k * S;
  const labelsFor = (r: number) => Array.from({ length: r }, (_, d) => String(d));
  const complementFor = (r: number) => Array.from({ length: r }, (_, d) => String(r - 1 - d));
  const kinds = [...new Set(radices)];

  const meshes: ModelDef['meshes'] = {
    base: () => merge(box(n * S + 1.6, 0.5, 6.4, 0, -4.1, 0).done(), box(0.4, 3.2, 6.4, (n * S + 1.2) / 2, -2.5, 0).done(), box(0.4, 3.2, 6.4, -(n * S + 1.2) / 2, -2.5, 0).done()),
    rod: () => {
      const b = new Builder();
      b.append(cylinderZ(0.09, n * S + 1.2, 16), 0, 0, 0, 0, 0);
      return rotZtoX(b.done());
    },
    bar: () => box(n * S + 0.8, 0.08, 0.62, 0, 0, 0).done(),
    ring: () => extrudeStar(circleOutline(1.62, 64), 0.1, 1.28).done(),
    stop: () => box(0.16, 0.34, 0.5, 0, 0, 0).done(),
    shaft: () => cylinderY(0.1, -2.2, 0.25, 16),
    pinion: () => merge(pinWheel(0.38, 0.06, 10, 0.32, 0.05, 0.36), [disc(0.38, 0.06), 0, 0, 0.42]),
    axle: () => cylinderZ(0.07, DRUM_Z - CARRY_Z + 1.0, 12),
    carry: () => merge(disc(0.45, 0.12, 0, 32), [cylinderZ(0.07, 0.5, 10), 0.36, 0, 0.3]),
    sautoir: () => {
      // Pivot on the rod at the origin; the arm reaches forward (+z) to rest on the carry pin; a weight hangs
      // at the back; the pawl drops at the far (−x) end onto the next column's pinion.
      const b = new Builder();
      box(0.18, 0.16, 0.95, 0.95, -0.12, 0.45, b); // lifter arm
      box(0.18, 0.16, 0.95, -2.2, -0.12, 0.45, b); // pawl arm
      box(2.9, 0.16, 0.18, -0.62, -0.12, 0.9, b); // the body along the machine
      box(0.6, 0.55, 0.4, -0.62, -0.3, -0.2, b); // the weight
      box(0.16, 0.16, 1.1, -0.62, -0.12, 0.35, b); // the weight's arm
      box(0.14, 0.42, 0.14, -2.2, -0.38, 0.9, b); // the pawl
      return b.done();
    },
  };
  for (const r of kinds) {
    meshes[`ringDigits${r}`] = () => faceDigits(labelsFor(r), 1.45, 0.051, r > 10 ? 0.17 : 0.24, Math.PI / 2 + TAU / r, 1);
    meshes[`wheel${r}`] = () => spokedWheel(1.22, 0.12, r, 0.16, 0.22, r > 10 ? 0.08 : 0.12);
    meshes[`crown${r}`] = () => pinWheel(1.0, 0.1, r, 0.85, r > 10 ? 0.04 : 0.06, 0.32);
    meshes[`drum${r}`] = () => cylinderZ(0.55, 1.3, 40);
    meshes[`drumDigits${r}`] = () => merge(rimDigits(labelsFor(r), 0.556, r > 10 ? 0.17 : 0.3, Math.PI / 2, -1, 'axial', 0.32), rimDigits(complementFor(r), 0.556, r > 10 ? 0.17 : 0.3, Math.PI / 2, -1, 'axial', -0.32));
  }

  const nodes: NodeDef[] = [
    { name: 'base', parts: [part('base', 'wood')] },
    { name: 'rod', label: 'Sautoir rod', info: 'The sautoirs pivot on this rod, which runs the length of the machine.', parts: [part('rod', 'steel')] },
    { name: 'bar', label: 'Sliding bar', info: 'Covers one row of windows: slide it to read the digits, or their nines’ complements for subtraction.', parts: [part('bar', 'darkBrass')] },
  ];
  for (let k = 0; k < n; k++) {
    const r = radices[k]!;
    const place = r === 12 ? 'deniers' : r === 20 ? 'sols' : k === 0 ? 'units' : `${10 ** k}s`;
    nodes.push(
      { name: `ring${k}`, label: `Dial ring (${place})`, info: 'Fixed. The stylus goes between two spokes opposite the digit to add, and turns the wheel clockwise to the stop.', parts: [part('ring', 'brass'), part(`ringDigits${r}`, 'decal')] },
      { name: `stop${k}`, label: 'Stop', info: 'The stylus is turned until it meets this stop: the wheel has then moved by the digit dialled.', parts: [part('stop', 'iron')] },
      { name: `wheel${k}`, label: `Input wheel (${place})`, info: 'Turned clockwise only; a click stops it turning back.', parts: [part(`wheel${r}`, 'brass')] },
      { name: `shaft${k}`, parts: [part('shaft', 'steel')] },
      { name: `crown${k}`, label: 'Crown wheel', info: 'Pins at the foot of the input shaft turn the lantern pinion: vertical motion to horizontal.', parts: [part(`crown${r}`, 'brass')] },
      { name: `pinion${k}`, label: 'Lantern pinion', info: 'Turned by the crown wheel, and by the previous column’s sautoir when it carries.', parts: [part('pinion', 'steel')] },
      { name: `axle${k}`, parts: [part('axle', 'steel')] },
      { name: `drum${k}`, label: `Number drum (${place})`, info: 'Two rows of numbers: the digit, and its complement. One row shows through the windows.', parts: [part(`drum${r}`, 'ivory'), part(`drumDigits${r}`, 'decal')] },
      { name: `carry${k}`, label: 'Carry wheel', info: 'Its pin lifts the sautoir as the digit climbs from 0 to 9, and lets it go at 9 → 0.', parts: [part('carry', 'brass')] },
      { name: `sautoir${k}`, label: 'Sautoir', info: k + 1 < n ? 'The weighted lever: lifted slowly by this column, it falls at the carry and pushes the next column on by one.' : 'The last sautoir has no next column: its carry is lost (overflow).', parts: [part('sautoir', 'red')] },
    );
  }
  const ix = nodeIndex(nodes);
  const N = (name: string) => ix[name]!;
  const cols = Array.from({ length: n }, (_, k) => ({
    ring: N(`ring${k}`), stop: N(`stop${k}`), wheel: N(`wheel${k}`), shaft: N(`shaft${k}`), crown: N(`crown${k}`), pinion: N(`pinion${k}`), axle: N(`axle${k}`), drum: N(`drum${k}`), carry: N(`carry${k}`), sautoir: N(`sautoir${k}`), x: colX(k), r: radices[k]!,
  }));
  const iBase = N('base'), iRod = N('rod'), iBar = N('bar');

  return {
    key: `pascaline-${radices.join('-')}`,
    meshes,
    nodes,
    camera: { target: [0, -1.9, 0.4], distance: 9 + n * 1.25, yaw: 0.38, pitch: 0.62, fov: 0.62 },
    pose(m, s) {
      fixed(m, iBase, 0, 0, 0);
      fixed(m, iRod, 0, ROD_Y, ROD_Z);
      fixed(m, iBar, 0, DRUM_Y + 0.6, s.row === 'direct' ? DRUM_Z - 0.32 : DRUM_Z + 0.32);
      for (let k = 0; k < n; k++) {
        const c = cols[k]!;
        const steps = s.machine.position(k);
        const turn = (steps / c.r) * TAU;
        // The input wheel turns clockwise seen from above; the drum shows the digit at its top.
        onAxis(m, c.ring, Z_TO_Y, c.x, 0, 0, 0);
        fixed(m, c.stop, c.x + 1.45 * Math.cos(-0.55), 0.18, -1.45 * Math.sin(-0.55));
        onAxis(m, c.wheel, Z_TO_Y, c.x, 0.12, 0, -turn);
        onAxis(m, c.shaft, Z_TO_Y, c.x, 0, 0, -turn);
        onAxis(m, c.crown, Z_TO_NEG_Y, c.x, -2.05, 0, turn);
        const px = c.x + PIN_X;
        onAxisZ(m, c.pinion, px, DRUM_Y, -0.2, turn);
        onAxisZ(m, c.axle, px, DRUM_Y, (DRUM_Z + CARRY_Z) / 2, turn);
        onAxisZ(m, c.drum, px, DRUM_Y, DRUM_Z, turn);
        onAxisZ(m, c.carry, px, DRUM_Y, CARRY_Z, turn);
        // The sautoir is lifted (its forward arm rises) by up to 0.32 rad.
        fixed(m, c.sautoir, px, ROD_Y, ROD_Z, 1, 0, 0, -0.32 * s.machine.lift(k));
      }
    },
  };
}

function onAxisZ(m: Float32Array, node: number, x: number, y: number, z: number, angle: number): void {
  fixed(m, node, x, y, z, 0, 0, 1, angle);
}

/** Turn a mesh built along z to lie along x. */
function rotZtoX(mesh: import('$lib/gl/mesh').MeshData) {
  const b = new Builder();
  // Swap x and z: rotate about y by 90°. Builder.append rotates about z then x, so do it by hand.
  for (let k = 0; k < mesh.positions.length; k += 3) {
    b.vertex(mesh.positions[k + 2]!, mesh.positions[k + 1]!, -mesh.positions[k]!, mesh.normals[k + 2]!, mesh.normals[k + 1]!, -mesh.normals[k]!);
  }
  for (const i of mesh.indices) b.i.push(i);
  return b.done();
}

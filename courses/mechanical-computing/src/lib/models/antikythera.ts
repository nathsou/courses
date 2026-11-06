/**
 * The Antikythera mechanism's lunar gearing, in bronze: the main wheel b (one turn a year, with its four
 * spokes) carries b2; the train b2 → c1, c2 → d1, d2 → e2 turns the lunar axle 254/19 times a year; on that
 * axle the pin-and-slot pair k1 → k2, on axles offset by about a millimetre, varies the Moon's speed. A Sun
 * pointer on b and a Moon pointer on k2 sweep a zodiac dial. Positions are laid out flat for clarity; in the
 * mechanism the train folds back so that the Moon pointer is coaxial with the Sun's.
 */
import { Builder, cylinderZ, disc, extrudeStar, gearOutline, merge, box, faceDigits, circleOutline } from '$lib/gl/mesh';
import { TAU } from '$lib/gl/math';
import { nodeIndex, part, type ModelDef, type NodeDef } from '$lib/gl/model';
import { LUNAR_TRAIN, pinSlot } from '$lib/mech/antikythera';
import { fixed } from './util';

const M = 0.045; // module
const r = (teeth: number) => (M * teeth) / 2;
export const PIN_R = 0.85;
export const OFFSET = 0.085;

export interface AntikytheraView {
  /** Years elapsed (main wheel turns). */
  years: number;
  /** Show the pin-and-slot (true) or uniform motion (false) for the Moon pointer. */
  anomaly: boolean;
}

// Axle positions in the plane (z layers per mesh pair).
const B = [0, 0] as const;
const ang1 = -0.25, ang2 = 0.55, ang3 = -0.35;
const C = [B[0] + (r(64) + r(38)) * Math.cos(ang1), B[1] + (r(64) + r(38)) * Math.sin(ang1)];
const D = [C[0]! + (r(48) + r(24)) * Math.cos(ang2), C[1]! + (r(48) + r(24)) * Math.sin(ang2)];
const E = [D[0]! + (r(127) + r(32)) * Math.cos(ang3), D[1]! + (r(127) + r(32)) * Math.sin(ang3)];
const ZL = [0, 0.32, 0.64, 0.96];

/** Turn a gear's teeth so that it meshes with its driver at the start. */
const phase = (teeth: number) => Math.PI / teeth;

function spokedGear(teeth: number, w: number, mod = M): import('$lib/gl/mesh').MeshData {
  // A gear wheel with four cut-out quadrants, as the mechanism's large wheels are.
  const b = new Builder();
  const rr = (mod * teeth) / 2 - 1.3 * mod;
  extrudeStar(gearOutline(teeth, mod, teeth > 100 ? 2 : 3), w, rr - 0.18, b);
  extrudeStar(circleOutline(0.22, 24), w, 0.04, b);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    const spoke = box(rr - 0.1, 0.16, w, (rr + 0.1) / 2, 0, 0).done();
    b.append(spoke, 0, 0, 0, a);
  }
  return b.done();
}

export function antikytheraModel(): ModelDef<AntikytheraView> {
  const W = 0.12;
  const meshes: ModelDef['meshes'] = {
    b: () => spokedGear(223, W, 0.029), // the main wheel b1 (223 teeth) carries the train
    b2: () => extrudeStar(gearOutline(64, M, 3), W, 0.05).done(),
    c1: () => extrudeStar(gearOutline(38, M, 3), W, 0.05).done(),
    c2: () => extrudeStar(gearOutline(48, M, 3), W, 0.05).done(),
    d1: () => extrudeStar(gearOutline(24, M, 3), W, 0.05).done(),
    d2: () => spokedGear(127, W),
    e2: () => extrudeStar(gearOutline(32, M, 3), W, 0.05).done(),
    k1: () => merge(extrudeStar(gearOutline(50, M, 3), W, 0.05).done(), [cylinderZ(0.05, 0.3, 10), PIN_R, 0, 0.16]),
    k2: () => {
      // A gear with a radial slot (drawn as two rails) for the pin.
      const b = new Builder();
      extrudeStar(gearOutline(50, M, 3), W, 0.05, b);
      b.append(box(0.9, 0.05, 0.1, PIN_R - 0.05, 0.08, 0.1).done());
      b.append(box(0.9, 0.05, 0.1, PIN_R - 0.05, -0.08, 0.1).done());
      return b.done();
    },
    axle: () => cylinderZ(0.05, 1.6, 10),
    sunPointer: () => merge(box(3.1, 0.12, 0.05, 1.55, 0, 0).done(), [disc(0.2, 0.06, 0, 20), 3.1, 0, 0]),
    moonPointer: () => merge(box(2.6, 0.1, 0.05, 1.3, 0, 0).done(), [disc(0.16, 0.08, 0, 20), 2.6, 0, 0]),
    dial: () => extrudeStar(circleOutline(3.7, 96), 0.06, 3.3).done(),
    // The twelve signs by their initials: Aries, Taurus, Gemini … Pisces.
    zodiac: () => faceDigits(['A', 'T', 'G', 'C', 'L', 'V', 'L', 'S', 'S', 'C', 'A', 'P'], 3.5, 0.031, 0.3, Math.PI / 2, 1),
    plate: () => box(13, 7.6, 0.12, 2.3, -0.3, -0.3).done(),
  };
  const nodes: NodeDef[] = [
    { name: 'plate', parts: [part('plate', 'wood')] },
    { name: 'b', label: 'Main wheel b1', info: 'Turned by the side handle: one turn is one year. It carries the Sun pointer and, on the same axle, gear b2.', parts: [part('b', 'brass')] },
    { name: 'b2', label: 'b2 (64 teeth)', info: 'First gear of the lunar train.', parts: [part('b2', 'brass')] },
    { name: 'c1', label: 'c1 (38 teeth)', info: 'Driven by b2: 64/38 turns per year.', parts: [part('c1', 'brass')] },
    { name: 'c2', label: 'c2 (48 teeth)', info: 'On the same axle as c1.', parts: [part('c2', 'brass')] },
    { name: 'd1', label: 'd1 (24 teeth)', info: 'Driven by c2: 64/38 × 48/24 turns per year.', parts: [part('d1', 'brass')] },
    { name: 'd2', label: 'd2 (127 teeth)', info: 'A gear with a prime number of teeth: 127 is half of 254, the number of sidereal months in 19 years.', parts: [part('d2', 'brass')] },
    { name: 'e2', label: 'e2 (32 teeth)', info: 'Driven by d2: the lunar axle turns 64·48·127 / (38·24·32) = 254/19 times a year.', parts: [part('e2', 'brass')] },
    { name: 'k1', label: 'k1, with its pin', info: 'Turns steadily with the lunar axle. Its pin rides in the slot of k2.', parts: [part('k1', 'brass')] },
    { name: 'k2', label: 'k2, with its slot', info: 'On an axle offset by about a millimetre in the original: as the pin slides in and out along the slot, k2 runs ahead and falls behind.', parts: [part('k2', 'brass')] },
    { name: 'axB', parts: [part('axle', 'steel')] },
    { name: 'axC', parts: [part('axle', 'steel')] },
    { name: 'axD', parts: [part('axle', 'steel')] },
    { name: 'axE', parts: [part('axle', 'steel')] },
    { name: 'dial', label: 'Zodiac dial', info: 'The front dial: twelve signs of the zodiac (here their initials), and on the original a calendar ring of 365 days.', parts: [part('dial', 'ivory'), part('zodiac', 'decal')] },
    { name: 'sun', label: 'Sun pointer', info: 'One turn a year.', parts: [part('sunPointer', 'brass')] },
    { name: 'moon', label: 'Moon pointer', info: 'A little over 13⅓ turns a year, faster and slower round each month.', parts: [part('moonPointer', 'steel')] },
  ];
  const ix = nodeIndex(nodes);
  const N = (n: string) => ix[n]!;
  const [k12, k22] = [ratio(0), ratio(1)];
  function ratio(i: number) {
    return LUNAR_TRAIN.slice(0, i + 1).reduce((acc, m) => (-acc * m.driver) / m.driven, 1);
  }
  const front = ZL[3]! + 0.5;
  return {
    key: 'antikythera',
    meshes,
    nodes,
    camera: { target: [2.3, 0.2, 0.6], distance: 17.5, yaw: 0.3, pitch: 0.3, fov: 0.62, aspect: 1.45 },
    pose(m, v) {
      const tb = v.years * TAU;
      const tc = tb * k12;
      const td = tb * k22;
      const te = tb * ratio(2);
      fixed(m, N('plate'), 0, 0, 0);
      fixed(m, N('b'), B[0], B[1], ZL[0]! - 0.16, 0, 0, 1, tb);
      fixed(m, N('b2'), B[0], B[1], ZL[0]!, 0, 0, 1, tb);
      fixed(m, N('c1'), C[0]!, C[1]!, ZL[0]!, 0, 0, 1, tc + phase(38));
      fixed(m, N('c2'), C[0]!, C[1]!, ZL[1]!, 0, 0, 1, tc);
      fixed(m, N('d1'), D[0]!, D[1]!, ZL[1]!, 0, 0, 1, td + phase(24));
      fixed(m, N('d2'), D[0]!, D[1]!, ZL[2]!, 0, 0, 1, td);
      fixed(m, N('e2'), E[0]!, E[1]!, ZL[2]!, 0, 0, 1, te + phase(32));
      fixed(m, N('k1'), E[0]!, E[1]!, ZL[3]!, 0, 0, 1, te);
      const out = v.anomaly ? pinSlot(te, PIN_R, OFFSET) : te;
      fixed(m, N('k2'), E[0]! + OFFSET, E[1]!, ZL[3]! + 0.2, 0, 0, 1, out);
      fixed(m, N('axB'), B[0], B[1], 0.6);
      fixed(m, N('axC'), C[0]!, C[1]!, 0.5);
      fixed(m, N('axD'), D[0]!, D[1]!, 0.5);
      fixed(m, N('axE'), E[0]!, E[1]!, 0.7);
      // The dial and pointers sit in front of the main wheel; the Moon pointer shows k2's angle.
      fixed(m, N('dial'), B[0], B[1], front);
      fixed(m, N('sun'), B[0], B[1], front + 0.08, 0, 0, 1, tb + Math.PI / 2);
      fixed(m, N('moon'), B[0], B[1], front + 0.16, 0, 0, 1, out + Math.PI / 2);
    },
  };
}

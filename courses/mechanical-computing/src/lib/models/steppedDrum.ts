/**
 * Leibniz's stepped drum, one digit of it: a drum with nine teeth of increasing length, turned by a crank;
 * a ten-tooth pinion on a square shaft above it, slid along to the setting s; and the result dial on the end
 * of the pinion's shaft. One turn of the crank brings the s longest teeth past the pinion, which advances
 * the dial by s.
 */
import { box, Builder, cylinderZ, disc, faceDigits, gear, glyph, merge } from '$lib/gl/mesh';
import { TAU } from '$lib/gl/math';
import { nodeIndex, part, type ModelDef, type NodeDef } from '$lib/gl/model';
import { fixed } from './util';

export const DRUM_R = 1.0;
export const DRUM_L = 5.0;
const DELTA = DRUM_L / 10;
const TOOTH_H = 0.26;
const DELTA_A = TAU / 20; // angular spacing of the teeth
const ALPHA0 = -Math.PI / 2 + 0.2; // angle of tooth 1 at crank angle 0
const PIN_R = 0.56;
const PIN_Y = DRUM_R + TOOTH_H / 2 + PIN_R + 0.02;

export interface DrumView {
  /** Crank (drum) angle, radians, cumulative. */
  crank: number;
  /** Setting 0..9. */
  setting: number;
  /** The setting slider may be between positions while it moves. */
  slide: number;
  /** Digit the dial showed when the crank was at 0. */
  base: number;
}

/** z of the pinion at (fractional) setting s. */
export const pinionZ = (s: number) => DRUM_L / 2 - (9.5 - s) * DELTA;

const ramp = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * How many tenths the pinion has turned after the drum has turned by `crank` radians at setting s: each
 * engaged tooth moves it on by one tenth as it passes the top of the drum.
 */
export function pinionSteps(crank: number, s: number): number {
  const turns = Math.floor(crank / TAU);
  const phi = crank - turns * TAU;
  let steps = turns * s;
  for (let j = 10 - s; j <= 9; j++) {
    // The tooth reaches the top (angle π/2) when phi + alpha_j = π/2.
    const a = ALPHA0 + (j - 1) * DELTA_A;
    let cross = Math.PI / 2 - a;
    cross = ((cross % TAU) + TAU) % TAU;
    steps += ramp((phi - cross) / DELTA_A + 0.5);
  }
  return steps;
}

export function steppedDrumModel(): ModelDef<DrumView> {
  const meshes: ModelDef['meshes'] = {
    drum: () => {
      const b = new Builder();
      b.append(cylinderZ(DRUM_R, DRUM_L + 0.2, 48));
      for (let j = 1; j <= 9; j++) {
        const len = (j + 0.5) * DELTA;
        const a = ALPHA0 + (j - 1) * DELTA_A;
        const tooth = box(TOOTH_H, 0.16, len, 0, 0, 0).done();
        // Place the tooth radially at angle a, its front end flush with the drum's front.
        b.append(tooth, 0, 0, 0, 0, 0);
        const last = b.p.length - tooth.positions.length;
        for (let k = last; k < b.p.length; k += 3) {
          const x = b.p[k]! + DRUM_R + TOOTH_H / 2 - 0.02, y = b.p[k + 1]!, z = b.p[k + 2]! + DRUM_L / 2 - len / 2;
          b.p[k] = x * Math.cos(a) - y * Math.sin(a);
          b.p[k + 1] = x * Math.sin(a) + y * Math.cos(a);
          b.p[k + 2] = z;
          const nx = b.n[k]!, ny = b.n[k + 1]!;
          b.n[k] = nx * Math.cos(a) - ny * Math.sin(a);
          b.n[k + 1] = nx * Math.sin(a) + ny * Math.cos(a);
        }
      }
      return b.done();
    },
    axle: () => cylinderZ(0.14, DRUM_L + 3.2, 16),
    shaft: () => box(0.2, 0.2, DRUM_L + 1.6, 0, 0, 0).done(),
    pinion: () => gear(10, (2 * PIN_R) / 10, 0.32, 0.12),
    dial: () => disc(1.0, 0.12, 0.1, 48),
    dialDigits: () => faceDigits(Array.from({ length: 10 }, (_, d) => String(d)), 0.74, 0.061, 0.3, Math.PI / 2, -1),
    pointer: () => merge(box(0.12, 0.34, 0.08, 0, 0, 0).done()),
    crank: () => merge(box(0.22, 1.5, 0.16, 0, -0.75, 0).done(), [cylinderZ(0.13, 0.7, 14), 0, -1.45, -0.4]),
    scale: () => box(0.08, 0.5, DRUM_L, 0, 0, 0).done(),
    scaleDigits: () => {
      // Digits on the scale's outer face (+x), upright, read from that side.
      const b = new Builder();
      for (let d = 0; d <= 9; d++) glyph(b, String(d), [0.045, 0, pinionZ(d)], [0, 0, -0.16], [0, 0.16, 0]);
      return b.done();
    },
    knob: () => merge(box(0.12, 0.62, 0.12, 0, 0, 0).done(), box(0.34, 0.16, 0.34, 0, 0.36, 0).done()),
    frame: () => merge(box(4.2, 0.3, DRUM_L + 2.4, 0.4, -1.75, 0).done(), box(4.2, 3.9, 0.25, 0.4, 0.05, -DRUM_L / 2 - 1.1).done(), box(0.6, 3.3, 0.25, -1.2, -0.1, DRUM_L / 2 + 0.75).done()),
  };
  const nodes: NodeDef[] = [
    { name: 'frame', parts: [part('frame', 'wood')] },
    { name: 'drum', label: 'Stepped drum', info: 'Nine teeth of lengths 1 to 9 (in tenths of the drum, plus a half). One crank turn brings every tooth past the top once.', parts: [part('drum', 'brass')] },
    { name: 'axle', parts: [part('axle', 'steel')] },
    { name: 'crank', label: 'Crank', info: 'One full turn adds the setting once.', parts: [part('crank', 'iron')] },
    { name: 'shaft', label: 'Square shaft', info: 'The pinion slides along it but must turn with it: the square shape transmits the turning.', parts: [part('shaft', 'steel')] },
    { name: 'pinion', label: 'Sliding pinion', info: 'Ten teeth. Slid towards the long end of the drum it meets more teeth per turn.', parts: [part('pinion', 'steel')] },
    { name: 'dial', label: 'Result dial', info: 'Turns with the pinion shaft: one tenth of a turn per tooth met.', parts: [part('dial', 'ivory'), part('dialDigits', 'decal')] },
    { name: 'pointer', parts: [part('pointer', 'red')] },
    { name: 'scale', label: 'Setting scale', info: 'The digit beside the pinion is the digit being added.', parts: [part('scale', 'ivory'), part('scaleDigits', 'decal')] },
    { name: 'knob', label: 'Setting knob', info: 'Moves the pinion along the drum.', parts: [part('knob', 'red')] },
  ];
  const ix = nodeIndex(nodes);
  const [iFrame, iDrum, iAxle, iCrank, iShaft, iPinion, iDial, iPointer, iScale, iKnob] = ['frame', 'drum', 'axle', 'crank', 'shaft', 'pinion', 'dial', 'pointer', 'scale', 'knob'].map((n) => ix[n]!) as number[];
  return {
    key: 'stepped-drum',
    meshes,
    nodes,
    camera: { target: [0, 0.7, 0.6], distance: 11.5, yaw: 0.72, pitch: 0.36, fov: 0.6, aspect: 1.5 },
    pose(m, v) {
      fixed(m, iFrame!, 0, 0, 0);
      fixed(m, iDrum!, 0, 0, 0, 0, 0, 1, v.crank);
      fixed(m, iAxle!, 0, 0, -0.9, 0, 0, 1, v.crank);
      fixed(m, iCrank!, 0, 0, -DRUM_L / 2 - 1.4, 0, 0, 1, v.crank);
      // The pinion turns the opposite way to the drum; one tenth per tooth; its teeth start aligned.
      const steps = pinionSteps(v.crank, v.setting);
      const psi = -(steps / 10) * TAU + Math.PI / 10;
      fixed(m, iShaft!, 0, PIN_Y, 0.7, 0, 0, 1, psi);
      fixed(m, iPinion!, 0, PIN_Y, pinionZ(v.slide), 0, 0, 1, psi);
      // The dial shows base + steps at its top; digits run clockwise on the face.
      fixed(m, iDial!, 0, PIN_Y, DRUM_L / 2 + 1.45, 0, 0, 1, ((v.base + steps) / 10) * TAU);
      fixed(m, iPointer!, 0, PIN_Y + 1.1, DRUM_L / 2 + 1.5);
      fixed(m, iScale!, 0.15, PIN_Y + 0.85, 0);
      fixed(m, iKnob!, 0, PIN_Y + 0.45, pinionZ(v.slide));
    },
  };
}

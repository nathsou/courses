/**
 * Two of the Z1's switching elements, in series, in sheet metal. Each element has three plates in three
 * layers: a driving plate that the clock pushes along x in each cycle; a control plate, set to 0 or 1 by moving
 * it along z, which carries a pin in a slot; and an output plate. The driving plate has a pusher block; if the
 * control plate holds the pin in the pusher's path, the pusher catches it and the pin drags the output plate
 * with it. The first element's output plate is the second element's driving plate, so the final plate moves
 * only if both controls are 1: AND. With the second pusher moved to the 0 position, the pair computes
 * A AND NOT B. The Z1 had thousands of such elements in a block of steel plates.
 */
import { box, Builder, cylinderY, merge, textQuad } from '$lib/gl/mesh';
import { nodeIndex, part, type ModelDef, type NodeDef } from '$lib/gl/model';
import { fixed, hide } from './util';

export interface Z1View {
  /** Clock phase 0..1 (0 = rest, 0.5 = fully pushed, 1 = back at rest). */
  phase: number;
  /** Control plate positions 0..1 (animated towards the input bits). */
  a: number;
  b: number;
  /** Second element couples on 0 instead of 1 (an inverter). */
  invertB: boolean;
}

const STROKE = 0.9;
const Z1 = 0.7; // the pin's z when its control is 1
const X1 = -1.6, X2 = 1.6; // the two elements' pin positions along x

/** How far the plates have moved for a given phase (a smooth push out and back). */
export const push = (p: number) => STROKE * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));

export function z1Model(): ModelDef<Z1View> {
  const meshes: ModelDef['meshes'] = {
    base: () => box(8.4, 0.2, 4.4, 0, -0.35, 0.2).done(),
    driver: () => merge(box(3.4, 0.08, 1.2, -3.0, 0, 0.35).done(), box(1.3, 0.08, 0.36, X1 - 0.95, 0, Z1).done(), box(0.22, 0.34, 0.36, X1 - 0.38, 0.13, Z1).done()),
    pusherNote: () => textQuad('CLOCK', 0, 0, 0.22),
    control: () => merge(box(1.3, 0.08, 1.0, 0, 0, 0).done(), box(1.3, 0.1, 0.12, 0, 0.02, 0.26).done(), box(1.3, 0.1, 0.12, 0, 0.02, -0.26).done()),
    // Output 1 is also the driver of element 2: a long plate with the second pusher; two variants.
    // A strip beside the pins, a lug that hooks pin A, and a pusher that reaches for pin B (at 1, or at 0).
    out1: () => merge(box(3.3, 0.08, 0.32, 1.55, 0, Z1 + 0.5).done(), box(0.24, 0.08, 0.6, 0.24, 0, Z1 + 0.25).done(), box(0.22, 0.34, 0.36, X2 - X1 - 0.38, 0.13, Z1).done(), box(0.24, 0.08, 0.6, X2 - X1 - 0.38, 0, Z1 + 0.25).done()),
    out1inv: () => merge(box(3.3, 0.08, 0.32, 1.55, 0, Z1 + 0.5).done(), box(0.24, 0.08, 0.6, 0.24, 0, Z1 + 0.25).done(), box(0.22, 0.34, 0.36, X2 - X1 - 0.38, 0.13, 0).done(), box(0.24, 0.08, 1.3, X2 - X1 - 0.38, 0, Z1 / 2 + 0.25).done()),
    out2: () => merge(box(2.4, 0.08, 0.32, 1.4, 0, Z1 + 0.5).done(), box(0.24, 0.08, 0.6, 0.24, 0, Z1 + 0.25).done(), box(0.4, 0.5, 0.4, 2.5, 0.25, Z1 + 0.5).done()),
    pin: () => cylinderY(0.11, -0.12, 0.8, 16),
    labelA: () => textQuad('A', 0, 0, 0.36),
    labelB: () => textQuad('B', 0, 0, 0.36),
    labelOut: () => textQuad('OUT', 0, 0, 0.3),
    rail: () => box(8, 0.06, 0.08, 0, 0, 0).done(),
  };
  const nodes: NodeDef[] = [
    { name: 'base', parts: [part('base', 'wood')] },
    { name: 'railF', parts: [part('rail', 'steel')] },
    { name: 'railB', parts: [part('rail', 'steel')] },
    { name: 'driver', label: 'Driving plate (the clock)', info: 'Pushed along and back once in every cycle of the machine. Its pusher block catches the first pin only if that pin is in the 1 position.', parts: [part('driver', 'steel')] },
    { name: 'ctrlA', label: 'Control plate A', info: 'Set to 0 or 1 by sliding it sideways (in the Z1, by the output of another element). It holds the first pin in, or out of, the pusher’s path.', parts: [part('control', 'blue')] },
    { name: 'pinA', label: 'Pin A', info: 'Rides in a slot of control plate A. When caught by the pusher, it drags the next plate with it.', parts: [part('pin', 'red')] },
    { name: 'out1', label: 'Output plate of the first element', info: 'Moves only if A is 1. It is also the driving plate of the second element: its own pusher reaches for pin B.', parts: [part('out1', 'brass')] },
    { name: 'out1inv', label: 'Output plate of the first element', info: 'Moves only if A is 1. Its pusher now sits at the 0 position of pin B: the second element inverts B.', parts: [part('out1inv', 'brass')] },
    { name: 'ctrlB', label: 'Control plate B', info: 'Holds pin B at 0 or 1.', parts: [part('control', 'blue')] },
    { name: 'pinB', label: 'Pin B', info: 'Caught by the first element’s pusher only if that pusher moves, and only if pin B is where the pusher reaches.', parts: [part('pin', 'red')] },
    { name: 'out2', label: 'Output plate', info: 'Moves only if both elements pass the motion on: the result bit, ready to set another element’s control plate.', parts: [part('out2', 'darkBrass')] },
    { name: 'lA', parts: [part('labelA', 'decalLight')] },
    { name: 'lB', parts: [part('labelB', 'decalLight')] },
    { name: 'lOut', parts: [part('labelOut', 'decalLight')] },
    { name: 'lClock', parts: [part('pusherNote', 'decal')] },
  ];
  const ix = nodeIndex(nodes);
  const N = (n: string) => ix[n]!;
  const flatUp = (m: Float32Array, i: number, x: number, y: number, z: number) => fixed(m, i, x, y, z, 1, 0, 0, -Math.PI / 2);
  return {
    key: 'z1-cell',
    meshes,
    nodes,
    camera: { target: [0.2, 0.2, 0.6], distance: 8.2, yaw: 0.25, pitch: 0.95, fov: 0.6, aspect: 1.6 },
    pose(m, v) {
      const d = push(v.phase);
      const za = v.a * Z1, zb = v.b * Z1;
      // Element 1 couples when pin A sits at Z1 (control A at 1, rounded: the pin is caught only if fully in place).
      const c1 = v.a > 0.5 ? d : 0;
      const coupledB = v.invertB ? v.b < 0.5 : v.b > 0.5;
      const c2 = coupledB ? c1 : 0;
      fixed(m, N('base'), 0, 0, 0);
      fixed(m, N('railF'), 0, -0.18, 1.55);
      fixed(m, N('railB'), 0, -0.18, -0.85);
      fixed(m, N('driver'), d, 0, 0);
      fixed(m, N('ctrlA'), X1, 0.12, za);
      fixed(m, N('pinA'), X1 + c1, 0, za);
      fixed(m, N(v.invertB ? 'out1inv' : 'out1'), X1 + c1, 0.24, 0);
      hide(m, N(v.invertB ? 'out1' : 'out1inv'));
      fixed(m, N('ctrlB'), X2, 0.36, zb);
      fixed(m, N('pinB'), X2 + c2, 0.24, zb);
      fixed(m, N('out2'), X2 + c2, 0.48, 0);
      flatUp(m, N('lA'), X1, -0.18, 1.85);
      flatUp(m, N('lB'), X2, -0.18, 1.85);
      flatUp(m, N('lOut'), X2 + 2.5 + c2, 0.12 - 0.3, 1.75);
      flatUp(m, N('lClock'), -3.6 + d, 0.05, 0.2);
    },
  };
}

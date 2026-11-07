/**
 * A wheel-and-disc integrator: a horizontal disc turned by a crank (the input x), a small wheel resting on it
 * at distance y from its centre, set by a carriage (the input y), and a counter on the wheel's shaft (the
 * output ∫ y dx). The wheel slides along a square shaft, like the stepped drum's pinion, so it can be moved
 * while it turns.
 */
import { box, Builder, cylinderY, cylinderZ, disc, faceDigits, merge, extrudeStar, circleOutline, textQuad } from '$lib/gl/mesh';
import { TAU } from '$lib/gl/math';
import { nodeIndex, part, type ModelDef, type NodeDef } from '$lib/gl/model';
import { fixed, onAxis, Z_TO_Y, Z_TO_X } from './util';

export const DISC_R = 2.2;
export const WHEEL_R = 0.45;
const DISC_Y = 0;
const WHEEL_Y = DISC_Y + 0.06 + WHEEL_R;

export interface IntegratorView {
  /** Disc angle (radians). */
  x: number;
  /** Wheel distance from the disc centre (0 .. DISC_R − 0.2); may be negative to integrate backwards. */
  y: number;
  /** Wheel angle (radians). */
  out: number;
}

export function integratorModel(): ModelDef<IntegratorView> {
  const meshes: ModelDef['meshes'] = {
    disc: () => {
      const b = new Builder();
      extrudeStar(circleOutline(DISC_R, 96), 0.12, 0.12, b);
      // Radial lines engraved on the disc, so that its turning shows.
      for (let k = 0; k < 12; k++) b.append(box(DISC_R - 0.35, 0.03, 0.02, (DISC_R + 0.25) / 2, 0, 0.065).done(), 0, 0, 0, (k / 12) * TAU);
      return b.done();
    },
    discShaft: () => cylinderZ(0.1, 2.6, 16),
    wheel: () => merge(disc(WHEEL_R, 0.08, 0.1, 40), extrudeStar(circleOutline(WHEEL_R - 0.05, 40), 0.1, 0.12).done()),
    spline: () => box(0.12, 0.12, 4.6, 0, 0, 0).done(),
    counter: () => disc(0.75, 0.08, 0.1, 48),
    counterDigits: () => faceDigits(Array.from({ length: 10 }, (_, d) => String(d)), 0.56, 0.041, 0.22, Math.PI / 2, -1),
    pointer: () => box(0.08, 0.3, 0.05, 0, 0, 0).done(),
    carriage: () => merge(box(0.08, 0.7, 0.08, -0.12, 0.15, 0.25).done(), box(0.08, 0.7, 0.08, 0.12, 0.15, 0.25).done(), box(0.34, 0.1, 0.6, 0, 0.5, 0.1).done()),
    rail: () => box(4.8, 0.1, 0.18, 0, 0, 0).done(),
    crank: () => merge(box(1.2, 0.12, 0.2, 0.6, 0, 0).done(), [cylinderY(0.1, 0, 0.5, 12), 1.15, 0, 0]),
    base: () => merge(box(7.4, 0.3, 5.6, 0.8, -1.6, 0).done(), box(0.3, 2.2, 0.3, 3.6, -0.5, 0).done(), box(0.3, 2.2, 0.3, -2.0, -0.5, 1.2).done()),
    scale: () => box(2.5, 0.34, 0.04, 1.0, 0, 0).done(),
    scaleDigits: () => {
      const b = new Builder();
      for (let k = 0; k <= 4; k++) b.append(textQuad(String(k), k * 0.5, 0, 0.2), 0, 0, 0.025);
      return b.done();
    },
  };
  const nodes: NodeDef[] = [
    { name: 'base', parts: [part('base', 'wood')] },
    { name: 'disc', label: 'Disc (input x)', info: 'Turned by the crank. Its surface moves faster the further you go from its centre.', parts: [part('disc', 'steel')] },
    { name: 'discShaft', parts: [part('discShaft', 'steel')] },
    { name: 'crank', label: 'Crank', info: 'Turning it is the input x: the variable you integrate with respect to.', parts: [part('crank', 'iron')] },
    { name: 'wheel', label: 'Integrating wheel', info: 'Rests on the disc at distance y from its centre. When the disc turns by dx it rolls by y·dx.', parts: [part('wheel', 'brass')] },
    { name: 'spline', label: 'Square shaft', info: 'The wheel slides along it, and turns it: the counter on its end adds up every roll.', parts: [part('spline', 'steel')] },
    { name: 'carriage', label: 'Carriage (input y)', info: 'Slides the wheel in and out along the disc’s radius: the quantity being integrated.', parts: [part('carriage', 'red')] },
    { name: 'rail', parts: [part('rail', 'steel')] },
    { name: 'counter', label: 'Counter (output ∫ y dx)', info: 'Turns with the wheel’s shaft.', parts: [part('counter', 'ivory'), part('counterDigits', 'decal')] },
    { name: 'pointer', parts: [part('pointer', 'red')] },
    { name: 'scale', label: 'Scale of y', info: 'How far the wheel sits from the disc’s centre.', parts: [part('scale', 'ivory'), part('scaleDigits', 'decal')] },
  ];
  const ix = nodeIndex(nodes);
  return {
    key: 'integrator',
    meshes,
    nodes,
    camera: { target: [0.9, 0, 0], distance: 10.5, yaw: 0.55, pitch: 0.6, fov: 0.6, aspect: 1.5 },
    pose(m, v) {
      fixed(m, ix.base!, 0, 0, 0);
      onAxis(m, ix.disc!, Z_TO_Y, 0, DISC_Y, 0, v.x);
      onAxis(m, ix.discShaft!, Z_TO_Y, 0, DISC_Y - 1.3, 0, v.x);
      fixed(m, ix.crank!, 0, DISC_Y - 1.25, 0, 0, 1, 0, v.x);
      // The wheel's axis is radial (x); it sits at (y, WHEEL_Y, 0) and turns about x.
      onAxis(m, ix.wheel!, Z_TO_X, v.y, WHEEL_Y, 0, v.out);
      onAxis(m, ix.spline!, Z_TO_X, 1.1, WHEEL_Y, 0, v.out);
      fixed(m, ix.carriage!, v.y, WHEEL_Y - 0.2, -0.5);
      fixed(m, ix.rail!, 0.9, WHEEL_Y + 0.34, -0.5);
      onAxis(m, ix.counter!, Z_TO_X, 3.45, WHEEL_Y, 0, v.out / 10);
      fixed(m, ix.pointer!, 3.52, WHEEL_Y + 0.85, 0);
      fixed(m, ix.scale!, 0, WHEEL_Y + 0.85, 0.8);
    },
  };
}

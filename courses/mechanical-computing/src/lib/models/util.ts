/** Orientation helpers shared by the machine models. Meshes are built about the z axis; these turn z onto x, y or −y. */
import { compose, composeOn, type Mat4 } from '$lib/gl/math';

const make = (ax: number, ay: number, az: number, angle: number): Mat4 => compose(new Float32Array(16), 0, 0, 0, 0, ax, ay, az, angle);

/** z → x (rotate about y by +90°). */
export const Z_TO_X = make(0, 1, 0, Math.PI / 2);
/** z → y (rotate about x by −90°). */
export const Z_TO_Y = make(1, 0, 0, -Math.PI / 2);
/** z → −y (rotate about x by +90°). */
export const Z_TO_NEG_Y = make(1, 0, 0, Math.PI / 2);
/** z → −x. */
export const Z_TO_NEG_X = make(0, 1, 0, -Math.PI / 2);

/** A part turned by `angle` about its own (mesh) z axis, oriented by `base`, at (x, y, z). */
export function onAxis(m: Float32Array, node: number, base: Mat4, x: number, y: number, z: number, angle: number): void {
  composeOn(m, node * 16, base, x, y, z, 0, 0, 1, angle);
}

/** A fixed part at (x, y, z), optionally rotated about a world axis. */
export function fixed(m: Float32Array, node: number, x: number, y: number, z: number, ax = 0, ay = 0, az = 1, angle = 0): void {
  compose(m, node * 16, x, y, z, ax, ay, az, angle);
}

/** Hide a node (scale to nothing) — for parts absent from a configuration. */
export function hide(m: Float32Array, node: number): void {
  m.fill(0, node * 16, node * 16 + 16);
  m[node * 16 + 15] = 1;
}

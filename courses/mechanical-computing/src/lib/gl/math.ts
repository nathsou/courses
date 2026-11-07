/**
 * Minimal column-major 4×4 matrix and vector maths for the renderer and the machine models. Every function
 * writes into an `out` array it is given, so a frame allocates nothing.
 */
export type Mat4 = Float32Array;
export type Vec3 = [number, number, number] | Float32Array;

export const mat4 = (): Mat4 => identity(new Float32Array(16));

export function identity(out: Mat4, o = 0): Mat4 {
  out.fill(0, o, o + 16);
  out[o] = out[o + 5] = out[o + 10] = out[o + 15] = 1;
  return out;
}

/** out[o..o+16] = a × b (either may alias out only if offsets differ). */
export function multiply(out: Mat4, a: Mat4, b: Mat4, o = 0, ao = 0, bo = 0): Mat4 {
  for (let c = 0; c < 4; c++) {
    const b0 = b[bo + c * 4]!, b1 = b[bo + c * 4 + 1]!, b2 = b[bo + c * 4 + 2]!, b3 = b[bo + c * 4 + 3]!;
    for (let r = 0; r < 4; r++) {
      tmp[c * 4 + r] = a[ao + r]! * b0 + a[ao + 4 + r]! * b1 + a[ao + 8 + r]! * b2 + a[ao + 12 + r]! * b3;
    }
  }
  out.set(tmp, o);
  return out;
}
const tmp = new Float32Array(16);

/**
 * Write a rigid transform: translate(tx, ty, tz) · R, where R rotates by `angle` about the unit axis
 * (ax, ay, az). This is the only pose most machine parts need: a part on a shaft, turned.
 */
export function compose(out: Mat4, o: number, tx: number, ty: number, tz: number, ax = 0, ay = 0, az = 1, angle = 0, s = 1): Mat4 {
  const c = Math.cos(angle), sn = Math.sin(angle), t = 1 - c;
  out[o] = (t * ax * ax + c) * s;
  out[o + 1] = (t * ax * ay + sn * az) * s;
  out[o + 2] = (t * ax * az - sn * ay) * s;
  out[o + 3] = 0;
  out[o + 4] = (t * ax * ay - sn * az) * s;
  out[o + 5] = (t * ay * ay + c) * s;
  out[o + 6] = (t * ay * az + sn * ax) * s;
  out[o + 7] = 0;
  out[o + 8] = (t * ax * az + sn * ay) * s;
  out[o + 9] = (t * ay * az - sn * ax) * s;
  out[o + 10] = (t * az * az + c) * s;
  out[o + 11] = 0;
  out[o + 12] = tx;
  out[o + 13] = ty;
  out[o + 14] = tz;
  out[o + 15] = 1;
  return out;
}

/** Rotation about a local axis followed by a fixed base orientation: out = T · B · R(axis, angle). */
export function composeOn(out: Mat4, o: number, base: Mat4, tx: number, ty: number, tz: number, ax: number, ay: number, az: number, angle: number): Mat4 {
  compose(scratch, 0, 0, 0, 0, ax, ay, az, angle);
  multiply(out, base, scratch, o);
  out[o + 12] = tx;
  out[o + 13] = ty;
  out[o + 14] = tz;
  return out;
}
const scratch = new Float32Array(16);

export function perspective(out: Mat4, fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

export function ortho(out: Mat4, l: number, r: number, b: number, t: number, n: number, f: number): Mat4 {
  out.fill(0);
  out[0] = 2 / (r - l);
  out[5] = 2 / (t - b);
  out[10] = -2 / (f - n);
  out[12] = -(r + l) / (r - l);
  out[13] = -(t + b) / (t - b);
  out[14] = -(f + n) / (f - n);
  out[15] = 1;
  return out;
}

export function lookAt(out: Mat4, eye: ArrayLike<number>, target: ArrayLike<number>, up: ArrayLike<number> = [0, 1, 0]): Mat4 {
  let zx = eye[0]! - target[0]!, zy = eye[1]! - target[1]!, zz = eye[2]! - target[2]!;
  let l = Math.hypot(zx, zy, zz) || 1;
  zx /= l; zy /= l; zz /= l;
  let xx = up[1]! * zz - up[2]! * zy, xy = up[2]! * zx - up[0]! * zz, xz = up[0]! * zy - up[1]! * zx;
  l = Math.hypot(xx, xy, xz) || 1;
  xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * eye[0]! + xy * eye[1]! + xz * eye[2]!);
  out[13] = -(yx * eye[0]! + yy * eye[1]! + yz * eye[2]!);
  out[14] = -(zx * eye[0]! + zy * eye[1]! + zz * eye[2]!);
  out[15] = 1;
  return out;
}

/** General 4×4 inverse (used for picking); returns false when singular. */
export function invert(out: Mat4, m: ArrayLike<number>): boolean {
  const a00 = m[0]!, a01 = m[1]!, a02 = m[2]!, a03 = m[3]!, a10 = m[4]!, a11 = m[5]!, a12 = m[6]!, a13 = m[7]!;
  const a20 = m[8]!, a21 = m[9]!, a22 = m[10]!, a23 = m[11]!, a30 = m[12]!, a31 = m[13]!, a32 = m[14]!, a33 = m[15]!;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return false;
  det = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return true;
}

/** Transform the point (x, y, z, 1) by the matrix at m[o..]; writes [x, y, z, w] to out. */
export function transform4(out: Float64Array | number[], m: ArrayLike<number>, x: number, y: number, z: number, w = 1, o = 0): void {
  out[0] = m[o]! * x + m[o + 4]! * y + m[o + 8]! * z + m[o + 12]! * w;
  out[1] = m[o + 1]! * x + m[o + 5]! * y + m[o + 9]! * z + m[o + 13]! * w;
  out[2] = m[o + 2]! * x + m[o + 6]! * y + m[o + 10]! * z + m[o + 14]! * w;
  out[3] = m[o + 3]! * x + m[o + 7]! * y + m[o + 11]! * z + m[o + 15]! * w;
}

export const TAU = Math.PI * 2;
export const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Smooth ease for animated motion (cubic in-out). */
export const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

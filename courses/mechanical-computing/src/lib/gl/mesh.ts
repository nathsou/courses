/**
 * Procedural meshes for machine parts: pure TypeScript, no DOM, so they are built and tested in Node.
 *
 * A mesh is flat-shaded where a part has sharp edges (tooth flanks, faces) and smooth where it is round
 * (the circumference of a shaft). Units are arbitrary; the course uses one unit ≈ one centimetre.
 * Every builder returns a fresh MeshData; callers cache by key (see ./cache.ts).
 */
import { TAU } from './math.ts';

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  /** Texture coordinates, used only by glyph decals (zero elsewhere). */
  uvs: Float32Array;
  indices: Uint32Array;
  /** Bounding sphere in model space: centre and radius. */
  bounds: [number, number, number, number];
}

/** Accumulates vertices and triangles; `done()` produces typed arrays. */
export class Builder {
  p: number[] = [];
  n: number[] = [];
  t: number[] = [];
  i: number[] = [];

  get count(): number {
    return this.p.length / 3;
  }

  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, u = 0, v = 0): number {
    this.p.push(x, y, z);
    this.n.push(nx, ny, nz);
    this.t.push(u, v);
    return this.count - 1;
  }

  tri(a: number, b: number, c: number): void {
    this.i.push(a, b, c);
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.i.push(a, b, c, a, c, d);
  }

  /** A flat quad from four points in counter-clockwise order (seen from the front). */
  flatQuad(a: ArrayLike<number>, b: ArrayLike<number>, c: ArrayLike<number>, d: ArrayLike<number>): void {
    const ux = b[0]! - a[0]!, uy = b[1]! - a[1]!, uz = b[2]! - a[2]!;
    const vx = d[0]! - a[0]!, vy = d[1]! - a[1]!, vz = d[2]! - a[2]!;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    const i0 = this.vertex(a[0]!, a[1]!, a[2]!, nx, ny, nz);
    const i1 = this.vertex(b[0]!, b[1]!, b[2]!, nx, ny, nz);
    const i2 = this.vertex(c[0]!, c[1]!, c[2]!, nx, ny, nz);
    const i3 = this.vertex(d[0]!, d[1]!, d[2]!, nx, ny, nz);
    this.quad(i0, i1, i2, i3);
  }

  /** Append another mesh, transformed by a rigid placement (translation + rotation about z, then about x). */
  append(m: MeshData, tx = 0, ty = 0, tz = 0, rz = 0, rx = 0): void {
    const base = this.count;
    const cz = Math.cos(rz), sz = Math.sin(rz), cx = Math.cos(rx), sx = Math.sin(rx);
    const rot = (x: number, y: number, z: number): [number, number, number] => {
      const x1 = x * cz - y * sz, y1 = x * sz + y * cz;
      return [x1, y1 * cx - z * sx, y1 * sx + z * cx];
    };
    for (let k = 0; k < m.positions.length; k += 3) {
      const [x, y, z] = rot(m.positions[k]!, m.positions[k + 1]!, m.positions[k + 2]!);
      const [nx, ny, nz] = rot(m.normals[k]!, m.normals[k + 1]!, m.normals[k + 2]!);
      this.vertex(x + tx, y + ty, z + tz, nx, ny, nz, m.uvs[(k / 3) * 2]!, m.uvs[(k / 3) * 2 + 1]!);
    }
    for (const idx of m.indices) this.i.push(idx + base);
  }

  done(): MeshData {
    const positions = new Float32Array(this.p);
    let cx = 0, cy = 0, cz = 0;
    const n = positions.length / 3 || 1;
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < positions.length; k += 3) {
      for (let a = 0; a < 3; a++) {
        lo[a] = Math.min(lo[a]!, positions[k + a]!);
        hi[a] = Math.max(hi[a]!, positions[k + a]!);
      }
    }
    if (!positions.length) lo = hi = [0, 0, 0];
    cx = (lo[0]! + hi[0]!) / 2; cy = (lo[1]! + hi[1]!) / 2; cz = (lo[2]! + hi[2]!) / 2;
    let r = 0;
    for (let k = 0; k < positions.length; k += 3) r = Math.max(r, Math.hypot(positions[k]! - cx, positions[k + 1]! - cy, positions[k + 2]! - cz));
    void n;
    return { positions, normals: new Float32Array(this.n), uvs: new Float32Array(this.t), indices: new Uint32Array(this.i), bounds: [cx, cy, cz, r] };
  }
}

/**
 * Extrude a closed 2D outline that is star-shaped about the origin (every ray from the origin crosses it
 * once: gears, cams, discs, ratchets) between z = -w/2 and z = +w/2, with an optional circular bore.
 * Points must go counter-clockwise.
 */
export function extrudeStar(outline: [number, number][], w: number, bore = 0, b = new Builder()): Builder {
  const n = outline.length;
  const z0 = -w / 2, z1 = w / 2;
  // Faces (front +z and back -z): a ring of quads between the bore and the outline, or a fan.
  for (const [z, nz] of [[z1, 1], [z0, -1]] as const) {
    const ring: number[] = [], inner: number[] = [];
    for (const [x, y] of outline) {
      ring.push(b.vertex(x, y, z, 0, 0, nz));
      const a = Math.atan2(y, x);
      inner.push(b.vertex(bore * Math.cos(a), bore * Math.sin(a), z, 0, 0, nz));
    }
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n;
      if (nz > 0) b.quad(inner[k]!, ring[k]!, ring[k1]!, inner[k1]!);
      else b.quad(inner[k]!, inner[k1]!, ring[k1]!, ring[k]!);
    }
  }
  // Side walls, flat per edge.
  for (let k = 0; k < n; k++) {
    const [x0, y0] = outline[k]!, [x1, y1] = outline[(k + 1) % n]!;
    b.flatQuad([x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1]);
  }
  if (bore > 0) {
    // The bore wall, smooth, facing inwards.
    const seg = n;
    const idx: number[] = [];
    for (let k = 0; k < seg; k++) {
      const a = Math.atan2(outline[k]![1], outline[k]![0]);
      const c = Math.cos(a), s = Math.sin(a);
      idx.push(b.vertex(bore * c, bore * s, z0, -c, -s, 0), b.vertex(bore * c, bore * s, z1, -c, -s, 0));
    }
    for (let k = 0; k < seg; k++) {
      const k1 = (k + 1) % seg;
      b.quad(idx[2 * k]!, idx[2 * k + 1]!, idx[2 * k1 + 1]!, idx[2 * k1]!);
    }
  }
  return b;
}

/** Outline of an involute spur gear: `teeth` teeth of module `m` (pitch radius m·teeth/2), 20° pressure angle. */
export function gearOutline(teeth: number, m: number, samples = 4): [number, number][] {
  const rp = (m * teeth) / 2;
  const ra = rp + m * 0.95;
  const rr = Math.max(rp - 1.2 * m, m * 0.6);
  const alpha = (20 * Math.PI) / 180;
  const rb = rp * Math.cos(alpha);
  const inv = (phi: number) => Math.tan(phi) - phi;
  const half = (r: number) => Math.PI / (2 * teeth) + inv(alpha) - (r <= rb ? 0 : inv(Math.acos(rb / r)));
  const pts: [number, number][] = [];
  const step = TAU / teeth;
  const rs = Math.max(rb, rr);
  for (let t = 0; t < teeth; t++) {
    const c = t * step;
    // Root arc before this tooth.
    const prevRight = c - step + half(rs);
    const left = c - half(rs);
    for (let k = 1; k < samples; k++) {
      const a = prevRight + ((left - prevRight) * k) / samples;
      pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
    }
    // Left flank, going out.
    for (let k = 0; k <= samples; k++) {
      const r = rs + ((ra - rs) * k) / samples;
      const a = c - half(r);
      const rr2 = k === 0 && rs > rr ? rr : r;
      if (k === 0 && rs > rr) pts.push([rr2 * Math.cos(a), rr2 * Math.sin(a)]);
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    // Right flank, coming in.
    for (let k = samples; k >= 0; k--) {
      const r = rs + ((ra - rs) * k) / samples;
      const a = c + half(r);
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
      if (k === 0 && rs > rr) pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
    }
  }
  return pts;
}

export function gear(teeth: number, m: number, w: number, bore = 0): MeshData {
  return extrudeStar(gearOutline(teeth, m), w, bore).done();
}

/** A ratchet wheel: `teeth` saw teeth between radii r0 and r1. */
export function ratchetOutline(teeth: number, r0: number, r1: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let t = 0; t < teeth; t++) {
    const a = (t / teeth) * TAU, a2 = ((t + 0.96) / teeth) * TAU;
    pts.push([r0 * Math.cos(a), r0 * Math.sin(a)], [r1 * Math.cos(a2), r1 * Math.sin(a2)]);
  }
  return pts;
}

export function circleOutline(r: number, seg = 48): [number, number][] {
  return Array.from({ length: seg }, (_, k) => [r * Math.cos((k / seg) * TAU), r * Math.sin((k / seg) * TAU)] as [number, number]);
}

/** A plain disc (cylinder about z) with optional bore. */
export function disc(r: number, w: number, bore = 0, seg = 48): MeshData {
  return extrudeStar(circleOutline(r, seg), w, bore).done();
}

/**
 * Surface of revolution about the y axis. `profile` is a list of (radius, y) points; each segment is
 * shaded flat along the profile and smooth around the axis.
 */
export function lathe(profile: [number, number][], seg = 40, b = new Builder()): Builder {
  for (let k = 0; k < profile.length - 1; k++) {
    const [r0, y0] = profile[k]!, [r1, y1] = profile[k + 1]!;
    // Normal of the profile segment in the (r, y) plane.
    let nr = y1 - y0, ny = -(r1 - r0);
    const l = Math.hypot(nr, ny) || 1;
    nr /= l; ny /= l;
    const ring: number[] = [];
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * TAU, c = Math.cos(a), sn = Math.sin(a);
      ring.push(b.vertex(r0 * c, y0, r0 * sn, nr * c, ny, nr * sn), b.vertex(r1 * c, y1, r1 * sn, nr * c, ny, nr * sn));
    }
    // Counter-clockwise seen from outside: up the profile, then round.
    for (let s = 0; s < seg; s++) b.quad(ring[2 * s]!, ring[2 * s + 1]!, ring[2 * s + 3]!, ring[2 * s + 2]!);
  }
  return b;
}

/** A closed cylinder along y from y0 to y1. */
export function cylinderY(r: number, y0: number, y1: number, seg = 32): MeshData {
  return lathe([[0, y0], [r, y0], [r, y1], [0, y1]], seg).done();
}

/** A closed cylinder along z, centred on the origin, length `len`. */
export function cylinderZ(r: number, len: number, seg = 32): MeshData {
  return rotateToZ(cylinderY(r, -len / 2, len / 2, seg));
}

/** Rotate a mesh built along y so that its axis is z (x stays x). */
export function rotateToZ(m: MeshData): MeshData {
  const b = new Builder();
  b.append(m, 0, 0, 0, 0, Math.PI / 2);
  return b.done();
}

/** An axis-aligned box centred on (cx, cy, cz). */
export function box(w: number, h: number, d: number, cx = 0, cy = 0, cz = 0, b = new Builder()): Builder {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  b.flatQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  b.flatQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  b.flatQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
  b.flatQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  b.flatQuad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  b.flatQuad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  return b;
}

/**
 * Extrude any simple polygon (counter-clockwise, no holes) along z by `w`, centred on z = 0. Faces are
 * triangulated by ear clipping. Used for levers, plates and frames.
 */
export function extrudePolygon(outline: [number, number][], w: number, b = new Builder()): Builder {
  const tris = earClip(outline);
  for (const [z, nz] of [[w / 2, 1], [-w / 2, -1]] as const) {
    const idx = outline.map(([x, y]) => b.vertex(x, y, z, 0, 0, nz));
    for (const [p, q, r] of tris) nz > 0 ? b.tri(idx[p]!, idx[q]!, idx[r]!) : b.tri(idx[p]!, idx[r]!, idx[q]!);
  }
  const n = outline.length;
  for (let k = 0; k < n; k++) {
    const [x0, y0] = outline[k]!, [x1, y1] = outline[(k + 1) % n]!;
    b.flatQuad([x0, y0, -w / 2], [x1, y1, -w / 2], [x1, y1, w / 2], [x0, y0, w / 2]);
  }
  return b;
}

/** Ear-clipping triangulation of a simple counter-clockwise polygon; returns index triples. */
export function earClip(poly: [number, number][]): [number, number, number][] {
  const idx = poly.map((_, i) => i);
  const out: [number, number, number][] = [];
  const cross = (a: number, b: number, c: number) => {
    const [ax, ay] = poly[a]!, [bx, by] = poly[b]!, [cx, cy] = poly[c]!;
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  };
  const inside = (p: number, a: number, b: number, c: number) => cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const a = idx[(k + idx.length - 1) % idx.length]!, b = idx[k]!, c = idx[(k + 1) % idx.length]!;
      if (cross(a, b, c) <= 1e-12) continue;
      if (idx.some((p) => p !== a && p !== b && p !== c && inside(p, a, b, c))) continue;
      out.push([a, b, c]);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) out.push([idx[0]!, idx[1]!, idx[2]!]);
  return out;
}

/**
 * A pin wheel: a disc of radius r and width w with `pins` cylindrical pins of radius pr standing out of its
 * +z face at radius pinR, each `pinLen` long. The Pascaline's wheels and lantern pinions are built from it.
 */
export function pinWheel(r: number, w: number, pins: number, pinR: number, pinRadius: number, pinLen: number, bore = 0): MeshData {
  const b = extrudeStar(circleOutline(r, 48), w, bore);
  const pin = cylinderZ(pinRadius, pinLen, 10);
  for (let k = 0; k < pins; k++) {
    const a = (k / pins) * TAU;
    b.append(pin, pinR * Math.cos(a), pinR * Math.sin(a), w / 2 + pinLen / 2);
  }
  return b.done();
}

/** Spokes: a ring with `n` radial spokes and a hub (a wheel you can see through). */
export function spokedWheel(r: number, w: number, n: number, rim: number, hub: number, spokeW: number): MeshData {
  const b = new Builder();
  // Rim as an annulus.
  const outer = circleOutline(r, 64);
  extrudeStar(outer, w, r - rim, b);
  extrudeStar(circleOutline(hub, 24), w, 0, b);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    const spoke = box(r - rim - hub + 0.02, spokeW, w * 0.8, (r - rim + hub) / 2, 0, 0).done();
    b.append(spoke, 0, 0, 0, a);
  }
  return b.done();
}

/** A rectangular rack or bar with teeth along its top edge (pitch p, tooth height h), length len, along x. */
export function rack(len: number, height: number, w: number, p: number, h: number): MeshData {
  const pts: [number, number][] = [[-len / 2, -height / 2], [len / 2, -height / 2], [len / 2, height / 2]];
  const n = Math.floor(len / p);
  for (let k = n - 1; k >= 0; k--) {
    const x = -len / 2 + k * p;
    pts.push([x + p * 0.75, height / 2], [x + p * 0.6, height / 2 + h], [x + p * 0.4, height / 2 + h], [x + p * 0.25, height / 2]);
  }
  pts.push([-len / 2, height / 2]);
  return extrudePolygon(pts, w).done();
}

// ───────────── Glyph decals ─────────────
// Glyphs live in a 8×8 atlas (src/lib/gl/glyphs.ts draws it in the browser). A decal is a quad whose
// UVs pick one cell; the decal shader keeps only the glyph's ink.

export const GLYPHS = '0123456789+−×÷=.,:ABCDEFGHIJKLMNOPQRSTUVWXYZ?!-/()<>*#%abcdefghijklmnopqrstu';
export const ATLAS = 8;

export function glyphCell(ch: string): [number, number, number, number] {
  let i = GLYPHS.indexOf(ch);
  if (i < 0) i = GLYPHS.indexOf('?');
  const cx = i % ATLAS, cy = Math.floor(i / ATLAS);
  return [cx / ATLAS, cy / ATLAS, (cx + 1) / ATLAS, (cy + 1) / ATLAS];
}

/**
 * Add one glyph quad centred at `c`, spanning `right` (half-width vector) and `up` (half-height vector), with
 * normal right × up. The small `lift` along the normal keeps it clear of the surface beneath.
 */
export function glyph(b: Builder, ch: string, c: ArrayLike<number>, right: ArrayLike<number>, up: ArrayLike<number>, lift = 0.004): void {
  if (ch === ' ') return;
  let nx = right[1]! * up[2]! - right[2]! * up[1]!, ny = right[2]! * up[0]! - right[0]! * up[2]!, nz = right[0]! * up[1]! - right[1]! * up[0]!;
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  const [u0, v0, u1, v1] = glyphCell(ch);
  const px = c[0]! + nx * lift, py = c[1]! + ny * lift, pz = c[2]! + nz * lift;
  const at = (sx: number, sy: number, u: number, v: number) =>
    b.vertex(px + right[0]! * sx + up[0]! * sy, py + right[1]! * sx + up[1]! * sy, pz + right[2]! * sx + up[2]! * sy, nx, ny, nz, u, v);
  const a = at(-1, -1, u0, v1), bb = at(1, -1, u1, v1), cc = at(1, 1, u1, v0), d = at(-1, 1, u0, v0);
  b.quad(a, bb, cc, d);
}

/**
 * Digits round the +z face of a wheel: `n` labels at radius r, the k-th at angle start + dir·k·2π/n, each
 * upright as read from outside the wheel (the glyph's "up" points outward).
 */
export function faceDigits(labels: string[], r: number, z: number, size: number, start = Math.PI / 2, dir = -1): MeshData {
  const b = new Builder();
  const n = labels.length;
  labels.forEach((label, k) => {
    const a = start + (dir * k * TAU) / n;
    const ux = Math.cos(a), uy = Math.sin(a);
    const rx = uy, ry = -ux; // right = up rotated −90°
    const chars = [...label];
    chars.forEach((ch, j) => {
      const off = (j - (chars.length - 1) / 2) * size * 1.1;
      glyph(b, ch, [r * ux + rx * off, r * uy + ry * off, z], [rx * size * 0.55, ry * size * 0.55, 0], [ux * size * 0.55, uy * size * 0.55, 0]);
    });
  });
  return b.done();
}

/**
 * Digits round the rim of a drum whose axis is z: label k at angle start + dir·k·2π/n, at height z0.
 *  - 'axial' (default): each glyph reads across the drum, its top towards −z — a drum seen from its +z end
 *    and above, like the Pascaline's number drums under their windows;
 *  - 'tangent': each glyph runs round the circumference, its top along the direction of rotation;
 *  - 'upright': each glyph stands along the axis, its top towards +z.
 */
export function rimDigits(labels: string[], r: number, size: number, start = 0, dir = 1, mode: 'axial' | 'tangent' | 'upright' = 'axial', z0 = 0): MeshData {
  const b = new Builder();
  const n = labels.length;
  const s = size * 0.55;
  labels.forEach((label, k) => {
    const a = start + (dir * k * TAU) / n;
    const ox = Math.cos(a), oy = Math.sin(a);
    const tx = -oy, ty = ox; // tangent (counter-clockwise)
    const chars = [...label];
    chars.forEach((ch, j) => {
      const off = (j - (chars.length - 1) / 2) * size * 1.05;
      if (mode === 'axial') glyph(b, ch, [r * ox - tx * off, r * oy - ty * off, z0], [-tx * s, -ty * s, 0], [0, 0, -s]);
      else if (mode === 'upright') glyph(b, ch, [r * ox + tx * off, r * oy + ty * off, z0], [tx * s, ty * s, 0], [0, 0, s]);
      else glyph(b, ch, [r * ox, r * oy, z0 + off], [0, 0, -s], [tx * s, ty * s, 0]);
    });
  });
  return b.done();
}

/** A line of text on the z = 0 plane, centred on (x, y), reading along +x. */
export function textQuad(text: string, x: number, y: number, size: number): MeshData {
  const b = new Builder();
  const chars = [...text];
  chars.forEach((ch, j) => {
    const off = (j - (chars.length - 1) / 2) * size * 1.05;
    glyph(b, ch, [x + off, y, 0], [size * 0.55, 0, 0], [0, size * 0.55, 0]);
  });
  return b.done();
}

/** Merge several meshes into one (for parts that never move relative to each other). */
export function merge(...parts: (MeshData | [MeshData, number, number, number, number?, number?])[]): MeshData {
  const b = new Builder();
  for (const p of parts) {
    if (Array.isArray(p)) b.append(p[0], p[1], p[2], p[3], p[4] ?? 0, p[5] ?? 0);
    else b.append(p);
  }
  return b.done();
}

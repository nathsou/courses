/**
 * Picking on the CPU: a ray from the camera through the tapped pixel is tested against each pickable node,
 * first its bounding sphere, then (for nodes whose sphere it hits) every triangle in the node's model space.
 * Meshes are small, so this is far cheaper than an ID render pass and needs no extra GPU memory.
 */
import { getMesh } from './cache.ts';
import { invert, transform4 } from './math.ts';
import type { ModelDef } from './model.ts';

const inv = new Float32Array(16);
const p4 = [0, 0, 0, 0];

/** Ray from normalised device coordinates (x, y in −1..1) through the inverse view-projection. */
export function rayFromNdc(viewProj: Float32Array, x: number, y: number): { o: number[]; d: number[] } | null {
  if (!invert(inv, viewProj)) return null;
  transform4(p4, inv, x, y, -1);
  const o = [p4[0]! / p4[3]!, p4[1]! / p4[3]!, p4[2]! / p4[3]!];
  transform4(p4, inv, x, y, 1);
  const f = [p4[0]! / p4[3]!, p4[1]! / p4[3]!, p4[2]! / p4[3]!];
  const d = [f[0]! - o[0]!, f[1]! - o[1]!, f[2]! - o[2]!];
  const l = Math.hypot(d[0]!, d[1]!, d[2]!);
  return { o, d: d.map((v) => v / l) };
}

/** Index of the nearest pickable node hit by the ray, or −1. */
export function pick<S>(model: ModelDef<S>, matrices: Float32Array, o: number[], d: number[]): number {
  let best = -1, bestT = Infinity;
  const mi = new Float32Array(16);
  model.nodes.forEach((node, i) => {
    if (!node.label) return;
    if (!invert(mi, matrices.subarray(i * 16, i * 16 + 16))) return;
    // Ray in the node's model space.
    transform4(p4, mi, o[0]!, o[1]!, o[2]!, 1);
    const lo = [p4[0]!, p4[1]!, p4[2]!];
    transform4(p4, mi, d[0]!, d[1]!, d[2]!, 0);
    const ld = [p4[0]!, p4[1]!, p4[2]!];
    const ll = Math.hypot(ld[0]!, ld[1]!, ld[2]!);
    for (const p of node.parts) {
      const build = model.meshes[p.mesh];
      if (!build) continue;
      const mesh = getMesh(`${model.key}:${p.mesh}`, build);
      const [cx, cy, cz, r] = mesh.bounds;
      // Sphere test.
      const ox = lo[0]! - cx, oy = lo[1]! - cy, oz = lo[2]! - cz;
      const b = (ox * ld[0]! + oy * ld[1]! + oz * ld[2]!) / (ll * ll);
      const c = (ox * ox + oy * oy + oz * oz - r * r) / (ll * ll);
      if (b * b - c < 0) continue;
      const t = rayMesh(mesh.positions, mesh.indices, lo, ld);
      // t is in units of the model-space direction, which maps back to world distance along d.
      if (t < bestT) {
        bestT = t;
        best = i;
      }
    }
  });
  return best;
}

/** Möller–Trumbore over every triangle; returns the nearest positive t or Infinity. */
export function rayMesh(pos: Float32Array, idx: Uint32Array, o: number[], d: number[]): number {
  let best = Infinity;
  for (let k = 0; k < idx.length; k += 3) {
    const a = idx[k]! * 3, b = idx[k + 1]! * 3, c = idx[k + 2]! * 3;
    const e1x = pos[b]! - pos[a]!, e1y = pos[b + 1]! - pos[a + 1]!, e1z = pos[b + 2]! - pos[a + 2]!;
    const e2x = pos[c]! - pos[a]!, e2y = pos[c + 1]! - pos[a + 1]!, e2z = pos[c + 2]! - pos[a + 2]!;
    const px = d[1]! * e2z - d[2]! * e2y, py = d[2]! * e2x - d[0]! * e2z, pz = d[0]! * e2y - d[1]! * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-12) continue;
    const id = 1 / det;
    const tx = o[0]! - pos[a]!, ty = o[1]! - pos[a + 1]!, tz = o[2]! - pos[a + 2]!;
    const u = (tx * px + ty * py + tz * pz) * id;
    if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (d[0]! * qx + d[1]! * qy + d[2]! * qz) * id;
    if (v < 0 || u + v > 1) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * id;
    if (t > 1e-6 && t < best) best = t;
  }
  return best;
}

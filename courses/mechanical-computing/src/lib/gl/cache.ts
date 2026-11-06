/**
 * CPU-side mesh cache, shared by every view on the page. Meshes are built once per key, timed, and kept,
 * so a view that loses its WebGL context (see ./pool.ts) re-uploads without rebuilding.
 */
import type { MeshData } from './mesh.ts';
import { stats } from './stats.ts';

const cache = new Map<string, MeshData>();

export function getMesh(key: string, build: () => MeshData): MeshData {
  let m = cache.get(key);
  if (!m) {
    const t0 = performance.now();
    m = build();
    const ms = performance.now() - t0;
    stats.meshBuilds.push({ key, ms, triangles: m.indices.length / 3 });
    cache.set(key, m);
  }
  return m;
}

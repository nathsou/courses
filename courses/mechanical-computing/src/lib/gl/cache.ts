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

/** Whether a mesh is already built. */
export function hasMesh(key: string): boolean {
  return cache.has(key);
}

/**
 * Build a model's meshes ahead of time, one per idle period, so that the work (and the JIT warm-up of the mesh
 * code) happens before the view scrolls into sight rather than while it does.
 */
export function prebuild(key: string, meshes: Record<string, () => MeshData>): void {
  const todo = Object.entries(meshes).filter(([name]) => !cache.has(`${key}:${name}`));
  const idle: (cb: () => void) => void =
    typeof requestIdleCallback === 'function' ? (cb) => requestIdleCallback(cb, { timeout: 2000 }) : (cb) => setTimeout(cb, 30);
  const next = () => {
    const item = todo.shift();
    if (!item) return;
    getMesh(`${key}:${item[0]}`, item[1]);
    idle(next);
  };
  idle(next);
}

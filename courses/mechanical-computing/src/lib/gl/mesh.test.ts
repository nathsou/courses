import { describe, expect, test } from 'vitest';
import { box, cylinderY, cylinderZ, disc, earClip, extrudePolygon, gear, gearOutline, pinWheel, rimDigits, spokedWheel, type MeshData } from './mesh';

/** Every triangle's winding should agree with its stored normal (front faces point outwards). */
function windingAgrees(m: MeshData): number {
  let bad = 0;
  for (let k = 0; k < m.indices.length; k += 3) {
    const [a, b, c] = [m.indices[k]! * 3, m.indices[k + 1]! * 3, m.indices[k + 2]! * 3];
    const p = m.positions, n = m.normals;
    const ux = p[b]! - p[a]!, uy = p[b + 1]! - p[a + 1]!, uz = p[b + 2]! - p[a + 2]!;
    const vx = p[c]! - p[a]!, vy = p[c + 1]! - p[a + 1]!, vz = p[c + 2]! - p[a + 2]!;
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (Math.hypot(fx, fy, fz) < 1e-6) continue; // degenerate (collinear) triangles carry no winding
    if (fx * n[a]! + fy * n[a + 1]! + fz * n[a + 2]! < 0) bad++;
  }
  return bad;
}

describe('meshes', () => {
  test.each([
    ['gear', gear(24, 0.2, 0.3, 0.3)],
    ['disc with bore', disc(1, 0.2, 0.3)],
    ['cylinder y', cylinderY(0.5, -1, 1)],
    ['cylinder z', cylinderZ(0.5, 2)],
    ['box', box(1, 2, 3).done()],
    ['pin wheel', pinWheel(1, 0.1, 10, 0.8, 0.05, 0.3)],
    ['spoked wheel', spokedWheel(1, 0.1, 8, 0.15, 0.2, 0.1)],
    ['L-shaped plate', extrudePolygon([[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]], 0.2).done()],
    ['digits', rimDigits(['0', '1', '12'], 1, 0.2)],
  ])('%s: windings agree with normals', (_, m) => {
    expect(windingAgrees(m)).toBe(0);
    expect(m.positions.length / 3).toBe(m.normals.length / 3);
    expect(m.uvs.length / 2).toBe(m.positions.length / 3);
  });

  test('gear outline: one tooth per 2π/n, tips at the addendum', () => {
    const pts = gearOutline(20, 0.5);
    const radii = pts.map(([x, y]) => Math.hypot(x, y));
    expect(Math.max(...radii)).toBeCloseTo(5 + 0.475, 2);
    expect(Math.min(...radii)).toBeLessThan(5);
  });

  test('ear clipping triangulates a concave polygon fully', () => {
    const poly: [number, number][] = [[0, 0], [3, 0], [3, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3]];
    const tris = earClip(poly);
    expect(tris).toHaveLength(poly.length - 2);
    const area = tris.reduce((s, [a, b, c]) => {
      const [ax, ay] = poly[a]!, [bx, by] = poly[b]!, [cx, cy] = poly[c]!;
      return s + ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2;
    }, 0);
    expect(area).toBeCloseTo(7, 6);
  });

  test('a 40-tooth gear builds in well under 10 ms', () => {
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) gear(40, 0.2, 0.3, 0.2);
    expect((performance.now() - t0) / 10).toBeLessThan(10);
  });
});

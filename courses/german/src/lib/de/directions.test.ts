import { describe as group, expect, it } from 'vitest';
import { blockBeside, blockOpposite, describe, simpleRoutes, step, walk, START, COLS, ROWS, type Move } from './directions';

const S: Move = 'S';

group('walking', () => {
  it('starts south of the town facing north', () => {
    expect(walk([S]).at(-1)).toEqual({ x: 2, y: 3, h: 'N' });
    expect(step(START, 'L')).toBeNull();
  });
  it('turns left and right', () => {
    expect(walk([S, S, 'L']).at(-1)).toEqual({ x: 1, y: 2, h: 'W' });
    expect(walk([S, S, 'R']).at(-1)).toEqual({ x: 3, y: 2, h: 'E' });
  });
  it('stops at the edge of the town', () => {
    expect(() => walk([S, S, S, S, S])).toThrow();
    expect(() => walk([S, 'R', 'R'])).toThrow();
  });
});

group('buildings beside the street', () => {
  it('knows left from right whichever way you face', () => {
    const [, a, b] = walk([S, S]);
    expect(blockBeside(a!, b!, 'L')).toEqual({ c: 1, r: 2 });
    expect(blockBeside(a!, b!, 'R')).toEqual({ c: 2, r: 2 });
    const p = walk([S, S, 'L']);
    // Heading west along y = 2: north (row 1) is on the right.
    expect(blockBeside(p[2]!, p[3]!, 'R')).toEqual({ c: 1, r: 1 });
    expect(blockBeside(p[2]!, p[3]!, 'L')).toEqual({ c: 1, r: 2 });
    expect(blockOpposite(p[2]!, p[3]!, 'R')).toEqual({ c: 1, r: 2 });
  });
  it('finds nothing beyond the edge', () => {
    const p = walk([S, 'L']);
    expect(blockBeside(p[1]!, p[2]!, 'L')).toBeNull();
    expect(blockBeside(p[1]!, p[2]!, 'R')).toEqual({ c: 1, r: 2 });
  });
});

group('describe', () => {
  it('says the first and second street', () => {
    expect(describe([S, 'R'], 'L')).toBe('Gehen Sie die erste Straße rechts. Dann ist es auf der linken Seite.');
    expect(describe([S, S, 'L'], 'R', { clue: 'neben der Bank' })).toBe('Gehen Sie geradeaus und dann die zweite Straße links. Dann ist es auf der rechten Seite, neben der Bank.');
  });
  it('goes to the end of the street', () => {
    expect(describe([S, S, S, S, 'R'], 'R', { goal: 'das Kino' })).toBe('Gehen Sie geradeaus bis zum Ende der Straße und dann rechts. Das Kino ist dann auf der rechten Seite.');
  });
  it('crosses crossings', () => {
    expect(describe([S, S], 'L')).toBe('Gehen Sie geradeaus über die erste Kreuzung. Dann ist es auf der linken Seite.');
    expect(describe([S, S, S], 'R')).toBe('Gehen Sie geradeaus über zwei Kreuzungen. Dann ist es auf der rechten Seite.');
    expect(describe([S, S, 'L', S], 'R')).toBe('Gehen Sie geradeaus und dann die zweite Straße links, dann geradeaus über die nächste Kreuzung. Dann ist es auf der rechten Seite.');
  });
  it('chains several turns', () => {
    expect(describe([S, 'R', 'L', 'R'], 'L', { goal: 'die Post' })).toBe('Gehen Sie die erste Straße rechts, dann die erste Straße links, dann die erste Straße rechts. Die Post ist dann auf der linken Seite.');
  });
  it('describes the way so far without a goal', () => {
    expect(describe([])).toBe('');
    expect(describe([S])).toBe('Gehen Sie geradeaus.');
    expect(describe([S, S, 'L'])).toBe('Gehen Sie geradeaus und dann die zweite Straße links.');
  });
});

group('simple routes', () => {
  it('reaches every block with at most one turn, and only real blocks', () => {
    const routes = simpleRoutes();
    const reached = new Set(routes.map((r) => `${r.block.c},${r.block.r}`));
    for (const r of routes) {
      expect(r.block.c).toBeGreaterThanOrEqual(0);
      expect(r.block.c).toBeLessThan(COLS);
      expect(r.block.r).toBeLessThan(ROWS);
      expect(r.moves.filter((m) => m !== 'S').length).toBeLessThanOrEqual(1);
      expect(() => describe(r.moves, r.side)).not.toThrow();
    }
    expect(reached.size).toBeGreaterThanOrEqual(8);
  });
});

import { describe, expect, test } from 'vitest';
import { buildCallGraph, targetsBySite } from './callgraph.js';

const shapes = `class Shape {
  area() { return 0; }
  describe() { return 'area ' + this.area(); }
}
class Circle extends Shape {
  constructor(r) { super(); this.r = r; }
  area() { return 3 * this.r * this.r; }
}
class Square extends Shape {
  constructor(s) { super(); this.s = s; }
  area() { return this.s * this.s; }
}
class Polygon extends Shape {
  area() { return triangulate(this).length; }
}
function triangulate(p) { return []; }
function total(list) {
  let sum = 0;
  list.forEach((s) => { sum += s.area(); });
  return sum;
}
const report = { area: (n) => n + ' m²' };
const all = [new Circle(1), new Square(2)];
console.log(report.area(total(all)));
`;

const callbacks = `function retry(task, times) {
  for (let i = 0; i < times; i++) {
    if (task()) return true;
  }
  return false;
}
function ping() { return fetchStatus() === 200; }
function fetchStatus() { return 200; }
function makeLogger(prefix) {
  return (msg) => console.log(prefix + msg);
}
const log = makeLogger('[net] ');
retry(ping, 3);
log('done');
`;

describe('call graphs', () => {
  test('names: every method called area', () => {
    const g = buildCallGraph(shapes, 'names');
    const t = targetsBySite(g);
    expect(t.get('s.area()@19')).toEqual(['Circle.area', 'Polygon.area', 'Shape.area', 'Square.area', 'area']);
    expect(t.get('list.forEach()@19')).toEqual(['<anonymous, line 19> (via forEach)']);
    expect(g.reachable.has(g.fns.find((f) => f.name === 'triangulate')!.id)).toBe(true);
  });
  test('rta: only instantiated classes', () => {
    const g = buildCallGraph(shapes, 'rta');
    const t = targetsBySite(g);
    expect(t.get('s.area()@19')).toEqual(['Circle.area', 'Shape.area', 'Square.area', 'area']);
    expect(g.reachable.has(g.fns.find((f) => f.name === 'triangulate')!.id)).toBe(false);
  });
  test('flow: callbacks through parameters and returns', () => {
    const names = targetsBySite(buildCallGraph(callbacks, 'names'));
    expect(names.get('task()@3')).toEqual([]);
    expect(names.get('log()@14')).toEqual([]);
    const g = buildCallGraph(callbacks, 'flow');
    const t = targetsBySite(g);
    expect(t.get('task()@3')).toEqual(['ping']);
    expect(t.get('log()@14')).toEqual(['<anonymous, line 10>']);
    expect(t.get('retry()@13')).toEqual(['retry']);
    expect(g.reachable.has(g.fns.find((f) => f.name === 'fetchStatus')!.id)).toBe(true);
  });
  test('flow: field-based merges properties by name', () => {
    const t = targetsBySite(buildCallGraph(shapes, 'flow'));
    expect(t.get('s.area()@19')).toEqual(['Circle.area', 'Polygon.area', 'Shape.area', 'Square.area', 'area']);
    expect(t.get('new Circle()@23')).toEqual(['Circle.constructor']);
  });
  test('recursion and exports', () => {
    const g = buildCallGraph(`export function even(n) { return n === 0 || odd(n - 1); }\nfunction odd(n) { return n !== 0 && even(n - 1); }\nfunction unused() {}`, 'names');
    expect([...g.reachable].map((f) => g.fns[f]!.name).sort()).toEqual(['<module>', 'even', 'odd']);
  });
});

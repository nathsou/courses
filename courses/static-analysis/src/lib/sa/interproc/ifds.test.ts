import { describe, expect, test } from 'vitest';
import { analyseTaint, buildSupergraph, explodedEdges } from './ifds.js';

const identity = `function id(x) {
  return x;
}
function main() {
  const secret = source();
  const a = id(secret);
  const b = id('public');
  sink(b);
  sink(a);
}`;

describe('IFDS taint', () => {
  test('context-sensitive: only the real leak', () => {
    const r = analyseTaint(identity);
    expect(r.leaks.map((l) => `${l.fn}:${r.graph.fns.get(l.fn)!.nodes[l.node]!.text}`)).toEqual(['main:sink(a);']);
    expect([...r.summaries.get('id')!.get('x')!]).toEqual(expect.arrayContaining(['<ret>']));
  });
  test('context-insensitive: the unrealizable path leaks too', () => {
    const r = analyseTaint(identity, { contextSensitive: false });
    expect(r.leaks.map((l) => r.graph.fns.get(l.fn)!.nodes[l.node]!.text).sort()).toEqual(['sink(a);', 'sink(b);']);
  });
  test('sanitizers, kills and nested calls', () => {
    const src = `function clean(v) { return sanitize(v); }
function wrap(v) { const w = 'pre' + v; return w; }
function main() {
  let x = source();
  const y = clean(x);
  sink(y);
  const z = wrap(x);
  sink(z.trim());
  x = 'safe';
  sink(x);
}`;
    const r = analyseTaint(src);
    expect(r.leaks.map((l) => r.graph.fns.get(l.fn)!.nodes[l.node]!.text)).toEqual(['sink(z.trim());']);
  });
  test('taint through parameters to a sink in a callee, and recursion', () => {
    const src = `function log(m, n) { if (n > 0) { log(m, n - 1); } else { sink(m); } }
function main() { const t = source(); log(t, 3); log('ok', 2); }`;
    const r = analyseTaint(src);
    expect(r.leaks.map((l) => `${l.fn}:${l.fact}`)).toEqual(['log:m']);
  });
  test('the exploded supergraph has the four kinds of edges', () => {
    const kinds = new Set(explodedEdges(buildSupergraph(identity)).map((e) => e.kind));
    expect([...kinds].sort()).toEqual(['call', 'call-to-return', 'normal', 'return']);
  });
});

test('the recursive figure of chapter 26', () => {
  const src = `function check(v, depth) {
  if (depth > 0) {
    return check(v, depth - 1);
  }
  return v;
}
function main() {
  const t = source();
  const ok = check('constant', 2);
  const bad = check(t, 1);
  sink(ok);
  sink(bad);
  sink(sanitize(bad));
}`;
  const text = (r: ReturnType<typeof analyseTaint>) => r.leaks.map((l) => r.graph.fns.get(l.fn)!.nodes[l.node]!.text).sort();
  expect(text(analyseTaint(src))).toEqual(['sink(bad);']);
  expect(text(analyseTaint(src, { contextSensitive: false }))).toEqual(['sink(bad);', 'sink(ok);']);
});

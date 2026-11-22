import { expect, test } from 'vitest';
import { COLS_PER_LAMBDA, inverterFlow, masks, waferAfter } from './xsection';

const flow = inverterFlow();
const done = waferAfter(flow.length - 1, flow);
const at = (x: number) => done.cols[Math.floor(x * COLS_PER_LAMBDA)]!;

test('masks come from the layout: two active islands, two gates, four contacts', () => {
  const m = masks();
  expect(m.active).toEqual([[6, 26], [38, 58]]);
  expect(m.poly).toEqual([[14, 16], [46, 48]]);
  expect(m.contact.length).toBe(4);
});

test('shallow trench isolation: oxide-filled trenches between and around the islands', () => {
  expect(at(2).si).toBeLessThan(0);
  expect(at(32).si).toBeLessThan(0);
  expect(at(10).si).toBe(0);
  expect(at(2).stack[0]!.mat).toBe('oxide');
});

test('wells and self-aligned sources and drains', () => {
  expect(at(10).well).toBe('n');
  expect(at(50).well).toBe('p');
  expect(at(12).sd).toBe('p+');
  expect(at(44).sd).toBe('n+');
  expect(at(15).sd).toBe(null);
  expect(at(47).sd).toBe(null);
  expect(at(2).sd).toBe(null);
});

test('gates of polysilicon on thin oxide', () => {
  expect(at(15).stack.map((f) => f.mat).slice(0, 2)).toEqual(['oxide', 'poly']);
  expect(at(15).stack[0]!.t).toBeLessThan(2);
});

test('tungsten plugs in the contacts, copper above them, and a flat top', () => {
  for (const x of [9, 21, 41, 53]) {
    expect(at(x).stack.map((f) => f.mat)).toContain('tungsten');
    expect(at(x).stack.at(-1)!.mat).toBe('copper');
    expect(at(x).stack[0]!.mat).toBe('tungsten');
  }
  expect(at(30).stack.map((f) => f.mat)).not.toContain('copper');
  // Tungsten only in the contact holes: none left on top of the glass elsewhere.
  for (const x of [12, 17, 44, 50]) expect(at(x).stack.map((f) => f.mat)).not.toContain('tungsten');
  const tops = done.cols.map((c) => done.height(c));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1e-6);
});

test('no resist is left at the end', () => {
  expect(done.cols.every((c) => c.stack.every((f) => f.mat !== 'resist'))).toBe(true);
});

import { describe, expect, test } from 'vitest';
import { run } from '../datalog/datalog.js';
import { ANDERSEN_RULES, andersen, extract, steensgaard, toDatalog } from './pointsto.js';

const show = (m: Map<string, Set<string>>, vars: string[]) => Object.fromEntries(vars.map((v) => [v, [...(m.get(v) ?? [])].sort()]));

const classic = `const a = {};
const b = {};
let p = a;
let q = b;
p = q;`;

const fields = `const user = {};
const input = { value: 1 };
const alias = user;
alias.name = input;
const n = user.name;
const box = { item: user };
const out = box.item.name;`;

describe('points-to', () => {
  test('extraction', () => {
    const { facts, sites } = extract(classic);
    expect(sites.map((s) => `${s.id} ${s.label} ${s.line}`)).toEqual(['o1 {…} 1', 'o2 {…} 2']);
    expect(toDatalog(facts)).toBe('new(a, o1).\nnew(b, o2).\nassign(p, a).\nassign(q, b).\nassign(p, q).');
  });
  test('Andersen keeps a and b apart', () => {
    const { facts } = extract(classic);
    expect(show(andersen(facts).pts, ['a', 'b', 'p', 'q'])).toEqual({ a: ['o1'], b: ['o2'], p: ['o1', 'o2'], q: ['o2'] });
  });
  test('Steensgaard merges them', () => {
    const { facts, sites } = extract(classic);
    const r = steensgaard(facts, sites.map((s) => s.id));
    expect(show(r.pts, ['a', 'b', 'p', 'q'])).toEqual({ a: ['o1', 'o2'], b: ['o1', 'o2'], p: ['o1', 'o2'], q: ['o1', 'o2'] });
    expect(r.classes!.get('o1')).toBe(r.classes!.get('o2'));
  });
  test('fields through aliases', () => {
    const { facts, sites } = extract(fields);
    const r = andersen(facts);
    const input = sites.find((s) => s.line === 2)!.id;
    expect([...r.pts.get('n')!]).toEqual([input]);
    expect([...r.pts.get('out')!]).toEqual([input]);
    const s = steensgaard(facts, sites.map((x) => x.id));
    expect([...s.pts.get('out')!]).toEqual([input]);
  });
  test('Andersen in Datalog agrees with the solver', () => {
    for (const src of [classic, fields]) {
      const { facts, vars } = extract(src);
      const solved = andersen(facts);
      const dl = run(`${toDatalog(facts)}\n${ANDERSEN_RULES}`);
      const fromDatalog = new Map<string, Set<string>>();
      for (const [v, o] of dl.relations.get('pts')!) fromDatalog.set(v!, (fromDatalog.get(v!) ?? new Set()).add(o!));
      expect(show(fromDatalog, vars)).toEqual(show(solved.pts, vars));
    }
  });
  test('Steensgaard is never more precise than Andersen', () => {
    const src = `const x = {}; const y = {}; const z = [x, y]; let w = z[0]; const k = { f: x }; k.f = y; let m = k.f; w = m; const g = function () {}; const h = w || g;`;
    const { facts, sites, vars } = extract(src);
    const a = andersen(facts);
    const s = steensgaard(facts, sites.map((x) => x.id));
    for (const v of vars) for (const o of a.pts.get(v) ?? []) expect(s.pts.get(v)?.has(o), `${v} → ${o}`).toBe(true);
  });
});

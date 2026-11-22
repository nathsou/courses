import { expect, test } from 'vitest';
import { BUGGY_INVERTER_LAYOUT, INVERTER_LAYOUT, cutAt, drc, extract, lvsInverter, type Layout } from './layout';

test('the inverter layout is DRC clean and LVS clean', () => {
  expect(drc(INVERTER_LAYOUT)).toEqual([]);
  expect(lvsInverter(INVERTER_LAYOUT)).toEqual([]);
  const e = extract(INVERTER_LAYOUT);
  expect(e.transistors.map((t) => t.type).sort()).toEqual(['n', 'p']);
});

test('the buggy layout has exactly four rule violations, one of each kind, and fails LVS', () => {
  const v = drc(BUGGY_INVERTER_LAYOUT);
  expect(v.map((x) => x.rule).sort()).toEqual(['contact-metal', 'endcap', 'spacing', 'well']);
  expect(lvsInverter(BUGGY_INVERTER_LAYOUT).join(' ')).toMatch(/pMOS connects/);
});

test('moving a shape can break connectivity without breaking a rule', () => {
  const moved: Layout = { ...INVERTER_LAYOUT, rects: INVERTER_LAYOUT.rects.map((x) => (x.id === 'c-nout' ? { ...x, x0: 23, x1: 25 } : x)) };
  expect(lvsInverter(moved).length).toBeGreaterThan(0);
});

test('a short circuit is caught by LVS', () => {
  const shorted: Layout = { ...INVERTER_LAYOUT, rects: [...INVERTER_LAYOUT.rects, { id: 'bad', layer: 'metal1', x0: 19, y0: 1, x1: 23, y1: 9 }] };
  expect(lvsInverter(shorted).join(' ')).toMatch(/not on its own net/);
});

test('a cut through the nMOS crosses active, the gate, two contacts and three metal shapes', () => {
  const c = cutAt(INVERTER_LAYOUT, 30);
  expect(c.active).toEqual([[6, 26]]);
  expect(c.poly).toEqual([[14, 16]]);
  expect(c.contact).toEqual([[8, 10], [20, 22]]);
  expect(c.metal1.length).toBe(2);
  expect(c.nwell).toEqual([]);
});

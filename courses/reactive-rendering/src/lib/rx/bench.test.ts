import { describe, expect, test } from 'vitest';
import { ADAPTERS, SCENARIOS, makeRows, measure, resultHtml } from './bench';

const norm = (s: string) => s.replace(/<!---->/g, '');

describe('bench adapters', () => {
  test('makeRows is deterministic and ids are consecutive', () => {
    expect(makeRows(3)).toEqual(makeRows(3));
    expect(makeRows(3, 10).map((r) => r.id)).toEqual([10, 11, 12]);
  });

  describe.each(SCENARIOS)('$label', (scenario) => {
    test('every adapter produces the same page', () => {
      const reference = norm(resultHtml(ADAPTERS[0]!, scenario));
      for (const adapter of ADAPTERS.slice(1)) {
        expect(norm(resultHtml(adapter, scenario)), adapter.id).toBe(reference);
      }
    }, 60000);
  });

  test('the costs differ in the ways the course claims', () => {
    const cost = (scenarioId: string) => Object.fromEntries(ADAPTERS.map((a) => [a.id, measure(a, SCENARIOS.find((s) => s.id === scenarioId)!).stats]));
    const select = cost('select');
    // Selecting a row: the string rebuild rewrites everything; the others touch one or two attributes.
    expect(select.innerhtml!.parsed).toBeGreaterThan(5000);
    for (const id of ['vdom-index', 'vdom-keyed', 'lit', 'signals', 'svelte4']) expect(select[id]!.total, id).toBeLessThan(10);
    const swap = cost('swap');
    expect(swap['vdom-keyed']!.inserted).toBeLessThanOrEqual(3);
    expect(swap['vdom-index']!.texts).toBeGreaterThanOrEqual(4); // rewritten in place by position
    const update = cost('update');
    expect(update.signals!.texts).toBe(100);
    expect(update['vdom-keyed']!.texts).toBe(100);
    const remove = cost('remove');
    expect(remove['vdom-index']!.texts).toBeGreaterThan(1000); // every row after the removed one is rewritten
    expect(remove['vdom-keyed']!.removed).toBe(1);
    expect(remove['vdom-keyed']!.texts).toBe(0);
  }, 120000);
});

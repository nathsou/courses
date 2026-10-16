import { describe, expect, test } from 'vitest';
import { createDocument, toHTML, type MElement } from './dom';
import { counterComponent, createSvelte4, listComponent } from './svelte4';

describe('Svelte 4 runtime and compiled components', () => {
  function counter() {
    const doc = createDocument();
    const rt = createSvelte4(doc, { manual: true });
    const Counter = counterComponent(rt);
    const c = new Counter({ target: doc.body });
    return { doc, rt, c, button: doc.body.querySelector('button') as MElement };
  }

  test('mounts the static structure and the initial text', () => {
    const { doc } = counter();
    expect(doc.body.textContent).toBe('Counter Count: 0 (double 0) +1');
    expect(doc.body.innerHTML).toContain('<div class="counter"><h1>Counter</h1> <p>');
  });

  test('a click invalidates variable 0 (and, via $:, variable 1); one flush updates exactly two text nodes', () => {
    const { doc, rt, button } = counter();
    const masks: number[][] = [];
    rt.onUpdate = (d) => masks.push([...d]);
    const mark = doc.mark();
    button.click();
    expect(doc.statsSince(mark).total).toBe(0); // nothing happens until the flush
    rt.flush();
    expect(masks).toEqual([[0b11]]);
    expect(doc.body.textContent).toBe('Counter Count: 1 (double 2) +1');
    expect(doc.statsSince(mark)).toMatchObject({ texts: 2, created: 0, inserted: 0, attrs: 0 });
  });

  test('three clicks before the flush are one update', () => {
    const { rt, button, doc } = counter();
    button.click();
    button.click();
    button.click();
    rt.flush();
    expect(rt.stats.updates).toBe(1);
    expect(doc.body.textContent).toContain('Count: 3 (double 6)');
  });

  test('the class toggles only when the condition changes', () => {
    const { doc, rt, button } = counter();
    for (let i = 0; i < 5; i++) {
      button.click();
      rt.flush();
    }
    expect(doc.body.querySelector('p')!.className).toBe('');
    button.click();
    rt.flush();
    expect(doc.body.querySelector('p')!.className).toBe('big');
    const mark = doc.mark();
    button.click();
    rt.flush();
    expect(doc.statsSince(mark).attrs).toBe(0); // still big
  });

  test('destroying removes the DOM', () => {
    const { doc, c } = counter();
    c.$destroy();
    expect(doc.body.children).toHaveLength(0);
  });

  describe('each blocks', () => {
    function list() {
      const doc = createDocument();
      const rt = createSvelte4(doc, { manual: true });
      const List = listComponent(rt);
      new List({ target: doc.body });
      const [add, drop, reverse] = doc.body.querySelectorAll('button') as MElement[];
      const lis = () => doc.body.querySelectorAll('li').map((l) => l.textContent);
      return { doc, rt, add: add!, drop: drop!, reverse: reverse!, lis };
    }

    test('adding appends one block', () => {
      const { doc, rt, add, lis } = list();
      const mark = doc.mark();
      add.click();
      rt.flush();
      expect(lis()).toEqual(['a', 'b', 'c', 'x']);
      expect(doc.statsSince(mark)).toMatchObject({ created: 2, texts: 0 });
    });

    test('dropping the first item rewrites every remaining row by position and removes the last', () => {
      const { doc, rt, drop, lis } = list();
      const mark = doc.mark();
      drop.click();
      rt.flush();
      expect(lis()).toEqual(['b', 'c']);
      expect(doc.statsSince(mark)).toMatchObject({ texts: 2, removed: 1 });
    });

    test('reversing rewrites text in place: nothing moves, so nothing keeps its identity', () => {
      const { doc, rt, reverse, lis } = list();
      const before = doc.body.querySelectorAll('li').map((l) => l.id);
      const mark = doc.mark();
      reverse.click();
      rt.flush();
      expect(lis()).toEqual(['c', 'b', 'a']);
      expect(doc.body.querySelectorAll('li').map((l) => l.id)).toEqual(before);
      expect(doc.statsSince(mark)).toMatchObject({ texts: 2, inserted: 0 }); // the middle row is unchanged
    });

    test('serialises', () => {
      const { doc } = list();
      expect(toHTML(doc.body.firstChild!)).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>');
    });
  });
});

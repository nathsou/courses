import { describe, expect, test } from 'vitest';
import { createDocument, toHTML, type MElement } from './dom';
import { describeTemplate, html, render, repeat } from './lit';

const setup = () => {
  const doc = createDocument();
  return { doc, root: doc.body };
};
/** HTML with the part markers (empty comments) removed, for readable expectations. */
const clean = (el: MElement) => el.innerHTML.replace(/<!---->/g, '');

describe('lit-style templates', () => {
  const counter = (n: number, inc: () => void) => html`<p class=${n > 5 ? 'big' : ''}>Count: ${n}</p><button @click=${inc}>+1</button>`;

  test('the first render parses the template once and fills the holes', () => {
    const { doc, root } = setup();
    render(counter(0, () => {}), root);
    expect(clean(root)).toBe('<p class="">Count: 0</p><button>+1</button>');
    expect(doc.ops.filter((o) => o.kind === 'html')).toHaveLength(1);
    expect(doc.ops.filter((o) => o.kind === 'clone')).toHaveLength(1);
  });

  test('an update changes only the holes whose values changed', () => {
    const { doc, root } = setup();
    render(counter(0, () => {}), root);
    const mark = doc.mark();
    render(counter(1, () => {}), root);
    expect(clean(root)).toContain('Count: 1');
    expect(doc.statsSince(mark)).toMatchObject({ texts: 1, attrs: 0, created: 0, parsed: 0 });
  });

  test('rendering identical values does no DOM work at all', () => {
    const { doc, root } = setup();
    const inc = () => {};
    render(counter(3, inc), root);
    const mark = doc.mark();
    render(counter(3, inc), root);
    expect(doc.statsSince(mark).total).toBe(0);
  });

  test('event parts bind once and call the latest handler', () => {
    const { doc, root } = setup();
    const calls: string[] = [];
    render(counter(0, () => calls.push('a')), root);
    const mark = doc.mark();
    render(counter(0, () => calls.push('b')), root);
    expect(doc.statsSince(mark).total).toBe(0);
    (root.querySelector('button') as MElement).click();
    expect(calls).toEqual(['b']);
  });

  test('boolean and property parts', () => {
    const { root } = setup();
    const view = (off: boolean, v: string) => html`<input ?disabled=${off} .value=${v}>`;
    render(view(true, 'x'), root);
    const input = root.querySelector('input')!;
    expect(input.hasAttribute('disabled')).toBe(true);
    expect(input.value).toBe('x');
    render(view(false, 'y'), root);
    expect(input.hasAttribute('disabled')).toBe(false);
    expect(input.value).toBe('y');
  });

  test('nested templates: the same template is updated, a different one replaces it', () => {
    const { doc, root } = setup();
    const a = (t: string) => html`<b>${t}</b>`;
    const b = (t: string) => html`<i>${t}</i>`;
    const view = (flag: boolean, t: string) => html`<div>${flag ? a(t) : b(t)}</div>`;
    render(view(true, 'one'), root);
    const bold = root.querySelector('b')!;
    let mark = doc.mark();
    render(view(true, 'two'), root);
    expect(root.querySelector('b')).toBe(bold);
    expect(doc.statsSince(mark)).toMatchObject({ texts: 1, created: 0 });
    mark = doc.mark();
    render(view(false, 'two'), root);
    expect(clean(root)).toBe('<div><i>two</i></div>');
    expect(root.querySelector('b')).toBeNull();
  });

  test('arrays update by position: a reorder rewrites text instead of moving nodes', () => {
    const { doc, root } = setup();
    const view = (items: string[]) => html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`;
    render(view(['a', 'b', 'c']), root);
    const ids = root.querySelectorAll('li').map((l) => l.id);
    const mark = doc.mark();
    render(view(['c', 'a', 'b']), root);
    expect(clean(root)).toBe('<ul><li>c</li><li>a</li><li>b</li></ul>');
    expect(root.querySelectorAll('li').map((l) => l.id)).toEqual(ids);
    expect(doc.statsSince(mark)).toMatchObject({ texts: 3, inserted: 0 });
  });

  test('arrays grow and shrink', () => {
    const { root } = setup();
    const view = (items: string[]) => html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`;
    render(view(['a']), root);
    render(view(['a', 'b', 'c']), root);
    expect(clean(root)).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>');
    render(view(['b']), root);
    expect(clean(root)).toBe('<ul><li>b</li></ul>');
  });

  test('repeat keeps rows with their keys: a reorder is moves, not rewrites', () => {
    const { doc, root } = setup();
    const view = (items: string[]) => html`<ul>${repeat(items, (i) => i, (i) => html`<li>${i}</li>`)}</ul>`;
    render(view(['a', 'b', 'c', 'd']), root);
    const ids = new Map(root.querySelectorAll('li').map((l) => [l.textContent, l.id]));
    const mark = doc.mark();
    render(view(['d', 'a', 'b', 'c']), root);
    expect(clean(root)).toBe('<ul><li>d</li><li>a</li><li>b</li><li>c</li></ul>');
    expect(root.querySelectorAll('li').map((l) => l.id)).toEqual(['d', 'a', 'b', 'c'].map((k) => ids.get(k)));
    expect(doc.statsSince(mark)).toMatchObject({ texts: 0, created: 0 });
    render(view(['d', 'x', 'a', 'c']), root);
    expect(clean(root)).toBe('<ul><li>d</li><li>x</li><li>a</li><li>c</li></ul>');
  });

  test('serialises with marker comments like the real library', () => {
    const { root } = setup();
    render(html`<p>${'x'}</p>`, root);
    expect(toHTML(root.firstChild!)).toBe('<!---->');
    expect(root.innerHTML).toBe('<!----><p><!---->x</p>');
  });
});

describe('describeTemplate', () => {
  test('lists the parts in value order with their kind and name', () => {
    const t = (n: number, f: () => void) => html`<p class=${'a'} ?hidden=${false}>Count: ${n}</p><button @click=${f}>+1</button>`;
    const strings = t(0, () => {}).strings as readonly string[];
    const d = describeTemplate(strings);
    expect(d.parts.map((p) => [p.index, p.kind, p.name])).toEqual([
      [0, 'attr', 'class'],
      [1, 'bool', 'hidden'],
      [2, 'child', undefined],
      [3, 'event', 'click'],
    ]);
    expect(d.html).toContain('<p>Count: <!----></p>');
  });
});

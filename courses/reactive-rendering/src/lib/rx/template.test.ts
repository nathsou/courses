import { describe, expect, test } from 'vitest';
import { createDocument, toHTML, type MElement } from './dom';
import { createEngine } from './signals';
import { TemplateError, compileAndLoad, compileTemplate, createTemplateRuntime } from './template';

const COUNTER = `
<div class="counter">
  <h1>Counter</h1>
  <p class={count() > 5 ? 'big' : ''}>Count: {count()}</p>
  <button onclick={inc}>+1</button>
</div>`;

function setup() {
  const doc = createDocument();
  const engine = createEngine('colour');
  const rt = createTemplateRuntime(doc, engine);
  return { doc, engine, rt };
}

describe('the compiler', () => {
  test('writes a template, walks to the dynamic nodes and wraps each hole in an effect', () => {
    const c = compileTemplate(COUNTER, { name: 'Counter', scope: ['count', 'inc'] });
    expect(c.html).toBe('<div class="counter"><h1>Counter</h1><p>Count: </p><button>+1</button></div>');
    expect(c.holes).toBe(2);
    expect(c.code).toContain('const _tmpl$1 = template(');
    expect(c.code).toContain('function Counter({ count, inc })');
    expect(c.code).toContain('insert(');
    expect(c.code).toContain('effect(() => setAttribute(');
    expect(c.code).toContain('listen(');
    expect(c.code).toContain('.firstChild.nextSibling');
  });

  test('a hole between static siblings gets a marker comment', () => {
    const c = compileTemplate('<p>{a()} and {b()}</p>', { name: 'P', scope: ['a', 'b'] });
    expect(c.html).toBe('<p><!> and </p>');
  });

  test('reports mistakes with a position', () => {
    expect(() => compileTemplate('<div><p></div>')).toThrow(TemplateError);
    expect(() => compileTemplate('<div>{oops</div>')).toThrow(/Unclosed \{/);
    expect(() => compileTemplate('<a></a><b></b>')).toThrow(/exactly one root/);
  });

  test('expressions may contain braces, quotes and angle brackets', () => {
    const c = compileTemplate(`<p title={a > b ? "x}" : 'y'}>{ items().map((i) => \`\${i}\`).join(',') }</p>`, { scope: ['a', 'b', 'items'] });
    expect(c.holes).toBe(2);
  });
});

describe('running compiled templates', () => {
  test('updating a signal rewrites only the nodes that read it', () => {
    const { doc, engine, rt } = setup();
    const count = engine.signal(0);
    const { component } = compileAndLoad(COUNTER, rt, { name: 'Counter', scope: ['count', 'inc'] });
    const el = component({ count: count.get, inc: () => count.update((n) => n + 1) } as any);
    doc.body.appendChild(el);
    expect(doc.body.innerHTML).toBe('<div class="counter"><h1>Counter</h1><p>Count: 0</p><button>+1</button></div>');
    const mark = doc.mark();
    (el.querySelector('button') as MElement).click();
    expect(doc.body.innerHTML).toContain('Count: 1');
    // One text write. No node was created, inserted or removed.
    expect(doc.statsSince(mark)).toMatchObject({ texts: 1, created: 0, inserted: 0, removed: 0, attrs: 0 });
  });

  test('the attribute effect writes only when its value changes', () => {
    const { doc, engine, rt } = setup();
    const count = engine.signal(5);
    const { component } = compileAndLoad(COUNTER, rt, { name: 'Counter', scope: ['count', 'inc'] });
    const el = component({ count: count.get, inc: () => {} } as any);
    doc.body.appendChild(el);
    const mark = doc.mark();
    count.set(6);
    expect(doc.statsSince(mark)).toMatchObject({ texts: 1, attrs: 1 }); // class="big" appears
    const mark2 = doc.mark();
    count.set(7);
    expect(doc.statsSince(mark2)).toMatchObject({ texts: 1, attrs: 0 }); // still "big"
  });

  test('creating the component is one clone, not one createElement per node', () => {
    const { doc, engine, rt } = setup();
    const count = engine.signal(0);
    const { component } = compileAndLoad(COUNTER, rt, { name: 'Counter', scope: ['count', 'inc'] });
    component({ count: count.get, inc: () => {} } as any);
    component({ count: count.get, inc: () => {} } as any);
    const clones = doc.ops.filter((o) => o.kind === 'clone');
    expect(clones).toHaveLength(2);
    expect(doc.statsSince(0).created).toBe(2); // one text node per instance, made by `insert`; the elements all came from the clone
  });

  test('two holes in one element update independently', () => {
    const { doc, engine, rt } = setup();
    const a = engine.signal('A');
    const b = engine.signal('B');
    const { component } = compileAndLoad('<p>{a()} and {b()}</p>', rt, { name: 'P', scope: ['a', 'b'] });
    const el = component({ a: a.get, b: b.get } as any);
    doc.body.appendChild(el);
    expect(el.textContent).toBe('A and B');
    const mark = doc.mark();
    b.set('Z');
    expect(el.textContent).toBe('A and Z');
    expect(doc.statsSince(mark)).toMatchObject({ texts: 1, total: 1 });
  });

  test('a hole can hold a node: nested compiled components', () => {
    const { doc, engine, rt } = setup();
    const show = engine.signal(true);
    const Inner = compileAndLoad('<b>inner</b>', rt, { name: 'Inner' }).component;
    const Outer = compileAndLoad('<div>{show() ? Inner() : null}<i>after</i></div>', rt, { name: 'Outer', scope: ['show', 'Inner'] }).component;
    const el = Outer({ show: show.get, Inner } as any);
    doc.body.appendChild(el);
    // `<!---->` is the marker comment the compiler left where the hole is.
    expect(toHTML(el)).toBe('<div><b>inner</b><!----><i>after</i></div>');
    show.set(false);
    expect(toHTML(el)).toBe('<div><!----><i>after</i></div>');
    show.set(true);
    expect(toHTML(el)).toBe('<div><b>inner</b><!----><i>after</i></div>');
  });
});

describe('mapArray: lists without a virtual DOM', () => {
  function list() {
    const { doc, engine, rt } = setup();
    const items = engine.signal(['a', 'b', 'c', 'd']);
    const Row = compileAndLoad('<li>{label()}</li>', rt, { name: 'Row', scope: ['label'] }).component;
    const rows = rt.mapArray(items.get, (item) => Row({ label: () => item } as any));
    const Ul = compileAndLoad('<ul>{rows()}</ul>', rt, { name: 'Ul', scope: ['rows'] }).component;
    const el = Ul({ rows } as any);
    doc.body.appendChild(el);
    return { doc, items, el };
  }

  test('renders the rows', () => {
    const { el } = list();
    expect(toHTML(el)).toBe('<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>');
  });

  test('moving the last row to the front is one DOM move; rows are not rebuilt', () => {
    const { doc, items, el } = list();
    const before = el.querySelectorAll('li').map((n) => n.id);
    const mark = doc.mark();
    items.set(['d', 'a', 'b', 'c']);
    expect(toHTML(el)).toBe('<ul><li>d</li><li>a</li><li>b</li><li>c</li></ul>');
    const stats = doc.statsSince(mark);
    expect(stats).toMatchObject({ inserted: 1, created: 0, removed: 0, texts: 0 });
    expect(el.querySelectorAll('li').map((n) => n.id)).toEqual([before[3], before[0], before[1], before[2]]);
  });

  test('adding and removing one item touches one row', () => {
    const { doc, items, el } = list();
    let mark = doc.mark();
    items.set(['a', 'b', 'x', 'c', 'd']);
    expect(toHTML(el)).toBe('<ul><li>a</li><li>b</li><li>x</li><li>c</li><li>d</li></ul>');
    expect(doc.statsSince(mark).removed).toBe(0);
    mark = doc.mark();
    items.set(['a', 'b', 'c', 'd']);
    expect(doc.statsSince(mark)).toMatchObject({ removed: 1, inserted: 0 });
  });
});

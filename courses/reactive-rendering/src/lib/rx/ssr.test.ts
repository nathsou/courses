import { describe, expect, test } from 'vitest';
import { createDocument, type MElement } from './dom';
import { renderToString } from './ssr';
import { Renderer, h, useEffect, useState } from './vdom';

const Counter = ({ start }: { start: number }) => {
  const [n, setN] = useState(start);
  return h('button', { class: 'btn', onClick: () => setN(n + 1) }, 'Clicked ', n, ' times');
};
const App = () => h('main', null, h('h1', null, 'Hello'), h(Counter, { start: 3 }), h('input', { value: 'x', disabled: true }));

function server(html: string) {
  const doc = createDocument();
  doc.body.innerHTML = html;
  doc.clearLog();
  const renderer = new Renderer(doc, { autoFlush: false });
  return { doc, renderer };
}

describe('renderToString', () => {
  test('renders elements, components, attributes and void tags', () => {
    expect(renderToString(h(App))).toBe('<main><h1>Hello</h1><button class="btn">Clicked <!-- -->3<!-- --> times</button><input value="x" disabled=""></main>');
  });

  test('escapes text and attributes', () => {
    expect(renderToString(h('p', { title: 'a"b' }, '<script>&'))).toBe('<p title="a&quot;b">&lt;script&gt;&amp;</p>');
  });

  test('effects do not run on the server', () => {
    let ran = false;
    const C = () => {
      useEffect(() => void (ran = true));
      return h('i', null, 'x');
    };
    expect(renderToString(h(C))).toBe('<i>x</i>');
    expect(ran).toBe(false);
  });
});

describe('hydrate', () => {
  test('claims every node, creates none, and attaches the handlers', () => {
    const { doc, renderer } = server(renderToString(h(App)));
    const report = renderer.hydrate(h(App), doc.body);
    expect(report.mismatches).toEqual([]);
    expect(report.created).toBe(0);
    expect(report.claimed).toBeGreaterThan(5);
    const stats = doc.statsSince(0);
    // The only work: one listener (the click) — no node was created, inserted, removed or rewritten.
    expect(stats).toMatchObject({ created: 0, inserted: 0, removed: 0, texts: 0, attrs: 0, listeners: 1 });
    const button = doc.body.querySelector('button') as MElement;
    button.click();
    renderer.flush();
    expect(button.textContent).toBe('Clicked 4 times');
  });

  test('a text mismatch (the clock moved on) is reported and repaired', () => {
    const { doc, renderer } = server(renderToString(h('p', null, 'It is ', '10:00')));
    const report = renderer.hydrate(h('p', null, 'It is ', '10:01'), doc.body);
    expect(report.mismatches).toEqual([{ kind: 'text', path: 'p[1]', expected: '"10:01"', found: '"10:00"' }]);
    expect(doc.body.textContent).toBe('It is 10:01');
  });

  test('an attribute mismatch is reported', () => {
    const { doc, renderer } = server('<div class="light"></div>');
    const report = renderer.hydrate(h('div', { class: 'dark' }), doc.body);
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({ kind: 'attribute', expected: 'class="dark"', found: 'class="light"' });
    expect((doc.body.firstChild as MElement).className).toBe('dark');
  });

  test('a tag mismatch rebuilds the subtree on the client', () => {
    const { doc, renderer } = server('<div><span>hi</span></div>');
    const report = renderer.hydrate(h('div', null, h('p', null, 'hi')), doc.body);
    expect(report.mismatches[0]).toMatchObject({ kind: 'tag', expected: '<p>', found: '<span>' });
    expect(report.created).toBe(2);
    expect(doc.body.innerHTML).toBe('<div><p>hi</p></div>');
  });

  test('extra server nodes are reported and removed; missing ones are created', () => {
    const extra = server('<ul><li>a</li><li>b</li></ul>');
    const r1 = extra.renderer.hydrate(h('ul', null, h('li', null, 'a')), extra.doc.body);
    expect(r1.mismatches.map((m) => m.kind)).toEqual(['extra']);
    expect(extra.doc.body.innerHTML).toBe('<ul><li>a</li></ul>');
    const missing = server('<ul><li>a</li></ul>');
    const r2 = missing.renderer.hydrate(h('ul', null, h('li', null, 'a'), h('li', null, 'b')), missing.doc.body);
    expect(r2.mismatches.map((m) => m.kind)).toEqual(['tag']);
    expect(missing.doc.body.innerHTML).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  test('effects run after hydration', () => {
    let ran = 0;
    const C = () => {
      useEffect(() => void ran++, []);
      return h('i', null, 'x');
    };
    const { doc, renderer } = server(renderToString(h(C)));
    renderer.hydrate(h(C), doc.body);
    expect(ran).toBe(1);
  });
});

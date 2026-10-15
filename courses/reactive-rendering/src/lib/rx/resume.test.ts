import { describe, expect, test } from 'vitest';
import { createDocument, type MElement } from './dom';
import { bind, h, load, qrl, renderResumable, resume, type ResumableApp } from './resume';

const app = (): ResumableApp => ({
  signals: { count: 3, name: 'Ann' },
  view: () =>
    h('div', null,
      h('p', null, 'Hello ', bind('name') as any),
      h('button', { 'on:click': qrl('increment') }, 'Clicked ', bind('count') as any),
      h('button', { 'on:click': qrl('rename') }, 'Rename'),
    ),
  symbols: {
    increment: { chunk: 'inc.js', bytes: 310, run: (c) => c.set('count', (c.get('count') as number) + 1) },
    rename: { chunk: 'rename.js', bytes: 450, run: (c) => c.set('name', 'Bob') },
  },
});

describe('resumability', () => {
  test('the server writes HTML, state, QRLs and the events to listen for', () => {
    const out = renderResumable(app());
    expect(out.html).toContain('<button on:click="inc.js#increment" q:id="0">Clicked <span q:bind="count">3</span></button>');
    expect(out.html).toContain('<span q:bind="name">Ann</span>');
    expect(out.events).toEqual(['click']);
    expect(JSON.parse(out.stateJson)).toEqual({ signals: { count: 3, name: 'Ann' } });
    expect(out.sizes.total).toBe(out.sizes.html + out.sizes.state + out.sizes.loader);
  });

  test('loading the page runs no application code and downloads only the loader', () => {
    const a = app();
    const out = renderResumable(a);
    const doc = createDocument();
    const root = load(doc, out);
    const r = resume(root, out.stateJson, out.events, a.symbols);
    expect(r.jsRunAtLoad).toBe(0);
    expect(r.jsBytes).toBe(740);
    expect(r.fetched).toEqual([]);
    expect(r.stateParsed).toBe(false);
    expect(doc.ops).toHaveLength(1); // one listener on the container, nothing else
  });

  test('a click fetches one chunk, updates only the bound text, and re-renders nothing', async () => {
    const a = app();
    const out = renderResumable(a);
    const doc = createDocument();
    const root = load(doc, out);
    const r = resume(root, out.stateJson, out.events, a.symbols);
    const mark = doc.mark();
    (root.querySelector('[on:click=inc.js#increment]') as MElement).click();
    await r.idle();
    expect(root.querySelector('[q:bind=count]')!.textContent).toBe('4');
    expect(r.fetched).toEqual([{ chunk: 'inc.js', bytes: 310 }]);
    expect(r.jsBytes).toBe(740 + 310);
    expect(r.stateParsed).toBe(true);
    expect(doc.statsSince(mark)).toMatchObject({ texts: 1, created: 0, inserted: 0 });
  });

  test('a chunk is fetched once however many times it is used; other handlers stay unloaded', async () => {
    const a = app();
    const out = renderResumable(a);
    const doc = createDocument();
    const root = load(doc, out);
    const r = resume(root, out.stateJson, out.events, a.symbols);
    const button = root.querySelector('[on:click=inc.js#increment]') as MElement;
    button.click();
    button.click();
    button.click();
    await r.idle();
    expect(root.querySelector('[q:bind=count]')!.textContent).toBe('6');
    expect(r.fetched).toHaveLength(1);
    expect(r.fetched.map((f) => f.chunk)).not.toContain('rename.js');
  });

  test('a click on text inside the button still finds the handler (event delegation)', async () => {
    const a = app();
    const out = renderResumable(a);
    const doc = createDocument();
    const root = load(doc, out);
    const r = resume(root, out.stateJson, out.events, a.symbols);
    (root.querySelector('[q:bind=count]') as MElement).click();
    await r.idle();
    expect(root.querySelector('[q:bind=count]')!.textContent).toBe('4');
  });
});

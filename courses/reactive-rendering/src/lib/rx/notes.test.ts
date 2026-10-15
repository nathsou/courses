import { describe, expect, test } from 'vitest';
import { createDocument, type MElement } from './dom';
import { NOTES_STRATEGIES, createNotesApp, type NotesStrategy } from './notes';

const norm = (el: MElement) => el.innerHTML.replace(/<!---->/g, '').replace(/ (data-i|id)="[^"]*"/g, '');
const make = (s: NotesStrategy) => {
  const doc = createDocument();
  const app = createNotesApp(s, doc, doc.body);
  return { doc, app, root: doc.body };
};
const ALL = NOTES_STRATEGIES.map((s) => s.id);

describe('the Notes app, six ways', () => {
  test.each(ALL)('%s renders the initial page', (s) => {
    const { root } = make(s);
    expect(norm(root)).toBe('<div class="notes"><input placeholder="Search…"><p>3 notes, 1 done</p><ul><li>✓ Buy milk</li><li>Write chapter</li><li>Call Sam</li></ul></div>');
  });

  test('every strategy agrees after the same sequence of actions', () => {
    const results = ALL.map((s) => {
      const { app, root } = make(s);
      app.add();
      app.toggle(1);
      app.rename(0);
      app.add();
      app.toggle(1);
      app.toggle(3);
      return norm(root);
    });
    for (const r of results.slice(1)) expect(r).toBe(results[0]);
    expect(results[0]).toContain('<p>5 notes, 2 done</p>');
  });

  test('clicking a note toggles it, in every strategy', () => {
    for (const s of ALL) {
      const { root } = make(s);
      (root.querySelectorAll('li')[2] as MElement).click();
      expect(norm(root), s).toContain('<li>✓ Call Sam</li>');
      expect(norm(root), s).toContain('2 done');
    }
  });

  test('renaming a note: only the rebuild touches more than one text node', () => {
    for (const s of ALL) {
      const { doc, app } = make(s);
      const mark = doc.mark();
      app.rename(1);
      const st = doc.statsSince(mark);
      if (s === 'rebuild') expect(st.parsed, s).toBeGreaterThan(5);
      else if (s === 'skip') expect(st, s).toMatchObject({ texts: 1, created: 0, inserted: 0, removed: 0 }); // it also parses the server's HTML
      else expect(st, s).toMatchObject({ texts: 1, created: 0, inserted: 0, removed: 0, parsed: 0 });
    }
  });

  test('toggling a note changes two texts (the note and the summary) everywhere but rebuild', () => {
    for (const s of ALL.filter((x) => x !== 'rebuild')) {
      const { doc, app } = make(s);
      const mark = doc.mark();
      app.toggle(1);
      expect(doc.statsSince(mark), s).toMatchObject({ texts: 2, created: 0, inserted: 0 });
    }
  });

  test('adding a note inserts one <li> and rewrites the summary', () => {
    for (const s of ALL.filter((x) => x !== 'rebuild')) {
      const { doc, app, root } = make(s);
      const before = root.querySelectorAll('li').map((l) => l.id);
      app.add();
      expect(root.querySelectorAll('li').slice(0, 3).map((l) => l.id), s).toEqual(before);
      expect(doc.statsSince(0).removed, s).toBe(0);
    }
  });

  test('text typed in the search box survives every strategy but rebuild', () => {
    for (const s of ALL) {
      const { app, root } = make(s);
      const input = root.querySelector('input') as MElement;
      input.focus();
      input.userInput('mil');
      app.add();
      app.toggle(0);
      const now = root.querySelector('input') as MElement;
      if (s === 'rebuild') {
        expect(now, s).not.toBe(input);
        expect(now.value, s).toBe('');
        expect(input.isConnected, s).toBe(false);
      } else {
        expect(now, s).toBe(input);
        expect(now.value, s).toBe('mil');
        expect(input.isConnected, s).toBe(true);
      }
    }
  });
});

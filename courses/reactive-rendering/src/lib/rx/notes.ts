/**
 * The Notes app, written six ways: the example of the first chapter and of the home page.
 *
 * Every version builds the same page,
 *
 *   <div class="notes">
 *     <input placeholder="Search…">                 ← uncontrolled: the browser owns what is typed in it
 *     <p>3 notes, 1 done</p>
 *     <ul><li>✓ Buy milk</li><li>Write chapter</li>…</ul>
 *   </div>
 *
 * and supports the same three actions: add a note, toggle a note, rename a note. Clicking a note toggles it. What
 * differs is *how the page learns what changed*, and therefore which DOM nodes are touched, which is what the
 * mutation lens shows.
 */
import { Scope } from './digest';
import { MElement, MiniDocument, escapeText } from './dom';
import { morph } from './morph';
import { createEngine } from './signals';
import { createSvelte4, SvelteComponent, type Fragment, type KeyedBlock } from './svelte4';
import { compileAndLoad, createTemplateRuntime } from './template';
import { Renderer, h } from './vdom';

export interface Note {
  id: number;
  text: string;
  done: boolean;
}

export const INITIAL_NOTES: Note[] = [
  { id: 1, text: 'Buy milk', done: true },
  { id: 2, text: 'Write chapter', done: false },
  { id: 3, text: 'Call Sam', done: false },
];

export type NotesStrategy = 'rebuild' | 'check' | 'diff' | 'track' | 'compile' | 'skip';

export interface NotesApp {
  add(): void;
  toggle(index: number): void;
  rename(index: number): void;
  readonly notes: readonly Note[];
}

const NEW_TEXTS = ['Water plants', 'Book flights', 'Fix the bike', 'Read a paper', 'Email Dana', 'Plan the trip'];
export const newText = (n: number) => NEW_TEXTS[n % NEW_TEXTS.length]!;
export const renamed = (t: string) => (t.endsWith('!') ? t.slice(0, -1) : t + '!');
const summary = (notes: readonly Note[]) => `${notes.length} note${notes.length === 1 ? '' : 's'}, ${notes.filter((n) => n.done).length} done`;
const label = (n: Note) => (n.done ? '✓ ' : '') + n.text;

/** The shared state transitions: every strategy applies these and then has to get the DOM to match. */
function makeStore() {
  let notes = INITIAL_NOTES.map((n) => ({ ...n }));
  let nextId = 4;
  let added = 0;
  return {
    get notes() {
      return notes;
    },
    add: () => (notes = [...notes, { id: nextId++, text: newText(added++), done: false }]),
    toggle: (i: number) => (notes = notes.map((n, k) => (k === i ? { ...n, done: !n.done } : n))),
    rename: (i: number) => (notes = notes.map((n, k) => (k === i ? { ...n, text: renamed(n.text) } : n))),
  };
}

export function createNotesApp(strategy: NotesStrategy, doc: MiniDocument, container: MElement): NotesApp {
  switch (strategy) {
    case 'rebuild':
      return rebuild(doc, container);
    case 'check':
      return check(doc, container);
    case 'diff':
      return diff(doc, container);
    case 'track':
      return track(doc, container);
    case 'compile':
      return compile(doc, container);
    case 'skip':
      return skip(doc, container);
  }
}

// ───────────────────────── 1. rebuild: innerHTML ─────────────────────────

function rebuild(doc: MiniDocument, container: MElement): NotesApp {
  const store = makeStore();
  const view = () =>
    `<div class="notes"><input placeholder="Search…"><p>${summary(store.notes)}</p><ul>${store.notes.map((n, i) => `<li data-i="${i}">${escapeText(label(n))}</li>`).join('')}</ul></div>`;
  const draw = () => {
    container.innerHTML = view();
  };
  // One delegated listener, because the <li>s are replaced on every render.
  container.addEventListener('click', (e) => {
    const i = e.target.getAttribute('data-i');
    if (i !== null) {
      store.toggle(Number(i));
      draw();
    }
  });
  draw();
  return {
    get notes() {
      return store.notes;
    },
    add: () => (store.add(), draw()),
    toggle: (i) => (store.toggle(i), draw()),
    rename: (i) => (store.rename(i), draw()),
  };
}

// ───────────────────────── 2. dirty-check: a digest loop ─────────────────────────

function check(doc: MiniDocument, container: MElement): NotesApp {
  const store = makeStore();
  const scope = new Scope();
  scope.notes = store.notes;
  const root = doc.createElement('div');
  root.setAttribute('class', 'notes');
  const input = doc.createElement('input');
  input.setAttribute('placeholder', 'Search…');
  const p = doc.createElement('p');
  p.appendChild(doc.createTextNode(''));
  const ul = doc.createElement('ul');
  root.appendChild(input);
  root.appendChild(p);
  root.appendChild(ul);
  container.appendChild(root);
  // {{summary}}: a watcher that writes the text when the expression's value changes.
  scope.$watch(
    (s) => summary(s.notes),
    (v) => ((p.firstChild as import('./dom').MText).data = v),
  );
  // ng-repeat: one watcher for the list's shape, which creates and removes <li>s, and one watcher per <li> for its text.
  const rows: { li: MElement; off: () => void }[] = [];
  scope.$watch(
    (s) => s.notes.length,
    (n) => {
      while (rows.length < n) {
        const i = rows.length;
        const li = doc.createElement('li');
        li.appendChild(doc.createTextNode(''));
        li.addEventListener('click', () => scope.$apply(() => (scope.notes = (store.toggle(i), store.notes))));
        ul.appendChild(li);
        const off = scope.$watch(
          (s) => (s.notes[i] ? label(s.notes[i]) : ''),
          (v) => ((li.firstChild as import('./dom').MText).data = v),
        );
        rows.push({ li, off });
      }
      while (rows.length > n) {
        const r = rows.pop()!;
        r.off();
        ul.removeChild(r.li);
      }
    },
  );
  scope.$digest();
  return {
    get notes() {
      return store.notes;
    },
    add: () => scope.$apply(() => (scope.notes = (store.add(), store.notes))),
    toggle: (i) => scope.$apply(() => (scope.notes = (store.toggle(i), store.notes))),
    rename: (i) => scope.$apply(() => (scope.notes = (store.rename(i), store.notes))),
  };
}

// ───────────────────────── 3. diff: a virtual DOM ─────────────────────────

function diff(doc: MiniDocument, container: MElement): NotesApp {
  const store = makeStore();
  const renderer = new Renderer(doc, { autoFlush: false, strategy: 'lis' });
  const draw = () =>
    renderer.render(
      h('div', { class: 'notes' }, h('input', { placeholder: 'Search…' }), h('p', null, summary(store.notes)), h('ul', null, store.notes.map((n, i) => h('li', { key: n.id, onClick: () => (store.toggle(i), draw()) }, label(n))))),
      container,
    );
  draw();
  return {
    get notes() {
      return store.notes;
    },
    add: () => (store.add(), draw()),
    toggle: (i) => (store.toggle(i), draw()),
    rename: (i) => (store.rename(i), draw()),
  };
}

// ───────────────────────── 4. track: signals and compiled templates ─────────────────────────

function track(doc: MiniDocument, container: MElement): NotesApp {
  const store = makeStore();
  const engine = createEngine('colour');
  const rt = createTemplateRuntime(doc, engine);
  interface SNote {
    id: number;
    text: ReturnType<typeof engine.signal<string>>;
    done: ReturnType<typeof engine.signal<boolean>>;
  }
  const mk = (n: Note): SNote => ({ id: n.id, text: engine.signal(n.text), done: engine.signal(n.done) });
  const notes = engine.signal<SNote[]>(store.notes.map(mk));
  const lineText = (n: SNote) => (n.done.get() ? '✓ ' : '') + n.text.get();
  const Item = compileAndLoad<{ n: SNote; toggle: () => void }>(`<li onclick={toggle}>{lineText(n)}</li>`, rt, { name: 'Item', scope: ['n', 'toggle', 'lineText'] });
  const text = engine.computed(() => `${notes.get().length} note${notes.get().length === 1 ? '' : 's'}, ${notes.get().filter((n) => n.done.get()).length} done`);
  const Notes = compileAndLoad(`<div class="notes"><input placeholder="Search…"><p>{text.get()}</p><ul>{items()}</ul></div>`, rt, { name: 'Notes', scope: ['text', 'items'] });
  const toggleAt = (i: number) => {
    const n = notes.peek()[i]!;
    n.done.set(!n.done.peek());
  };
  const items = rt.mapArray(notes.get, (n) =>
    Item.component({ n, toggle: () => toggleAt(notes.peek().indexOf(n)), lineText } as never),
  );
  container.appendChild(Notes.component({ text, items } as never));
  return {
    get notes() {
      return notes.peek().map((n) => ({ id: n.id, text: n.text.peek(), done: n.done.peek() }));
    },
    add: () => (store.add(), notes.set([...notes.peek(), mk(store.notes[store.notes.length - 1]!)])),
    toggle: (i) => toggleAt(i),
    rename: (i) => {
      const n = notes.peek()[i]!;
      n.text.set(renamed(n.text.peek()));
    },
  };
}

// ───────────────────────── 5. compile: Svelte-3/4-style bitmasks ─────────────────────────

function compile(doc: MiniDocument, container: MElement): NotesApp {
  const store = makeStore();
  const rt = createSvelte4(doc, { manual: true });
  const { element, text, append, insert, detach, listen, attr, set_data, safe_not_equal, init, update_keyed_each } = rt;

  /* Notes.svelte
       <div class="notes"><input placeholder="Search…"><p>{summary}</p>
         <ul>{#each notes as note, i (note.id)}<li on:click={() => toggle(i)}>{label}</li>{/each}</ul></div>
     ctx: [notes, summary, toggle, add…, note = ctx[5], i = ctx[6]] */
  const get_each_context = (ctx: any[], list: Note[], i: number) => {
    const child = ctx.slice();
    child[5] = list[i];
    child[6] = i;
    return child;
  };
  function create_each_block(ctx: any[]): KeyedBlock {
    let li: MElement;
    let t: ReturnType<typeof text>;
    let t_value = label(ctx[5]);
    let mounted: boolean | undefined;
    let dispose: () => void;
    return {
      key: ctx[5].id,
      first: null,
      c() {
        li = element('li');
        t = text(t_value);
        this.first = li;
      },
      m(target, anchor) {
        insert(target, li, anchor);
        append(li, t);
        if (!mounted) {
          dispose = listen(li, 'click', () => ctx[2](ctx[6]));
          mounted = true;
        }
      },
      p(new_ctx, dirty) {
        ctx = new_ctx; // the click handler reads ctx, so it always sees the block's current index
        if (dirty[0]! & /*notes*/ 1 && t_value !== (t_value = label(ctx[5]))) set_data(t, t_value);
      },
      d(detaching) {
        if (detaching) detach(li);
        mounted = false;
        dispose?.();
      },
    } as KeyedBlock;
  }
  function create_fragment(ctx: any[]): Fragment {
    let div: MElement, input: MElement, p: MElement, t0: ReturnType<typeof text>, ul: MElement;
    let each_blocks: KeyedBlock[] = [];
    let each_value = ctx[0] as Note[];
    for (let i = 0; i < each_value.length; i += 1) each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    return {
      c() {
        div = element('div');
        input = element('input');
        p = element('p');
        t0 = text(/*summary*/ ctx[1]);
        ul = element('ul');
        for (const b of each_blocks) b.c();
        attr(input, 'placeholder', 'Search…');
        attr(div, 'class', 'notes');
      },
      m(target, anchor) {
        insert(target, div, anchor);
        append(div, input);
        append(div, p);
        append(p, t0);
        append(div, ul);
        for (const b of each_blocks) b.m(ul, null);
      },
      p(ctx, [dirty]) {
        if (dirty! & /*summary*/ 2) set_data(t0, /*summary*/ ctx[1]);
        if (dirty! & /*notes*/ 1) {
          each_value = ctx[0] as Note[];
          each_blocks = update_keyed_each(each_blocks, [dirty!], (c) => c[5].id, ctx, each_value, ul, null, create_each_block, get_each_context);
        }
      },
      d(detaching) {
        if (detaching) detach(div);
        for (const b of each_blocks) b.d(0);
      },
    };
  }
  let control!: { assign(notes: Note[]): void };
  function instance(_self: SvelteComponent, _props: Record<string, unknown>, $$invalidate: (i: number, v: unknown) => unknown) {
    let notes = store.notes;
    let summaryText = summary(notes);
    const toggle = (i: number) => {
      store.toggle(i);
      control.assign(store.notes);
      rt.flush(); // a browser would flush in a microtask; flushing here keeps the figures and tests synchronous
    };
    control = {
      assign(next) {
        $$invalidate(0, (notes = next));
        // `$: summaryText = summary(notes)`, which the compiler would run in $$.update:
        $$invalidate(1, (summaryText = summary(notes)));
      },
    };
    return [notes, summaryText, toggle];
  }
  class Notes extends SvelteComponent {
    constructor(options: { target?: MElement }) {
      super();
      init(this, options, instance as never, create_fragment, safe_not_equal, {});
    }
  }
  new Notes({ target: container });
  const assign = (notes: Note[]) => {
    control.assign(notes);
    rt.flush();
  };
  return {
    get notes() {
      return store.notes;
    },
    add: () => (store.add(), assign(store.notes)),
    toggle: (i) => (store.toggle(i), assign(store.notes)),
    rename: (i) => (store.rename(i), assign(store.notes)),
  };
}

// ───────────────────────── 6. skip: server HTML, morphed ─────────────────────────

function skip(doc: MiniDocument, container: MElement): NotesApp {
  const store = makeStore();
  // This string is what a server would send back after each action.
  const page = () =>
    `<div class="notes" id="notes"><input id="search" placeholder="Search…"><p id="summary">${summary(store.notes)}</p><ul id="list">${store.notes.map((n, i) => `<li id="n${n.id}" data-i="${i}">${escapeText(label(n))}</li>`).join('')}</ul></div>`;
  const draw = () => morph(container, page());
  container.addEventListener('click', (e) => {
    const i = e.target.getAttribute('data-i');
    if (i !== null) {
      store.toggle(Number(i));
      draw();
    }
  });
  container.innerHTML = page();
  return {
    get notes() {
      return store.notes;
    },
    add: () => (store.add(), draw()),
    toggle: (i) => (store.toggle(i), draw()),
    rename: (i) => (store.rename(i), draw()),
  };
}

export const NOTES_STRATEGIES: { id: NotesStrategy; label: string; short: string }[] = [
  { id: 'rebuild', label: 'Rebuild (innerHTML)', short: 'Rebuild' },
  { id: 'check', label: 'Dirty-check (digest loop)', short: 'Dirty-check' },
  { id: 'diff', label: 'Diff (virtual DOM)', short: 'Diff' },
  { id: 'track', label: 'Track (signals + templates)', short: 'Track' },
  { id: 'compile', label: 'Compile (Svelte 3/4 bitmasks)', short: 'Compile' },
  { id: 'skip', label: 'Skip (server HTML, morphed)', short: 'Skip' },
];

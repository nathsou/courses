/**
 * One table, seven ways: the benchmark app of the capstone chapter.
 *
 * The scenarios are the ones the js-framework-benchmark uses (create rows, replace all, update every 10th row, select
 * a row, swap two rows, remove a row, append, clear). Each *adapter* implements them with a different strategy from
 * this course, all on MiniDom, so the comparison is on *what each strategy does to the DOM*, counted exactly, not on
 * how fast MiniDom happens to be. Wall-clock time is also reported; it measures JavaScript on a fake DOM and says
 * little about a real browser.
 */
import { createDocument, MElement, MiniDocument, statsOf, type OpStats } from './dom';
import { html, render as litRender, repeat } from './lit';
import { morph } from './morph';
import { createEngine, type Engine, type Signal } from './signals';
import { createSvelte4, SvelteComponent, type Fragment, type KeyedBlock } from './svelte4';
import { compileAndLoad, createTemplateRuntime } from './template';
import { Renderer, h } from './vdom';
import type { Strategy } from './keyed';

export interface Row {
  id: number;
  label: string;
}

export interface BenchApp {
  create(rows: Row[]): void;
  append(rows: Row[]): void;
  update10th(): void;
  select(index: number): void;
  swap(a: number, b: number): void;
  remove(index: number): void;
  clear(): void;
}

export interface Adapter {
  id: string;
  name: string;
  /** One line on what it does when the data changes. */
  how: string;
  make(doc: MiniDocument, container: MElement): BenchApp;
}

const ADJECTIVES = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable'];
const COLOURS = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'white', 'black', 'orange'];
const NOUNS = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

/** Deterministic row data. */
export function makeRows(n: number, startId = 1): Row[] {
  let seed = startId * 7919;
  const pick = <T>(list: T[]) => list[(seed = (seed * 1103515245 + 12345) >>> 0) % list.length]!;
  return Array.from({ length: n }, (_, i) => ({ id: startId + i, label: `${pick(ADJECTIVES)} ${pick(COLOURS)} ${pick(NOUNS)}` }));
}

const rowHtml = (r: Row, selected: boolean) => `<tr${selected ? ' class="danger"' : ''}><td>${r.id}</td><td>${r.label}</td><td><button>x</button></td></tr>`;

// ───────────────────────── 1. innerHTML ─────────────────────────

const innerHtml: Adapter = {
  id: 'innerhtml',
  name: 'innerHTML',
  how: 'Rebuilds every row from a string on every change.',
  make(doc, container) {
    const tbody = doc.createElement('tbody');
    container.appendChild(tbody);
    let rows: Row[] = [];
    let selected = -1;
    const draw = () => {
      tbody.innerHTML = rows.map((r) => rowHtml(r, r.id === selected)).join('');
    };
    return {
      create: (r) => ((rows = r), draw()),
      append: (r) => ((rows = [...rows, ...r]), draw()),
      update10th: () => {
        rows = rows.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + ' !!!' } : r));
        draw();
      },
      select: (i) => ((selected = rows[i]!.id), draw()),
      swap: (a, b) => {
        rows = [...rows];
        [rows[a], rows[b]] = [rows[b]!, rows[a]!];
        draw();
      },
      remove: (i) => ((rows = rows.filter((_, k) => k !== i)), draw()),
      clear: () => ((rows = []), draw()),
    };
  },
};

// ───────────────────────── 2–3. virtual DOM ─────────────────────────

function vdomAdapter(id: string, name: string, strategy: Strategy, keyed: boolean, how: string): Adapter {
  return {
    id,
    name,
    how,
    make(doc, container) {
      const renderer = new Renderer(doc, { strategy, autoFlush: false });
      let rows: Row[] = [];
      let selected = -1;
      const draw = () => {
        renderer.render(
          h('tbody', null, rows.map((r) => h('tr', { key: keyed ? r.id : null, class: r.id === selected ? 'danger' : undefined }, h('td', null, r.id), h('td', null, r.label), h('td', null, h('button', null, 'x'))))),
          container,
        );
      };
      draw();
      return {
        create: (r) => ((rows = r), draw()),
        append: (r) => ((rows = [...rows, ...r]), draw()),
        update10th: () => {
          rows = rows.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + ' !!!' } : r));
          draw();
        },
        select: (i) => ((selected = rows[i]!.id), draw()),
        swap: (a, b) => {
          rows = [...rows];
          [rows[a], rows[b]] = [rows[b]!, rows[a]!];
          draw();
        },
        remove: (i) => ((rows = rows.filter((_, k) => k !== i)), draw()),
        clear: () => ((rows = []), draw()),
      };
    },
  };
}

// ───────────────────────── 4. lit-style templates ─────────────────────────

const litAdapter: Adapter = {
  id: 'lit',
  name: 'Templates + parts (lit)',
  how: 'Re-runs the template function; each hole compares its new value with the old one.',
  make(doc, container) {
    let rows: Row[] = [];
    let selected = -1;
    const draw = () =>
      litRender(
        html`<tbody>${repeat(rows, (r) => r.id, (r) => html`<tr class=${r.id === selected ? 'danger' : null}><td>${r.id}</td><td>${r.label}</td><td><button>x</button></td></tr>`)}</tbody>`,
        container,
      );
    draw();
    return {
      create: (r) => ((rows = r), draw()),
      append: (r) => ((rows = [...rows, ...r]), draw()),
      update10th: () => {
        rows = rows.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + ' !!!' } : r));
        draw();
      },
      select: (i) => ((selected = rows[i]!.id), draw()),
      swap: (a, b) => {
        rows = [...rows];
        [rows[a], rows[b]] = [rows[b]!, rows[a]!];
        draw();
      },
      remove: (i) => ((rows = rows.filter((_, k) => k !== i)), draw()),
      clear: () => ((rows = []), draw()),
    };
  },
};

// ───────────────────────── 5. signals + compiled templates ─────────────────────────

const signalsAdapter: Adapter = {
  id: 'signals',
  name: 'Signals + compiled templates',
  how: 'One effect per hole; a change writes exactly the nodes that read it.',
  make(doc, container) {
    const engine: Engine = createEngine('colour');
    const rt = createTemplateRuntime(doc, engine);
    interface SRow {
      id: number;
      label: Signal<string>;
      selected: Signal<boolean>;
    }
    const rows = engine.signal<SRow[]>([]);
    const Row = compileAndLoad(`<tr class={selected.get() ? 'danger' : null}><td>{id}</td><td>{label.get()}</td><td><button>x</button></td></tr>`, rt, { name: 'Row', scope: ['id', 'label', 'selected'] }).component;
    const Table = compileAndLoad(`<tbody>{rows()}</tbody>`, rt, { name: 'Table', scope: ['rows'] }).component;
    const list = rt.mapArray(rows.get, (r) => Row(r as unknown as Record<string, unknown>));
    container.appendChild(Table({ rows: list }));
    const mk = (r: Row): SRow => ({ id: r.id, label: engine.signal(r.label), selected: engine.signal(false) });
    let selected: SRow | null = null;
    return {
      create: (r) => rows.set(r.map(mk)),
      append: (r) => rows.set([...rows.peek(), ...r.map(mk)]),
      update10th: () =>
        engine.batch(() => {
          rows.peek().forEach((r, i) => {
            if (i % 10 === 0) r.label.set(r.label.peek() + ' !!!');
          });
        }),
      select: (i) =>
        engine.batch(() => {
          selected?.selected.set(false);
          selected = rows.peek()[i]!;
          selected.selected.set(true);
        }),
      swap: (a, b) => {
        const next = [...rows.peek()];
        [next[a], next[b]] = [next[b]!, next[a]!];
        rows.set(next);
      },
      remove: (i) => rows.set(rows.peek().filter((_, k) => k !== i)),
      clear: () => rows.set([]),
    };
  },
};

// ───────────────────────── 6. Svelte 4 style ─────────────────────────

const svelteAdapter: Adapter = {
  id: 'svelte4',
  name: 'Compiled invalidation (Svelte 3/4)',
  how: 'Assignments set bits; a keyed each-block updates the rows whose data changed.',
  make(doc, container) {
    const rt = createSvelte4(doc, { manual: true });
    const { element, text, space, append, insert, detach, set_data, toggle_class, safe_not_equal, init, update_keyed_each } = rt;

    /* Table.svelte
         <tbody>{#each data as row (row.id)}
           <tr class:danger={row.id === selected}><td>{row.id}</td><td>{row.label}</td><td><button>x</button></td></tr>
         {/each}</tbody>          ctx: [data, selected, …, row = ctx[4]] */
    function get_each_context(ctx: any[], list: Row[], i: number) {
      const child_ctx = ctx.slice();
      child_ctx[4] = list[i];
      return child_ctx;
    }
    function create_each_block(ctx: any[]): KeyedBlock {
      let tr: MElement, td0: MElement, t0: ReturnType<typeof text>, td1: MElement, t1: ReturnType<typeof text>, td2: MElement, button: MElement;
      let t0_value = /*row.id*/ ctx[4].id + '';
      let t1_value = /*row.label*/ ctx[4].label + '';
      return {
        key: ctx[4].id as number,
        first: null,
        c() {
          tr = element('tr');
          td0 = element('td');
          t0 = text(t0_value);
          td1 = element('td');
          t1 = text(t1_value);
          td2 = element('td');
          button = element('button');
          button.textContent = 'x';
          toggle_class(tr, 'danger', /*row.id*/ ctx[4].id === /*selected*/ ctx[1]);
          this.first = tr;
        },
        m(target, anchor) {
          insert(target, tr, anchor);
          append(tr, td0);
          append(td0, t0);
          append(tr, td1);
          append(td1, t1);
          append(tr, td2);
          append(td2, button);
        },
        p(ctx, dirty) {
          if (dirty[0]! & /*data*/ 1 && t0_value !== (t0_value = /*row.id*/ ctx[4].id + '')) set_data(t0, t0_value);
          if (dirty[0]! & /*data*/ 1 && t1_value !== (t1_value = /*row.label*/ ctx[4].label + '')) set_data(t1, t1_value);
          if (dirty[0]! & /*data, selected*/ 3) toggle_class(tr, 'danger', /*row.id*/ ctx[4].id === /*selected*/ ctx[1]);
        },
        d(detaching) {
          if (detaching) detach(tr);
        },
      } as KeyedBlock;
    }
    function create_fragment(ctx: any[]): Fragment {
      let tbody: MElement;
      let each_blocks: KeyedBlock[] = [];
      let each_value = ctx[0] as Row[];
      for (let i = 0; i < each_value.length; i += 1) each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
      return {
        c() {
          tbody = element('tbody');
          for (const b of each_blocks) b.c();
        },
        m(target, anchor) {
          insert(target, tbody, anchor);
          for (const b of each_blocks) b.m(tbody, null);
        },
        p(ctx, [dirty]) {
          if (dirty! & /*data, selected*/ 3) {
            each_value = ctx[0] as Row[];
            each_blocks = update_keyed_each(each_blocks, [dirty!], (c) => c[4].id, ctx, each_value, tbody, null, create_each_block, get_each_context);
          }
        },
        d(detaching) {
          for (const b of each_blocks) b.d(detaching ? 1 : 0);
          if (detaching) detach(tbody);
        },
      };
    }
    let control!: { set(data: Row[], selected?: number): void; get(): { data: Row[]; selected: number } };
    function instance(_self: SvelteComponent, _props: Record<string, unknown>, $$invalidate: (i: number, v: unknown) => unknown) {
      let data: Row[] = [];
      let selected = -1;
      control = {
        set(next, sel) {
          if (sel !== undefined && sel !== selected) $$invalidate(1, (selected = sel));
          if (next !== data) $$invalidate(0, (data = next));
        },
        get: () => ({ data, selected }),
      };
      return [data, selected, 0, 0];
    }
    class Table extends SvelteComponent {
      constructor(options: { target?: MElement }) {
        super();
        init(this, options, instance as never, create_fragment, safe_not_equal, {});
      }
    }
    new Table({ target: container });
    void space;
    const apply = (next: Row[], sel?: number) => {
      control.set(next, sel);
      rt.flush();
    };
    return {
      create: (r) => apply(r),
      append: (r) => apply([...control.get().data, ...r]),
      update10th: () => apply(control.get().data.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + ' !!!' } : r))),
      select: (i) => apply(control.get().data, control.get().data[i]!.id),
      swap: (a, b) => {
        const next = [...control.get().data];
        [next[a], next[b]] = [next[b]!, next[a]!];
        apply(next);
      },
      remove: (i) => apply(control.get().data.filter((_, k) => k !== i)),
      clear: () => apply([]),
    };
  },
};

// ───────────────────────── 7. morphing server HTML ─────────────────────────

const morphAdapter: Adapter = {
  id: 'morph',
  name: 'Server HTML + morph',
  how: 'The "server" sends the whole table as HTML; the browser morphs the old DOM into it.',
  make(doc, container) {
    const tbody = doc.createElement('tbody');
    tbody.setAttribute('id', 'rows');
    container.appendChild(tbody);
    let rows: Row[] = [];
    let selected = -1;
    // Rows carry ids so that morph can recognise them after they move.
    const page = () => `<tbody id="rows">${rows.map((r) => rowHtml(r, r.id === selected).replace('<tr', `<tr id="r${r.id}"`)).join('')}</tbody>`;
    const draw = () => morph(container, page());
    return {
      create: (r) => ((rows = r), draw()),
      append: (r) => ((rows = [...rows, ...r]), draw()),
      update10th: () => {
        rows = rows.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + ' !!!' } : r));
        draw();
      },
      select: (i) => ((selected = rows[i]!.id), draw()),
      swap: (a, b) => {
        rows = [...rows];
        [rows[a], rows[b]] = [rows[b]!, rows[a]!];
        draw();
      },
      remove: (i) => ((rows = rows.filter((_, k) => k !== i)), draw()),
      clear: () => ((rows = []), draw()),
    };
  },
};

export const ADAPTERS: Adapter[] = [
  innerHtml,
  vdomAdapter('vdom-index', 'Virtual DOM, no keys', 'index', false, 'Diffs the new tree against the old; children matched by position.'),
  vdomAdapter('vdom-keyed', 'Virtual DOM, keyed (LIS)', 'lis', true, 'Diffs the new tree against the old; children matched by key, moves minimised.'),
  litAdapter,
  signalsAdapter,
  svelteAdapter,
  morphAdapter,
];

// ───────────────────────── scenarios ─────────────────────────

export interface Scenario {
  id: string;
  label: string;
  /** Prepare (not measured), then the measured step. */
  setup(app: BenchApp): void;
  step(app: BenchApp): void;
}

export const SCENARIOS: Scenario[] = [
  { id: 'create', label: 'Create 1,000 rows', setup: () => {}, step: (a) => a.create(makeRows(1000)) },
  { id: 'replace', label: 'Replace all 1,000 rows', setup: (a) => a.create(makeRows(1000)), step: (a) => a.create(makeRows(1000, 2001)) },
  { id: 'update', label: 'Update every 10th row', setup: (a) => a.create(makeRows(1000)), step: (a) => a.update10th() },
  { id: 'select', label: 'Select a row', setup: (a) => a.create(makeRows(1000)), step: (a) => a.select(4) },
  { id: 'swap', label: 'Swap rows 2 and 999', setup: (a) => a.create(makeRows(1000)), step: (a) => a.swap(1, 998) },
  { id: 'remove', label: 'Remove one row', setup: (a) => a.create(makeRows(1000)), step: (a) => a.remove(4) },
  { id: 'append', label: 'Append 1,000 to 1,000', setup: (a) => a.create(makeRows(1000)), step: (a) => a.append(makeRows(1000, 5001)) },
  { id: 'clear', label: 'Clear all rows', setup: (a) => a.create(makeRows(1000)), step: (a) => a.clear() },
];

export interface Measurement {
  adapter: string;
  scenario: string;
  stats: OpStats;
  ms: number;
}

/** Run one scenario on a fresh document. The setup is not counted; the step is. */
export function measure(adapter: Adapter, scenario: Scenario): Measurement {
  const doc = createDocument();
  const app = adapter.make(doc, doc.body);
  scenario.setup(app);
  const mark = doc.mark();
  const t0 = performance.now();
  scenario.step(app);
  const ms = performance.now() - t0;
  return { adapter: adapter.id, scenario: scenario.id, stats: statsOf(doc.opsSince(mark)), ms };
}

/** Run a scenario and return the document's HTML after, to check that every adapter agrees on the page. */
export function resultHtml(adapter: Adapter, scenario: Scenario): string {
  const doc = createDocument();
  const app = adapter.make(doc, doc.body);
  scenario.setup(app);
  scenario.step(app);
  return doc.body.innerHTML.replace(/ id="[^"]*"/g, '');
}

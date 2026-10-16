import { describe, expect, test } from 'vitest';
import { createDocument, toHTML, type MElement } from './dom';
import { HooksOrderError, createRoot, h, memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from './vdom';

const setup = (strategy: 'index' | 'lastIndex' | 'lis' = 'lis') => {
  const doc = createDocument();
  const root = createRoot(doc, doc.body, { autoFlush: false, strategy });
  return { doc, root, html: () => doc.body.innerHTML };
};

describe('mounting and patching elements', () => {
  test('mounts a tree with one live insertion and patches only what changed', () => {
    const { doc, root, html } = setup();
    root.render(h('div', { class: 'a' }, h('p', null, 'one'), h('p', null, 'two')));
    expect(html()).toBe('<div class="a"><p>one</p><p>two</p></div>');
    expect(doc.statsSince(0).live).toBe(1);
    const mark = doc.mark();
    root.render(h('div', { class: 'a' }, h('p', null, 'one'), h('p', null, 'TWO')));
    expect(doc.statsSince(mark)).toMatchObject({ total: 1, texts: 1, live: 1 });
    expect(html()).toBe('<div class="a"><p>one</p><p>TWO</p></div>');
  });

  test('changing attributes, adding and removing them', () => {
    const { doc, root, html } = setup();
    root.render(h('div', { class: 'a', title: 'x' }));
    const mark = doc.mark();
    root.render(h('div', { class: 'b' }));
    expect(html()).toBe('<div class="b"></div>');
    expect(doc.statsSince(mark).attrs).toBe(2);
  });

  test('a different tag replaces the node', () => {
    const { doc, root, html } = setup();
    root.render(h('div', null, 'x'));
    const old = doc.body.firstChild;
    root.render(h('span', null, 'x'));
    expect(html()).toBe('<span>x</span>');
    expect(doc.body.firstChild).not.toBe(old);
  });

  test('event handlers are attached once and always call the latest function', () => {
    const { doc, root } = setup();
    const calls: string[] = [];
    root.render(h('button', { onClick: () => calls.push('first') }));
    const mark = doc.mark();
    root.render(h('button', { onClick: () => calls.push('second') }));
    expect(doc.statsSince(mark).total).toBe(0);
    (doc.body.firstChild as MElement).click();
    expect(calls).toEqual(['second']);
  });

  test('null and false children keep their slot so siblings are not shifted', () => {
    const { doc, root, html } = setup();
    const view = (show: boolean) => h('div', null, h('i', null, 'a'), show && h('b', null, 'B'), h('u', null, 'c'));
    root.render(view(false));
    const u = doc.body.querySelector('u');
    root.render(view(true));
    expect(html()).toBe('<div><i>a</i><b>B</b><u>c</u></div>');
    expect(doc.body.querySelector('u')).toBe(u);
  });

  test('controlled inputs: typed text survives a re-render that does not change the value', () => {
    const { doc, root } = setup();
    root.render(h('input', { value: '' }));
    const input = doc.body.firstChild as MElement;
    input.userInput('hello');
    root.render(h('input', { value: 'hello', placeholder: 'x' }));
    expect(doc.body.firstChild).toBe(input);
    expect(input.value).toBe('hello');
  });
});

describe('lists', () => {
  const items = (keys: string[], keyed = true) => h('ul', null, ...keys.map((k) => h('li', keyed ? { key: k } : null, k)));

  test('keyed reorder keeps node identity; unkeyed reorder keeps positions and rewrites text', () => {
    for (const keyed of [true, false]) {
      const { doc, root, html } = setup();
      root.render(items(['a', 'b', 'c'], keyed));
      const [a, b, c] = doc.body.querySelectorAll('li');
      root.render(items(['c', 'a', 'b'], keyed));
      expect(html()).toBe('<ul><li>c</li><li>a</li><li>b</li></ul>');
      const after = doc.body.querySelectorAll('li');
      if (keyed) expect(after.map((n) => n.id)).toEqual([c!.id, a!.id, b!.id]);
      else expect(after.map((n) => n.id)).toEqual([a!.id, b!.id, c!.id]);
    }
  });

  test('without keys an input keeps its typed text at the same position, with the wrong item', () => {
    const row = (name: string) => h('li', null, name, h('input', null));
    const { doc, root } = setup();
    root.render(h('ul', null, row('Ann'), row('Bob')));
    (doc.body.querySelectorAll('input')[0] as MElement).userInput('note for Ann');
    root.render(h('ul', null, row('Bob'), row('Ann')));
    const first = doc.body.querySelectorAll('li')[0]!;
    expect(first.textContent).toBe('Bob');
    expect((first.querySelector('input') as MElement).value).toBe('note for Ann');
  });

  test('with keys the typed text travels with its item', () => {
    const row = (name: string) => h('li', { key: name }, name, h('input', null));
    const { doc, root } = setup();
    root.render(h('ul', null, row('Ann'), row('Bob')));
    (doc.body.querySelectorAll('input')[0] as MElement).userInput('note for Ann');
    root.render(h('ul', null, row('Bob'), row('Ann')));
    const first = doc.body.querySelectorAll('li')[0]!;
    expect(first.textContent).toBe('Bob');
    expect((first.querySelector('input') as MElement).value).toBe('');
    expect((doc.body.querySelectorAll('li')[1]!.querySelector('input') as MElement).value).toBe('note for Ann');
  });

  test('moving the last item to the front costs 3 moves with lastIndex and 1 with lis', () => {
    const costs: Record<string, number> = {};
    for (const strategy of ['lastIndex', 'lis'] as const) {
      const { doc, root } = setup(strategy);
      root.render(items(['a', 'b', 'c', 'd']));
      const mark = doc.mark();
      root.render(items(['d', 'a', 'b', 'c']));
      costs[strategy] = doc.opsSince(mark).filter((o) => o.kind === 'insert').length;
      expect(doc.body.innerHTML).toBe('<ul><li>d</li><li>a</li><li>b</li><li>c</li></ul>');
    }
    expect(costs).toEqual({ lastIndex: 3, lis: 1 });
  });

  test('random edits always converge on the new list', () => {
    let seed = 11;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (const strategy of ['index', 'lastIndex', 'lis'] as const) {
      const { doc, root } = setup(strategy);
      let keys = ['a', 'b', 'c', 'd', 'e'];
      root.render(items(keys));
      for (let round = 0; round < 60; round++) {
        const pool = 'abcdefghij'.split('');
        keys = pool.filter(() => rnd() > 0.45).sort(() => rnd() - 0.5);
        root.render(items(keys));
        expect(doc.body.querySelectorAll('li').map((n) => n.textContent)).toEqual(keys);
      }
    }
  });
});

describe('components and hooks', () => {
  test('useState: setState re-renders the component and patches the text', () => {
    const { doc, root, html } = setup();
    const Counter = () => {
      const [n, setN] = useState(0);
      return h('button', { onClick: () => setN(n + 1) }, 'Clicked ', n);
    };
    root.render(h(Counter));
    expect(html()).toBe('<button>Clicked 0</button>');
    const mark = doc.mark();
    (doc.body.firstChild as MElement).click();
    expect(html()).toBe('<button>Clicked 0</button>'); // batched: nothing yet
    expect(root.flush()).toBe(1);
    expect(html()).toBe('<button>Clicked 1</button>');
    expect(doc.statsSince(mark)).toMatchObject({ texts: 1 });
  });

  test('updates are batched: three setStates, one render', () => {
    const { root, html } = setup();
    let set!: (f: (n: number) => number) => void;
    const C = () => {
      const [n, setN] = useState(0);
      set = setN;
      return h('p', null, n);
    };
    root.render(h(C));
    set((n) => n + 1);
    set((n) => n + 1);
    set((n) => n + 1);
    expect(root.flush()).toBe(1);
    expect(html()).toBe('<p>3</p>');
  });

  test('setting the same value does not re-render', () => {
    const { root } = setup();
    let set!: (n: number) => void;
    const C = () => {
      const [n, setN] = useState(5);
      set = setN;
      return h('p', null, n);
    };
    root.render(h(C));
    set(5);
    expect(root.flush()).toBe(0);
  });

  test('a parent re-render re-renders every child, unless memoised or the element is reused', () => {
    const { root } = setup();
    const renders: string[] = [];
    const Plain = ({ n }: { n: number }) => (renders.push('plain'), h('i', null, n));
    const Memo = memo(({ n }: { n: number }) => (renders.push('memo'), h('b', null, n)));
    let bump!: () => void;
    const Parent = () => {
      const [tick, setTick] = useState(0);
      bump = () => setTick(tick + 1);
      const stable = useMemo(() => h(Plain, { n: 1 }), []);
      return h('div', null, h(Plain, { n: 1 }), h(Memo, { n: 1 }), stable, tick);
    };
    root.render(h(Parent));
    renders.length = 0;
    bump();
    root.flush();
    expect(renders).toEqual(['plain']); // Memo skipped (equal props); the cached element skipped (same object)
    const skips = [...root.renderer.trace].filter((e) => e.kind === 'skip').map((e) => e.why);
    expect(skips).toEqual(['memo', 'same element']);
  });

  test('memo does not help when a prop is a new function each time; useCallback does', () => {
    const { root } = setup();
    let renders = 0;
    const Child = memo((_: { onClick: () => void }) => (renders++, h('button', null, 'x')));
    let bump!: () => void;
    const Naive = () => {
      const [t, setT] = useState(0);
      bump = () => setT(t + 1);
      return h('div', null, t, h(Child, { onClick: () => {} }));
    };
    root.render(h(Naive));
    bump();
    root.flush();
    expect(renders).toBe(2);
    const { root: root2 } = setup();
    renders = 0;
    const Cached = () => {
      const [t, setT] = useState(0);
      bump = () => setT(t + 1);
      const onClick = useCallback(() => {}, []);
      return h('div', null, t, h(Child, { onClick }));
    };
    root2.render(h(Cached));
    bump();
    root2.flush();
    expect(renders).toBe(1);
  });

  test('useEffect runs after commit, with cleanup before the next run and on unmount', () => {
    const { root } = setup();
    const log: string[] = [];
    let set!: (n: number) => void;
    const C = () => {
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => {
        log.push(`run ${n}`);
        return () => log.push(`cleanup ${n}`);
      }, [n]);
      log.push(`render ${n}`);
      return h('p', null, n);
    };
    root.render(h(C));
    expect(log).toEqual(['render 0', 'run 0']);
    set(1);
    root.flush();
    expect(log).toEqual(['render 0', 'run 0', 'render 1', 'cleanup 0', 'run 1']);
    root.render(h('div'));
    expect(log.at(-1)).toBe('cleanup 1');
  });

  test('an effect with empty deps runs once; one without deps runs every render', () => {
    const { root } = setup();
    let once = 0;
    let every = 0;
    let set!: (n: number) => void;
    const C = () => {
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => void once++, []);
      useEffect(() => void every++);
      return h('p', null, n);
    };
    root.render(h(C));
    set(1);
    root.flush();
    set(2);
    root.flush();
    expect([once, every]).toEqual([1, 3]);
  });

  test('stale closures: an effect with empty deps sees the first render only', () => {
    const { root } = setup();
    const seen: number[] = [];
    let set!: (n: number) => void;
    const C = () => {
      const [n, setN] = useState(0);
      set = setN;
      useEffect(() => {
        seen.push(n);
      }, []);
      return h('p', null, n);
    };
    root.render(h(C));
    set(7);
    root.flush();
    expect(seen).toEqual([0]);
  });

  test('useReducer and useRef', () => {
    const { root, html } = setup();
    let dispatch!: (a: 'inc') => void;
    let ref!: { current: number };
    const C = () => {
      const [n, d] = useReducer((s: number, a: 'inc') => (a === 'inc' ? s + 1 : s), 0);
      const r = useRef(0);
      r.current++;
      dispatch = d;
      ref = r;
      return h('p', null, n);
    };
    root.render(h(C));
    dispatch('inc');
    root.flush();
    expect(html()).toBe('<p>1</p>');
    expect(ref.current).toBe(2);
  });

  test('hooks called conditionally throw a helpful error', () => {
    const { root } = setup();
    let on = true;
    const C = () => {
      if (on) useState(0);
      useState('x');
      return h('p');
    };
    root.render(h(C));
    on = false;
    expect(() => root.render(h(C))).toThrow(HooksOrderError);
  });

  test('a component whose root changes type keeps its parent consistent', () => {
    const { doc, root, html } = setup();
    let set!: (v: boolean) => void;
    const Inner = () => {
      const [b, setB] = useState(false);
      set = setB;
      return b ? h('section', null, 'B') : h('p', null, 'A');
    };
    const Outer = () => h(Inner);
    root.render(h('div', null, h(Outer), h('hr')));
    set(true);
    root.flush();
    expect(html()).toBe('<div><section>B</section><hr></div>');
    root.render(h('div', null, h(Outer), h('hr')));
    expect(html()).toBe('<div><section>B</section><hr></div>');
    void doc;
  });

  test('refs are set on mount and cleared on unmount', () => {
    const { root } = setup();
    const ref = { current: null as MElement | null };
    root.render(h('div', null, h('input', { ref })));
    expect(ref.current?.tag).toBe('input');
    root.render(h('div'));
    expect(ref.current).toBeNull();
  });

  test('too many re-renders are detected', () => {
    const { root } = setup();
    const C = () => {
      const [n, setN] = useState(0);
      useEffect(() => setN(n + 1));
      return h('p', null, n);
    };
    root.render(h(C));
    expect(() => root.flush()).toThrow(/Too many re-renders/);
  });

  test('serialises to the same HTML as a hand-written tree', () => {
    const { doc, root } = setup();
    root.render(h('ul', { class: 'l' }, h('li', { key: 1 }, 'x'), h('li', { key: 2 }, 'y')));
    expect(toHTML(doc.body.firstChild!)).toBe('<ul class="l"><li>x</li><li>y</li></ul>');
  });

  test('inspect lists each component with its hook slots and render count', () => {
    const { doc, root } = setup();
    const C = () => {
      const [n, setN] = useState(3);
      useRef(0);
      useEffect(() => {}, [n]);
      return h('p', { onClick: () => setN(n + 1) }, n);
    };
    root.render(h('div', null, h(C)));
    const tree = root.renderer.inspect(doc.body)!;
    expect(tree.name).toBe('div');
    const c = tree.children[0]!;
    expect(c).toMatchObject({ name: 'C', kind: 'component', renders: 1 });
    expect(c.hooks).toEqual([
      { kind: 'state', value: '3' },
      { kind: 'ref', value: '{ current: 0 }' },
      { kind: 'effect', value: 'deps [3]' },
    ]);
  });
});

/**
 * The runtime of Svelte 3 and 4, reimplemented on MiniDom, and two components "compiled" by hand the way Svelte 4's
 * compiler writes them (the code is the real compiler's output for the same source, adapted only to take the runtime
 * as a parameter instead of importing `svelte/internal`).
 *
 * The idea: no virtual DOM and no signals. The compiler knows, statically, which parts of the DOM depend on which
 * variable. It numbers the component's variables (0, 1, 2…) and writes an `update` function that tests a *bitmask*:
 *
 *   p(ctx, [dirty]) { if (dirty & 1) set_data(t3, ctx[0]); }
 *
 * Assigning to a variable becomes `$$invalidate(0, count += 1)`, which records bit 0 in `$$.dirty` and schedules one
 * flush. Everything here that is not a bitmask test is the same as a hand-written, imperative DOM update.
 */
import { MiniDocument, MElement, MNode, MText, type Listener } from './dom';
import { reconcile } from './keyed';

export interface Fragment {
  /** create */ c(): void;
  /** mount */ m(target: MElement, anchor: MNode | null): void;
  /** update */ p(ctx: any[], dirty: number[]): void;
  /** destroy */ d(detaching?: boolean | 0 | 1): void;
}

export interface KeyedBlock extends Fragment {
  key: string | number;
  /** The first DOM node of the block: where an earlier block is inserted before. */
  first: MNode | null;
}

export interface Internals {
  readonly doc: MiniDocument;
  element(tag: string): MElement;
  text(data: string): MText;
  space(): MText;
  append(target: MNode, node: MNode): void;
  insert(target: MNode, node: MNode, anchor?: MNode | null): void;
  detach(node: MNode): void;
  listen(node: MElement, type: string, handler: Listener): () => void;
  attr(node: MElement, name: string, value: string | null): void;
  set_data(node: MText, data: string): void;
  toggle_class(el: MElement, name: string, on: boolean): void;
  destroy_each(blocks: Fragment[], detaching: boolean | 0 | 1): void;
  ensure_array_like<T>(v: T[]): T[];
  /** A keyed `{#each}` update: reuse a block per key, move the blocks that moved, create and destroy the rest. */
  update_keyed_each<T>(blocks: KeyedBlock[], dirty: number[], getKey: (ctx: any[]) => string | number, ctx: any[], list: T[], target: MElement, anchor: MNode | null, create: (ctx: any[]) => KeyedBlock, getContext: (ctx: any[], list: T[], i: number) => any[]): KeyedBlock[];
  noop(): void;
  safe_not_equal(a: unknown, b: unknown): boolean;
  init(component: SvelteComponent, options: { target?: MElement }, instance: Instance, createFragment: (ctx: any[]) => Fragment, notEqual: (a: unknown, b: unknown) => boolean, props: Record<string, unknown>): void;
  SvelteComponent: typeof SvelteComponent;
  /** Run the scheduled flush now (the browser version does it in a microtask). */
  flush(): void;
  /** Number of component updates (`p` calls) since creation. */
  readonly stats: { updates: number; flushes: number; invalidations: number };
  /** The bitmask passed to the last `p` call of each component, for figures. */
  onUpdate?: (dirty: number[]) => void;
}

type Instance = (self: SvelteComponent, props: Record<string, unknown>, invalidate: (i: number, ret: unknown, ...rest: unknown[]) => unknown) => any[];

interface Internal {
  ctx: any[];
  dirty: number[];
  fragment: Fragment | null;
  update: () => void;
  ready: boolean;
}

/** What a compiled component class looks like from outside: `new Counter({ target })`. */
export type ComponentConstructor = new (options: { target?: MElement }) => SvelteComponent;

export class SvelteComponent {
  $$!: Internal;
  /** The runtime that made it. */
  $rt!: Internals;
  $destroy(): void {
    this.$$.fragment?.d(1);
    this.$$.fragment = null;
    this.$$.ctx = [];
  }
  $set(): void {}
}

export function createSvelte4(doc: MiniDocument, opts: { manual?: boolean } = {}): Internals {
  const dirtyComponents: SvelteComponent[] = [];
  let scheduled = false;
  const stats = { updates: 0, flushes: 0, invalidations: 0 };

  const rt: Internals = {
    doc,
    stats,
    element: (tag) => doc.createElement(tag),
    text: (data) => doc.createTextNode(data),
    space: () => doc.createTextNode(' '),
    append: (target, node) => (target as MElement).appendChild(node),
    insert: (target, node, anchor = null) => (target as MElement).insertBefore(node, anchor),
    detach: (node) => node.parent?.removeChild(node),
    listen: (node, type, handler) => {
      node.addEventListener(type, handler);
      return () => node.removeEventListener(type, handler);
    },
    attr: (node, name, value) => {
      if (value === null) node.removeAttribute(name);
      else if (node.getAttribute(name) !== value) node.setAttribute(name, value);
    },
    set_data: (node, data) => {
      data = String(data);
      if (node.data !== data) node.data = data;
    },
    toggle_class: (el, name, on) => {
      const classes = el.className.split(/\s+/).filter(Boolean);
      const has = classes.includes(name);
      if (on && !has) el.className = [...classes, name].join(' ');
      else if (!on && has) {
        const rest = classes.filter((c) => c !== name);
        if (rest.length) el.className = rest.join(' ');
        else el.removeAttribute('class');
      }
    },
    destroy_each: (blocks, detaching) => {
      for (const b of blocks) b?.d(detaching);
    },
    ensure_array_like: (v) => v,
    update_keyed_each(blocks, dirty, getKey, ctx, list, target, anchor, create, getContext) {
      const oldKeys = blocks.map((b) => b.key);
      const contexts = list.map((_, i) => getContext(ctx, list, i));
      const newKeys = contexts.map((c) => getKey(c));
      const steps = reconcile(oldKeys, newKeys, 'lis');
      const placed: KeyedBlock[] = [];
      const before = (a: any): MNode | null => (a === 'end' ? anchor : a === 'start' ? (blocks[0]?.first ?? anchor) : 'before' in a ? placed[a.before]!.first : (placed[a.after]!.first as MNode | null)?.nextSibling ?? anchor);
      for (const st of steps) {
        if (st.op === 'remove') blocks[st.from]!.d(1);
        else if (st.op === 'insert') {
          const b = create(contexts[st.to]!);
          b.c();
          b.m(target, before(st.anchor));
          placed[st.to] = b;
        } else {
          const b = blocks[st.from]!;
          b.p(contexts[st.to]!, dirty);
          if (st.op === 'move') b.m(target, before(st.anchor));
          placed[st.to] = b;
        }
      }
      return placed;
    },
    noop: () => {},
    // Objects and functions are always considered changed (a mutation in place would not be noticed otherwise).
    safe_not_equal: (a, b) => (a != a ? b == b : a !== b || (a !== null && typeof a === 'object') || typeof a === 'function'),
    SvelteComponent,
    init(component, options, instance, createFragment, notEqual, props) {
      component.$rt = rt;
      const $$: Internal = (component.$$ = { ctx: [], dirty: [-1], fragment: null, update: () => {}, ready: false });
      $$.ctx = instance(component, props, (i, ret, ...rest) => {
        const value = rest.length ? rest[0] : ret;
        if ($$.ctx && notEqual($$.ctx[i], ($$.ctx[i] = value))) {
          if ($$.ready) makeDirty(component, i);
        }
        return ret;
      });
      $$.update();
      $$.ready = true;
      $$.fragment = createFragment($$.ctx);
      if (options.target) {
        $$.fragment.c();
        $$.fragment.m(options.target, null);
        flushNow();
      }
    },
    flush: () => flushNow(),
  };

  function makeDirty(component: SvelteComponent, i: number): void {
    stats.invalidations++;
    if (component.$$.dirty[0] === -1) {
      dirtyComponents.push(component);
      schedule();
      component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0]! |= 1 << i % 31;
  }

  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    if (!opts.manual) queueMicrotask(flushNow);
  }

  function flushNow(): void {
    scheduled = false;
    stats.flushes++;
    const batch = dirtyComponents.splice(0);
    for (const component of batch) {
      const $$ = component.$$;
      if ($$.fragment === null) continue;
      $$.update();
      const dirty = $$.dirty;
      $$.dirty = [-1];
      stats.updates++;
      rt.onUpdate?.(dirty);
      $$.fragment.p($$.ctx, dirty);
    }
  }

  return rt;
}

// ───────────────────────── components, as Svelte 4 compiles them ─────────────────────────

/**
 * Counter.svelte
 *
 *   <script>
 *     let count = 0;
 *     $: double = count * 2;
 *   </script>
 *   <div class="counter">
 *     <h1>Counter</h1>
 *     <p class:big={count > 5}>Count: {count} (double {double})</p>
 *     <button on:click={() => count += 1}>+1</button>
 *   </div>
 */
export function counterComponent(rt: Internals): ComponentConstructor {
  const { element, text, space, append, insert, detach, listen, attr, set_data, toggle_class, safe_not_equal, init } = rt;

  function create_fragment(ctx: any[]): Fragment {
    let div: MElement, h1: MElement, t1: MText, p: MElement, t2: MText, t3: MText, t4: MText, t5: MText, t6: MText, t7: MText, button: MElement;
    let mounted: boolean | undefined;
    let dispose: () => void;
    return {
      c() {
        div = element('div');
        h1 = element('h1');
        h1.textContent = 'Counter';
        t1 = space();
        p = element('p');
        t2 = text('Count: ');
        t3 = text(/*count*/ ctx[0]);
        t4 = text(' (double ');
        t5 = text(/*double*/ ctx[1]);
        t6 = text(')');
        t7 = space();
        button = element('button');
        button.textContent = '+1';
        toggle_class(p, 'big', /*count*/ ctx[0] > 5);
        attr(div, 'class', 'counter');
      },
      m(target, anchor) {
        insert(target, div, anchor);
        append(div, h1);
        append(div, t1);
        append(div, p);
        append(p, t2);
        append(p, t3);
        append(p, t4);
        append(p, t5);
        append(p, t6);
        append(div, t7);
        append(div, button);
        if (!mounted) {
          dispose = listen(button, 'click', /*click_handler*/ ctx[2]);
          mounted = true;
        }
      },
      p(ctx, [dirty]) {
        if (dirty! & /*count*/ 1) set_data(t3, /*count*/ ctx[0]);
        if (dirty! & /*double*/ 2) set_data(t5, /*double*/ ctx[1]);
        if (dirty! & /*count*/ 1) {
          toggle_class(p, 'big', /*count*/ ctx[0] > 5);
        }
      },
      d(detaching) {
        if (detaching) detach(div);
        mounted = false;
        dispose();
      },
    };
  }

  function instance($$self: SvelteComponent, _$$props: Record<string, unknown>, $$invalidate: (i: number, v: unknown) => unknown) {
    let double: number;
    let count = 0;
    const click_handler = () => $$invalidate(0, (count += 1));
    $$self.$$.update = () => {
      if ($$self.$$.dirty[0]! & /*count*/ 1) {
        $$invalidate(1, (double = count * 2));
      }
    };
    return [count, double!, click_handler];
  }

  class Counter extends SvelteComponent {
    constructor(options: { target?: MElement }) {
      super();
      init(this, options, instance as Instance, create_fragment, safe_not_equal, {});
    }
  }
  return Counter;
}

/**
 * List.svelte
 *
 *   <script> let items = ['a', 'b', 'c']; </script>
 *   <ul>{#each items as item}<li>{item}</li>{/each}</ul>
 *   <button on:click={() => items = [...items, 'x']}>add</button>
 *   <button on:click={() => items = items.slice(1)}>drop first</button>
 *   <button on:click={() => items = items.slice().reverse()}>reverse</button>
 *
 * An (unkeyed) `{#each}` block: one small fragment per item, updated by position. (The compiler's output for the
 * first button is the real thing; the other two buttons follow the same pattern.)
 */
export function listComponent(rt: Internals, initial: string[] = ['a', 'b', 'c']): ComponentConstructor {
  const { element, text, space, append, insert, detach, listen, set_data, destroy_each, ensure_array_like, safe_not_equal, init } = rt;

  function get_each_context(ctx: any[], list: string[], i: number) {
    const child_ctx = ctx.slice();
    child_ctx[4] = list[i];
    return child_ctx;
  }

  function create_each_block(ctx: any[]): Fragment {
    let li: MElement;
    let t: MText;
    let t_value = /*item*/ ctx[4] + '';
    return {
      c() {
        li = element('li');
        t = text(t_value);
      },
      m(target, anchor) {
        insert(target, li, anchor);
        append(li, t);
      },
      p(ctx, dirty) {
        if (dirty[0]! & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[4] + '')) set_data(t, t_value);
      },
      d(detaching) {
        if (detaching) detach(li);
      },
    };
  }

  function create_fragment(ctx: any[]): Fragment {
    let ul: MElement, t0: MText, button0: MElement, t1: MText, button1: MElement, t2: MText, button2: MElement;
    let mounted: boolean | undefined;
    let disposes: (() => void)[] = [];
    let each_value = ensure_array_like(/*items*/ ctx[0] as string[]);
    let each_blocks: Fragment[] = [];
    for (let i = 0; i < each_value.length; i += 1) each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    return {
      c() {
        ul = element('ul');
        for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i]!.c();
        t0 = space();
        button0 = element('button');
        button0.textContent = 'add';
        t1 = space();
        button1 = element('button');
        button1.textContent = 'drop first';
        t2 = space();
        button2 = element('button');
        button2.textContent = 'reverse';
      },
      m(target, anchor) {
        insert(target, ul, anchor);
        for (let i = 0; i < each_blocks.length; i += 1) if (each_blocks[i]) each_blocks[i]!.m(ul, null);
        insert(target, t0, anchor);
        insert(target, button0, anchor);
        insert(target, t1, anchor);
        insert(target, button1, anchor);
        insert(target, t2, anchor);
        insert(target, button2, anchor);
        if (!mounted) {
          disposes = [listen(button0, 'click', /*click_handler*/ ctx[1]), listen(button1, 'click', /*click_handler_1*/ ctx[2]), listen(button2, 'click', /*click_handler_2*/ ctx[3])];
          mounted = true;
        }
      },
      p(ctx, [dirty]) {
        if (dirty! & /*items*/ 1) {
          each_value = ensure_array_like(/*items*/ ctx[0] as string[]);
          let i: number;
          for (i = 0; i < each_value.length; i += 1) {
            const child_ctx = get_each_context(ctx, each_value, i);
            if (each_blocks[i]) each_blocks[i]!.p(child_ctx, [dirty!]);
            else {
              each_blocks[i] = create_each_block(child_ctx);
              each_blocks[i]!.c();
              each_blocks[i]!.m(ul, null);
            }
          }
          for (; i < each_blocks.length; i += 1) each_blocks[i]!.d(1);
          each_blocks.length = each_value.length;
        }
      },
      d(detaching) {
        if (detaching) {
          detach(ul);
          detach(t0);
          detach(button0);
          detach(t1);
          detach(button1);
          detach(t2);
          detach(button2);
        }
        destroy_each(each_blocks, detaching ?? 0);
        mounted = false;
        for (const d of disposes) d();
      },
    };
  }

  function instance(_$$self: SvelteComponent, _$$props: Record<string, unknown>, $$invalidate: (i: number, v: unknown) => unknown) {
    let items = [...initial];
    const click_handler = () => $$invalidate(0, (items = [...items, 'x']));
    const click_handler_1 = () => $$invalidate(0, (items = items.slice(1)));
    const click_handler_2 = () => $$invalidate(0, (items = items.slice().reverse()));
    return [items, click_handler, click_handler_1, click_handler_2];
  }

  class List extends SvelteComponent {
    constructor(options: { target?: MElement }) {
      super();
      init(this, options, instance as Instance, create_fragment, safe_not_equal, {});
    }
  }
  return List;
}

import { describe, expect, test } from 'vitest';
import { createEngine, type Engine, type Strategy } from './signals';

const ALL: Strategy[] = ['eager', 'topological', 'colour'];
const GLITCH_FREE: Strategy[] = ['topological', 'colour'];

describe.each(ALL)('%s engine: the basics', (strategy) => {
  const make = () => createEngine(strategy);

  test('signals hold values; effects run now and after each change', () => {
    const e = make();
    const n = e.signal(1);
    const seen: number[] = [];
    e.effect(() => void seen.push(n.get()));
    n.set(2);
    n.set(2); // same value: nothing happens
    n.update((x) => x + 1);
    expect(seen).toEqual([1, 2, 3]);
  });

  test('computed values follow their sources', () => {
    const e = make();
    const a = e.signal(2);
    const b = e.signal(3);
    const sum = e.computed(() => a.get() + b.get());
    expect(sum.get()).toBe(5);
    a.set(10);
    expect(sum.get()).toBe(13);
  });

  test('dependencies are dynamic: the branch not taken is not tracked', () => {
    const e = make();
    const cond = e.signal(true);
    const x = e.signal('x1');
    const y = e.signal('y1');
    const runs: string[] = [];
    e.effect(() => void runs.push(cond.get() ? x.get() : y.get()));
    y.set('y2'); // not read yet
    expect(runs).toEqual(['x1']);
    cond.set(false);
    x.set('x2'); // no longer read
    y.set('y3');
    expect(runs).toEqual(['x1', 'y2', 'y3']);
  });

  test('a disposed effect never runs again and runs its cleanup', () => {
    const e = make();
    const n = e.signal(0);
    const log: string[] = [];
    const stop = e.effect(() => {
      log.push(`run ${n.get()}`);
      return () => log.push('cleanup');
    });
    n.set(1);
    stop();
    n.set(2);
    expect(log).toEqual(['run 0', 'cleanup', 'run 1', 'cleanup']);
  });

  test('batch runs each effect once with the final values', () => {
    const e = make();
    const a = e.signal(1);
    const b = e.signal(1);
    const seen: string[] = [];
    e.effect(() => void seen.push(`${a.get()},${b.get()}`));
    e.batch(() => {
      a.set(2);
      b.set(2);
    });
    expect(seen).toEqual(['1,1', '2,2']);
  });

  test('untracked reads do not subscribe', () => {
    const e = make();
    const a = e.signal(1);
    const b = e.signal(1);
    let runs = 0;
    e.effect(() => {
      runs++;
      a.get();
      e.untracked(() => b.get());
    });
    b.set(2);
    expect(runs).toBe(1);
    a.set(2);
    expect(runs).toBe(2);
  });

  test('a custom equality function stops propagation', () => {
    const e = make();
    const point = e.signal({ x: 1 }, { equals: (p, q) => p.x === q.x });
    let runs = 0;
    e.effect(() => {
      point.get();
      runs++;
    });
    point.set({ x: 1 });
    expect(runs).toBe(1);
    point.set({ x: 2 });
    expect(runs).toBe(2);
  });

  test('cutoff: an unchanged computed value does not re-run its effect', () => {
    const e = make();
    const n = e.signal(2);
    const even = e.computed(() => n.get() % 2 === 0);
    const seen: boolean[] = [];
    e.effect(() => void seen.push(even.get()));
    n.set(4);
    n.set(6);
    n.set(7);
    expect(seen).toEqual([true, false]);
  });
});

describe('the diamond', () => {
  /** a → b = 2a, c = 3a → d = b + c → effect. d is always 5a if the graph is consistent. */
  function diamond(e: Engine) {
    const a = e.signal(1);
    const b = e.computed(() => a.get() * 2, { label: 'b' });
    const c = e.computed(() => a.get() * 3, { label: 'c' });
    let dRuns = 0;
    const d = e.computed(() => (dRuns++, b.get() + c.get()), { label: 'd' });
    const seen: number[] = [];
    e.effect(() => void seen.push(d.get()));
    return { a, seen, dRuns: () => dRuns };
  }

  test('eager push glitches: the effect sees a state that never existed', () => {
    const { a, seen, dRuns } = diamond(createEngine('eager'));
    a.set(2);
    // 1·5 = 5, then b updated but not c: 4 + 3 = 7 (a glitch), then the right 10.
    expect(seen).toEqual([5, 7, 10]);
    expect(dRuns()).toBe(3);
  });

  test.each(GLITCH_FREE)('%s never shows an inconsistent value and recomputes d once', (strategy) => {
    const { a, seen, dRuns } = diamond(createEngine(strategy));
    a.set(2);
    expect(seen).toEqual([5, 10]);
    expect(dRuns()).toBe(2); // once at the start, once for the change
  });

  test.each(GLITCH_FREE)('%s: consistency holds for a deep random graph', (strategy) => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const e = createEngine(strategy);
    const sources = Array.from({ length: 4 }, (_, i) => e.signal(i));
    const raw = sources.map((_, i) => i);
    // Each computed sums two earlier nodes, so the expected value is easy to recompute from scratch.
    type N = { get(): number };
    const nodes: N[] = [...sources];
    const truth: (() => number)[] = sources.map((_, i) => () => raw[i]!);
    for (let i = 0; i < 25; i++) {
      const p = Math.floor(rnd() * nodes.length);
      const q = Math.floor(rnd() * nodes.length);
      const np = nodes[p]!;
      const nq = nodes[q]!;
      const tp = truth[p]!;
      const tq = truth[q]!;
      nodes.push(e.computed(() => np.get() + nq.get()));
      truth.push(() => tp() + tq());
    }
    const last = nodes[nodes.length - 1]!;
    const bad: string[] = [];
    const watched = [nodes[10]!, nodes[20]!, last];
    const watchedTruth = [truth[10]!, truth[20]!, truth[nodes.length - 1]!];
    e.effect(() => {
      watched.forEach((w, i) => {
        if (w.get() !== watchedTruth[i]!()) bad.push(`node ${i}`);
      });
    });
    for (let step = 0; step < 100; step++) {
      const k = Math.floor(rnd() * sources.length);
      raw[k] = Math.floor(rnd() * 100);
      sources[k]!.set(raw[k]!);
    }
    expect(bad).toEqual([]);
  });
});

describe('laziness', () => {
  test('colour computes only what is read; the others compute everything', () => {
    const runs: Record<string, number> = {};
    for (const s of ALL) {
      const e = createEngine(s);
      const a = e.signal(1);
      let n = 0;
      const unused = e.computed(() => (n++, a.get() + 1));
      void unused;
      a.set(2);
      a.set(3);
      runs[s] = n;
    }
    expect(runs).toEqual({ eager: 3, topological: 3, colour: 0 });
  });

  test('colour: a computed is cached between reads', () => {
    const e = createEngine('colour');
    const a = e.signal(1);
    let n = 0;
    const c = e.computed(() => (n++, a.get() * 2));
    c.get();
    c.get();
    c.get();
    expect(n).toBe(1);
    a.set(5);
    expect(c.get()).toBe(10);
    expect(n).toBe(2);
  });
});

describe('ownership (colour)', () => {
  test('cleanups run before a re-run and at disposal', () => {
    const e = createEngine('colour');
    const n = e.signal(0);
    const log: string[] = [];
    e.createRoot((dispose) => {
      e.effect(() => {
        const v = n.get();
        e.onCleanup(() => log.push(`cleanup ${v}`));
        log.push(`run ${v}`);
      });
      n.set(1);
      dispose();
    });
    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1', 'cleanup 1']);
  });

  test('effects created inside an effect are disposed when it re-runs', () => {
    const e = createEngine('colour');
    const outer = e.signal(0);
    const inner = e.signal(0);
    const log: string[] = [];
    e.effect(() => {
      const o = outer.get();
      e.effect(() => void log.push(`inner ${o}/${inner.get()}`));
    });
    outer.set(1);
    inner.set(1);
    // Only the second generation of the inner effect is alive.
    expect(log).toEqual(['inner 0/0', 'inner 1/0', 'inner 1/1']);
  });

  test('onCleanup outside an owner is an error', () => {
    expect(() => createEngine('colour').onCleanup(() => {})).toThrow(/outside/);
  });

  test('a disposed root stops all its effects', () => {
    const e = createEngine('colour');
    const n = e.signal(0);
    let runs = 0;
    const dispose = e.createRoot((d) => {
      e.effect(() => void (n.get(), runs++));
      e.effect(() => void (n.get(), runs++));
      return d;
    });
    n.set(1);
    dispose();
    n.set(2);
    expect(runs).toBe(4);
  });
});

describe('errors', () => {
  test('a computed that reads itself is a cycle', () => {
    const e = createEngine('colour');
    const c: { get(): number } = e.computed((): number => c.get() + 1);
    expect(() => c.get()).toThrow(/Cycle/);
  });

  test.each(ALL)('%s: an effect that always changes what it reads is stopped', (strategy) => {
    const e = createEngine(strategy);
    const n = e.signal(0);
    expect(() =>
      e.effect(() => {
        n.set(n.get() + 1);
      }),
    ).toThrow();
  });
});

describe('trace and graph', () => {
  test('colour records marks, runs, skips and cutoffs', () => {
    const e = createEngine('colour');
    e.tracing = true;
    const n = e.signal(2, { label: 'n' });
    const even = e.computed(() => n.get() % 2 === 0, { label: 'even' });
    const label = e.computed(() => (even.get() ? 'even' : 'odd'), { label: 'label' });
    e.effect(() => void label.get(), { label: 'fx' });
    e.trace.length = 0;
    n.set(4);
    const types = e.trace.map((t) => t.type);
    expect(types).toContain('set');
    expect(types).toContain('mark');
    expect(types).toContain('cutoff');
    expect(types).toContain('skip');
    // The effect was queued but never re-ran: the value of `even` did not change.
    expect(e.trace.filter((t) => t.type === 'run').map((t) => t.node)).toEqual([e.graph().find((g) => g.label === 'even')!.id]);
  });

  test('graph() lists nodes with their sources', () => {
    const e = createEngine('colour');
    const a = e.signal(1, { label: 'a' });
    e.effect(() => void a.get(), { label: 'fx' });
    const g = e.graph();
    expect(g.map((n) => n.label)).toEqual(['a', 'fx']);
    expect(g[1]!.sources).toEqual([g[0]!.id]);
    expect(g[1]!.runs).toBe(1);
  });
});

import { describe, expect, test } from 'vitest';
import { Reactivity } from './reactive';

const make = () => new Reactivity({ manual: true, debug: true });

describe('reactive objects', () => {
  test('an effect re-runs only for the properties it read', () => {
    const r = make();
    const state = r.reactive({ a: 1, b: 1 });
    const seen: number[] = [];
    r.effect(() => void seen.push(state.a));
    state.b = 2;
    expect(seen).toEqual([1]);
    state.a = 2;
    expect(seen).toEqual([1, 2]);
  });

  test('nested objects are reactive when read through the parent', () => {
    const r = make();
    const state = r.reactive({ user: { name: 'Ann', tags: ['x'] } });
    const seen: string[] = [];
    r.effect(() => void seen.push(`${state.user.name}/${state.user.tags.length}`));
    state.user.name = 'Bob';
    state.user.tags.push('y');
    expect(seen).toEqual(['Ann/1', 'Bob/1', 'Bob/2']);
  });

  test('the same object gives the same proxy', () => {
    const r = make();
    const raw = { a: 1 };
    expect(r.reactive(raw)).toBe(r.reactive(raw));
    expect(r.reactive(r.reactive(raw))).toBe(r.reactive(raw));
    expect(r.toRaw(r.reactive(raw))).toBe(raw);
  });

  test('adding and deleting keys re-runs effects that iterate or test for them', () => {
    const r = make();
    const state = r.reactive<Record<string, number>>({ a: 1 });
    const keys: string[] = [];
    const has: boolean[] = [];
    r.effect(() => void keys.push(Object.keys(state).join(',')));
    r.effect(() => void has.push('b' in state));
    state.b = 2;
    delete state.a;
    expect(keys).toEqual(['a', 'a,b', 'b']);
    expect(has).toEqual([false, true]); // deleting 'a' does not concern an effect that only asked about 'b'
  });

  test('dependencies are re-collected on every run', () => {
    const r = make();
    const state = r.reactive({ ok: true, x: 'x', y: 'y' });
    let runs = 0;
    r.effect(() => {
      runs++;
      void (state.ok ? state.x : state.y);
    });
    state.y = 'y2';
    expect(runs).toBe(1);
    state.ok = false;
    state.x = 'x2';
    expect(runs).toBe(2);
    state.y = 'y3';
    expect(runs).toBe(3);
  });

  test('an effect that writes what it reads does not trigger itself', () => {
    const r = make();
    const state = r.reactive({ count: 0 });
    r.effect(() => void state.count++);
    expect(state.count).toBe(1);
  });

  test('array mutators do not make a pushing effect depend on length', () => {
    const r = make();
    const list = r.reactive<number[]>([]);
    let runs = 0;
    r.effect(() => {
      runs++;
      list.push(runs);
    });
    list.push(99);
    expect(runs).toBe(1);
    expect(list).toEqual([1, 99]);
  });

  test('shortening an array notifies readers of removed indexes', () => {
    const r = make();
    const list = r.reactive(['a', 'b', 'c']);
    const seen: (string | undefined)[] = [];
    r.effect(() => void seen.push(list[2]));
    list.length = 1;
    expect(seen).toEqual(['c', undefined]);
  });
});

describe('refs, computed, and the job queue', () => {
  test('ref and computed', () => {
    const r = make();
    const n = r.ref(2);
    let evals = 0;
    const double = r.computed(() => (evals++, n.value * 2));
    expect(double.value).toBe(4);
    expect(double.value).toBe(4);
    expect(evals).toBe(1);
    n.value = 5;
    expect(evals).toBe(1); // lazy
    expect(double.value).toBe(10);
    expect(evals).toBe(2);
  });

  test('effects that read a computed re-run when its source changes', () => {
    const r = make();
    const n = r.ref(1);
    const double = r.computed(() => n.value * 2);
    const seen: number[] = [];
    r.effect(() => void seen.push(double.value));
    n.value = 2;
    expect(seen).toEqual([2, 4]);
  });

  test('watchEffect batches: three writes, one re-run', () => {
    const r = make();
    const state = r.reactive({ a: 1, b: 1 });
    const seen: string[] = [];
    r.watchEffect(() => void seen.push(`${state.a}${state.b}`));
    state.a = 2;
    state.b = 2;
    state.a = 3;
    expect(seen).toEqual(['11']);
    expect(r.flush()).toBe(1);
    expect(seen).toEqual(['11', '32']);
  });

  test('a stopped effect never runs again', () => {
    const r = make();
    const state = r.reactive({ a: 1 });
    let runs = 0;
    const stop = r.watchEffect(() => void (state.a, runs++));
    stop();
    state.a = 2;
    r.flush();
    expect(runs).toBe(1);
  });

  test('snapshot lists who is subscribed to what', () => {
    const r = make();
    const state = r.reactive({ a: 1, b: 2 }, 'state');
    r.effect(() => void state.a, 'fx1');
    r.effect(() => void (state.a, state.b), 'fx2');
    expect(r.snapshot()).toEqual([
      { target: 'state', key: 'a', effects: ['fx1', 'fx2'] },
      { target: 'state', key: 'b', effects: ['fx2'] },
    ]);
  });
});

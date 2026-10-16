/**
 * Proxy-based reactivity, after Vue 3: `reactive(object)` returns a Proxy that records which effect read which
 * property (`track`) and re-runs those effects when the property is written (`trigger`).
 *
 *   const state = r.reactive({ count: 0 });
 *   r.watchEffect(() => console.log(state.count));
 *   state.count++; // logs 1, on the next microtask
 *
 * The bookkeeping is one table, `targetMap`: target object → property → the set of effects that read it. A
 * `Reactivity` instance owns its own table, so figures and tests can run side by side. With `debug` on, the table can
 * be listed (a real WeakMap cannot be enumerated).
 */

type Key = PropertyKey;
type Dep = Set<ReactiveEffect<any>>;
const ITERATE = Symbol('iterate');

export class ReactiveEffect<T = unknown> {
  deps: Dep[] = [];
  active = true;
  runs = 0;
  constructor(
    readonly owner: Reactivity,
    readonly fn: () => T,
    readonly scheduler?: (effect: ReactiveEffect<T>) => void,
    readonly label = 'effect',
  ) {}
  run(): T {
    if (!this.active) return this.fn();
    this.cleanup();
    const prev = this.owner.activeEffect;
    this.owner.activeEffect = this;
    this.runs++;
    try {
      return this.fn();
    } finally {
      this.owner.activeEffect = prev;
    }
  }
  /** Forget every dependency: the next run re-collects them (this is how branches that are no longer taken fall away). */
  cleanup(): void {
    for (const dep of this.deps) dep.delete(this);
    this.deps.length = 0;
  }
  stop(): void {
    this.cleanup();
    this.active = false;
  }
}

export interface Ref<T> {
  value: T;
}

export interface DepEntry {
  target: string;
  key: string;
  effects: string[];
}

export class Reactivity {
  activeEffect: ReactiveEffect<any> | undefined;
  private shouldTrack = true;
  private targetMap = new WeakMap<object, Map<Key, Dep>>();
  private proxyMap = new WeakMap<object, object>();
  private rawMap = new WeakMap<object, object>();
  private labels = new Map<object, string>();
  private queue = new Set<ReactiveEffect<any>>();
  private flushQueued = false;
  /** When true, `watchEffect` re-runs are queued until `flush()` is called (tests and stepping figures). */
  manual: boolean;
  debug: boolean;

  constructor(opts: { manual?: boolean; debug?: boolean } = {}) {
    this.manual = opts.manual ?? false;
    this.debug = opts.debug ?? false;
  }

  // ───── the two primitives ─────

  track(target: object, key: Key): void {
    if (!this.shouldTrack || !this.activeEffect) return;
    let deps = this.targetMap.get(target);
    if (!deps) this.targetMap.set(target, (deps = new Map()));
    let dep = deps.get(key);
    if (!dep) deps.set(key, (dep = new Set()));
    if (!dep.has(this.activeEffect)) {
      dep.add(this.activeEffect);
      this.activeEffect.deps.push(dep);
    }
  }

  trigger(target: object, key: Key, extra: Key[] = []): void {
    const deps = this.targetMap.get(target);
    if (!deps) return;
    const toRun = new Set<ReactiveEffect>();
    for (const k of [key, ...extra]) for (const e of deps.get(k) ?? []) if (e !== this.activeEffect) toRun.add(e);
    for (const e of toRun) {
      if (e.scheduler) e.scheduler(e);
      else e.run();
    }
  }

  // ───── reactive objects ─────

  reactive<T extends object>(target: T, label?: string): T {
    const existing = this.proxyMap.get(target);
    if (existing) return existing as T;
    if (this.rawMap.has(target)) return target; // already a proxy
    if (label !== undefined || this.debug) this.labels.set(target, label ?? `object${this.labels.size + 1}`);
    const self = this;
    const isArray = Array.isArray(target);
    const proxy = new Proxy(target, {
      get(t, key, receiver) {
        if (isArray && typeof key === 'string' && ARRAY_MUTATORS.has(key)) {
          // Mutators read `length`, which would make an effect that pushes depend on what it pushes to.
          return (...args: unknown[]) => {
            self.shouldTrack = false;
            try {
              return (Array.prototype as any)[key].apply(receiver, args);
            } finally {
              self.shouldTrack = true;
            }
          };
        }
        const value = Reflect.get(t, key, receiver);
        if (typeof key !== 'symbol') self.track(t, key);
        // Nested objects become reactive lazily, when first read through the parent.
        return isObject(value) ? self.reactive(value, label ? `${label}.${String(key)}` : undefined) : value;
      },
      set(t, key, value, receiver) {
        const oldLength = isArray ? (t as unknown[]).length : 0;
        const had = Object.prototype.hasOwnProperty.call(t, key);
        const old = (t as any)[key];
        const raw = self.toRaw(value);
        const ok = Reflect.set(t, key, raw, receiver);
        if (!had) {
          self.trigger(t, key, isArray ? ['length', ITERATE] : [ITERATE]);
        } else if (!Object.is(old, raw)) {
          const extra: Key[] = [];
          if (isArray && key === 'length') for (let i = raw as number; i < oldLength; i++) extra.push(String(i));
          self.trigger(t, key, extra);
        }
        return ok;
      },
      deleteProperty(t, key) {
        const had = Object.prototype.hasOwnProperty.call(t, key);
        const ok = Reflect.deleteProperty(t, key);
        if (had && ok) self.trigger(t, key, [ITERATE]);
        return ok;
      },
      has(t, key) {
        if (typeof key !== 'symbol') self.track(t, key);
        return Reflect.has(t, key);
      },
      ownKeys(t) {
        self.track(t, isArray ? 'length' : ITERATE);
        return Reflect.ownKeys(t);
      },
    });
    this.proxyMap.set(target, proxy);
    this.rawMap.set(proxy, target);
    return proxy as T;
  }

  toRaw<T>(value: T): T {
    return (isObject(value) ? (this.rawMap.get(value as object) as T | undefined) : undefined) ?? value;
  }
  isReactive(value: unknown): boolean {
    return isObject(value) && this.rawMap.has(value as object);
  }

  // ───── refs and computed ─────

  ref<T>(initial: T, label = 'ref'): Ref<T> {
    let value = isObject(initial) ? this.reactive(initial as object) : initial;
    const self = this;
    const box = { label };
    this.labels.set(box, label);
    return {
      get value() {
        self.track(box, 'value');
        return value as T;
      },
      set value(next: T) {
        const v = isObject(next) ? self.reactive(next as object) : next;
        if (Object.is(v, value)) return;
        value = v;
        self.trigger(box, 'value');
      },
    };
  }

  /** A cached value that recomputes lazily, only after a dependency has changed and someone reads it. */
  computed<T>(getter: () => T, label = 'computed'): { readonly value: T } {
    let dirty = true;
    let cached!: T;
    const box = { label };
    this.labels.set(box, label);
    const effect = new ReactiveEffect(
      this,
      getter,
      () => {
        if (!dirty) {
          dirty = true;
          this.trigger(box, 'value');
        }
      },
      label,
    );
    const self = this;
    return {
      get value() {
        self.track(box, 'value');
        if (dirty) {
          cached = effect.run();
          dirty = false;
        }
        return cached;
      },
    };
  }

  // ───── effects ─────

  /** A raw effect: re-runs synchronously, inside the write that triggered it. */
  effect<T>(fn: () => T, label = 'effect'): ReactiveEffect<T> {
    const e = new ReactiveEffect(this, fn, undefined, label);
    e.run();
    return e;
  }

  /** An effect whose re-runs are batched: many writes, one run on the next microtask (or on `flush()`). */
  watchEffect(fn: () => void, label = 'watchEffect'): () => void {
    const e = new ReactiveEffect(this, fn, (eff) => this.queueJob(eff), label);
    e.run();
    return () => e.stop();
  }

  private queueJob(e: ReactiveEffect<any>): void {
    this.queue.add(e);
    if (!this.manual && !this.flushQueued) {
      this.flushQueued = true;
      queueMicrotask(() => this.flush());
    }
  }

  /** Run every queued effect (each at most once). Returns how many ran. */
  flush(): number {
    this.flushQueued = false;
    let ran = 0;
    let guard = 0;
    while (this.queue.size) {
      if (guard++ > 100) throw new Error('Maximum recursive updates exceeded: an effect keeps changing what it reads.');
      const jobs = [...this.queue];
      this.queue.clear();
      for (const job of jobs) {
        if (job.active) {
          job.run();
          ran++;
        }
      }
    }
    return ran;
  }

  // ───── inspection ─────

  /** Every (object, property) pair that has at least one effect subscribed. Needs `debug`. */
  snapshot(): DepEntry[] {
    const out: DepEntry[] = [];
    for (const [target, label] of this.labels) {
      const deps = this.targetMap.get(target);
      if (!deps) continue;
      for (const [key, dep] of deps) {
        if (dep.size) out.push({ target: label, key: key === ITERATE ? '(keys)' : String(key), effects: [...dep].map((e) => e.label) });
      }
    }
    return out;
  }
}

const ARRAY_MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice']);
const isObject = (v: unknown): v is object => typeof v === 'object' && v !== null;

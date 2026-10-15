/**
 * AngularJS's change detection in miniature: a `Scope` with `$watch` and `$digest`.
 *
 * Nothing tells the framework that a value changed. Instead each binding in the page registers a *watcher*: a function
 * that reads the current value, and a listener to call when it differs from what it returned last time. `$digest`
 * loops over every watcher, again and again, until a whole pass finds no change (a change in one listener can change
 * what another watcher reads). `$apply` is the door through which outside events enter: run some code, then digest.
 *
 * This is *dirty checking*: cost per event = (number of watchers) × (number of passes), whatever actually changed.
 */

/** What a digest did, for figures: one `watch` per watcher call, one `pass` at the end of each pass. */
export type DigestEvent = { type: 'watch'; pass: number; label: string; value: unknown; changed: boolean } | { type: 'pass'; pass: number; dirty: boolean };

export interface Watcher {
  watchFn: (scope: Scope) => unknown;
  listenerFn: (newValue: any, oldValue: any, scope: Scope) => void;
  valueEq: boolean;
  last: unknown;
  /** For figures: the label of the binding. */
  label?: string;
}

const INIT = Symbol('init');

export class Scope {
  [key: string]: any;
  $$watchers: Watcher[] = [];
  $$children: Scope[] = [];
  $$root: Scope;
  $$asyncQueue: (() => void)[] = [];
  /** Instrumentation, shared by the whole scope tree. */
  $$stats: { watchCalls: number; passes: number; digests: number; listenerCalls: number };
  /** Set on the root to observe digests. */
  $$trace: ((e: DigestEvent) => void) | null = null;
  private $$pass = 0;

  constructor(parent?: Scope) {
    if (parent) {
      // Child scopes inherit properties from the parent through the prototype chain, as AngularJS does.
      Object.setPrototypeOf(this, parent);
      this.$$root = parent.$$root;
      this.$$stats = parent.$$stats;
      this.$$watchers = [];
      this.$$children = [];
      this.$$asyncQueue = parent.$$asyncQueue;
      parent.$$children.push(this);
    } else {
      this.$$root = this;
      this.$$stats = { watchCalls: 0, passes: 0, digests: 0, listenerCalls: 0 };
    }
  }

  $new(): Scope {
    return new Scope(this);
  }

  $watch(watchFn: Watcher['watchFn'], listenerFn: Watcher['listenerFn'] = () => {}, valueEq = false, label?: string): () => void {
    const w: Watcher = { watchFn, listenerFn, valueEq, last: INIT, label };
    this.$$watchers.push(w);
    return () => {
      const i = this.$$watchers.indexOf(w);
      if (i >= 0) this.$$watchers.splice(i, 1);
    };
  }

  private $$everyScope(fn: (s: Scope) => boolean): boolean {
    if (fn(this)) return this.$$children.every((c) => c.$$everyScope(fn));
    return false;
  }

  private static same(a: unknown, b: unknown, valueEq: boolean): boolean {
    if (valueEq) return JSON.stringify(a) === JSON.stringify(b);
    return a === b || (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b));
  }

  /** One pass over every watcher of this scope and its children. Returns true if any value had changed. */
  private $$digestOnce(): boolean {
    let dirty = false;
    this.$$everyScope((scope) => {
      for (const w of [...scope.$$watchers]) {
        this.$$stats.watchCalls++;
        const newValue = w.watchFn(scope);
        const oldValue = w.last;
        const changed = !Scope.same(newValue, oldValue, w.valueEq);
        this.$$root.$$trace?.({ type: 'watch', pass: this.$$root.$$pass, label: w.label ?? '', value: newValue, changed });
        if (changed) {
          w.last = w.valueEq ? JSON.parse(JSON.stringify(newValue ?? null)) : newValue;
          this.$$stats.listenerCalls++;
          w.listenerFn(newValue, oldValue === INIT ? newValue : oldValue, scope);
          dirty = true;
        }
      }
      return true;
    });
    return dirty;
  }

  /** Run all watchers until none reports a change; give up after 10 passes, as AngularJS does. */
  $digest(): number {
    const root = this.$$root;
    let ttl = 10;
    let passes = 0;
    root.$$stats.digests++;
    let dirty: boolean;
    root.$$pass = 0;
    do {
      while (root.$$asyncQueue.length) root.$$asyncQueue.shift()!();
      dirty = root.$$digestOnce();
      root.$$trace?.({ type: 'pass', pass: root.$$pass, dirty });
      root.$$pass++;
      passes++;
      root.$$stats.passes++;
      if ((dirty || root.$$asyncQueue.length) && !ttl--) throw new Error('10 $digest() iterations reached. Aborting!');
    } while (dirty || root.$$asyncQueue.length);
    return passes;
  }

  /** Evaluate `fn` (or an expression string) in this scope, then digest from the root. */
  $apply<T>(fn?: (scope: Scope) => T): T | undefined {
    try {
      return fn?.(this);
    } finally {
      this.$$root.$digest();
    }
  }

  $eval<T>(fn: (scope: Scope) => T): T {
    return fn(this);
  }

  /** Queue `fn` to run at the start of the next digest pass. */
  $evalAsync(fn: (scope: Scope) => void): void {
    this.$$root.$$asyncQueue.push(() => fn(this));
  }

  /** Number of watchers in this scope and its descendants. */
  $watcherCount(): number {
    return this.$$watchers.length + this.$$children.reduce((n, c) => n + c.$watcherCount(), 0);
  }
}

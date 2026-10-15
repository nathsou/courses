/**
 * Angular's change detection as a model of the component tree: which views are *traversed* and which have their
 * bindings *re-evaluated* when something happens, with zone.js, with OnPush, and with signals and no zone.
 *
 * What it models (and what it does not): a tree of views, each with a number of template bindings and a strategy.
 * - `default` views are re-checked on every tick that reaches them.
 * - `onpush` views are re-checked only when marked: by an event in the view or below it, `markForCheck`, or a signal
 *   their template reads. An event or `markForCheck` marks the view *and every ancestor* dirty (all of them are
 *   re-checked, so the walk can get down to it); a signal marks only its own view and tells its ancestors to be
 *   *traversed* without re-evaluating their bindings.
 * - zone.js decides *when* a tick runs: after every async task finishes (events, timers, HTTP), whether or not
 *   anything changed. Without it ("zoneless") a tick is scheduled only by a notification (an event listener, a signal
 *   write that a template read, `markForCheck`).
 * It does not model inputs, content projection, `ExpressionChangedAfterItHasBeenChecked`, or the dev-mode second pass.
 */

export type ViewStrategy = 'default' | 'onpush';
export type CdMode = 'zone' | 'zoneless';

export interface ViewSpec {
  name: string;
  strategy: ViewStrategy;
  /** Number of template bindings evaluated when the view is checked. */
  bindings: number;
  children?: ViewSpec[];
}

export interface View {
  name: string;
  strategy: ViewStrategy;
  bindings: number;
  children: View[];
  parent: View | null;
  /** Marked for a check of its own bindings (event, markForCheck). */
  dirty: boolean;
  /** A signal read by its template changed. */
  reactive: boolean;
  /** Something below needs checking: traverse, but do not re-evaluate this view's own bindings. */
  childDirty: boolean;
}

export function buildViews(spec: ViewSpec, parent: View | null = null): View {
  const v: View = { name: spec.name, strategy: spec.strategy, bindings: spec.bindings, children: [], parent, dirty: false, reactive: false, childDirty: false };
  v.children = (spec.children ?? []).map((c) => buildViews(c, v));
  return v;
}

export function find(root: View, name: string): View {
  if (root.name === name) return root;
  for (const c of root.children) {
    try {
      return find(c, name);
    } catch {
      /* keep looking */
    }
  }
  throw new Error(`no view named ${name}`);
}

export function allViews(root: View): View[] {
  return [root, ...root.children.flatMap(allViews)];
}

/** `markForCheck` (and any event listener): the view and *every ancestor* are dirty, so all of them are re-checked. */
export function markForCheck(v: View): void {
  for (let p: View | null = v; p; p = p.parent) p.dirty = true;
}

/** A signal read by this view's template changed: refresh this view, traverse its ancestors. */
export function notifySignal(v: View): void {
  v.reactive = true;
  for (let p = v.parent; p; p = p.parent) p.childDirty = true;
}

export interface Tick {
  /** Views the walk went through, in order. */
  visited: string[];
  /** Views whose bindings were evaluated. */
  checked: string[];
  bindings: number;
}

/** One change-detection pass from the root. */
export function tick(root: View): Tick {
  const out: Tick = { visited: [], checked: [], bindings: 0 };
  const refresh = (v: View) => {
    const mustCheck = v.strategy === 'default' || v.dirty || v.reactive;
    if (!mustCheck && !v.childDirty) return; // a clean OnPush view hides its whole subtree
    out.visited.push(v.name);
    if (mustCheck) {
      out.checked.push(v.name);
      out.bindings += v.bindings;
    }
    v.dirty = false;
    v.reactive = false;
    for (const c of v.children) refresh(c);
    v.childDirty = false;
  };
  refresh(root);
  return out;
}

export type CdEvent =
  | { kind: 'click'; view: string } // a DOM event handled in a view
  | { kind: 'timer' } // an unrelated setTimeout / HTTP response / promise somewhere
  | { kind: 'signal'; view: string } // a signal read by that view's template is written
  | { kind: 'markForCheck'; view: string };

/**
 * What happens when `event` occurs. Returns the tick it caused, or null if none ran (zoneless mode ignores an
 * async task that notified nothing).
 */
export function handle(root: View, mode: CdMode, event: CdEvent): Tick | null {
  let notified = false;
  switch (event.kind) {
    case 'click':
      // Angular marks the view where an event listener ran (and its ancestors) as dirty.
      markForCheck(find(root, event.view));
      notified = true;
      break;
    case 'markForCheck':
      markForCheck(find(root, event.view));
      notified = true;
      break;
    case 'signal':
      notifySignal(find(root, event.view));
      notified = true;
      break;
    case 'timer':
      break;
  }
  // With zone.js every task ends in a tick. Without it, only a notification schedules one.
  if (mode === 'zone' || notified) return tick(root);
  return null;
}

/** A small application: a header, a sidebar with three items, and a main area with a table of five rows. */
export function sampleApp(strategy: ViewStrategy): ViewSpec {
  const s = strategy;
  return {
    name: 'App',
    strategy: 'default',
    bindings: 3,
    children: [
      { name: 'Header', strategy: s, bindings: 4 },
      { name: 'Sidebar', strategy: s, bindings: 6, children: ['Home', 'Inbox', 'Settings'].map((n) => ({ name: n, strategy: s, bindings: 2 })) },
      {
        name: 'Main',
        strategy: s,
        bindings: 8,
        children: [
          { name: 'Toolbar', strategy: s, bindings: 3 },
          { name: 'Table', strategy: s, bindings: 10, children: [1, 2, 3, 4, 5].map((i) => ({ name: `Row${i}`, strategy: s, bindings: 4 })) },
          { name: 'Footer', strategy: s, bindings: 2 },
        ],
      },
    ],
  };
}

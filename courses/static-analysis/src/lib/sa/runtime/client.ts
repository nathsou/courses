/**
 * The page's side of the rule runner: one shared worker, requests with ids, and a time limit after which the
 * worker is terminated and replaced (a rule with an infinite loop must not freeze the page).
 */
import type { WorkerRequest } from './worker.js';
import type { RuleRunResult } from './run.js';
import type { TestsResult } from './tests.js';
import type { InspectResult } from './inspect.js';
import type { CorpusResult } from './corpus.js';
import type { SelectResult } from './select.js';

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

let worker: Worker | undefined;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'rule-runner' });
  worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    clearTimeout(p.timer);
    if (e.data.error !== undefined) p.reject(new Error(e.data.error));
    else p.resolve(e.data.result);
  };
  worker.onerror = (e) => {
    for (const [id, p] of pending) {
      clearTimeout(p.timer);
      p.reject(new Error(e.message || 'The runner crashed'));
      pending.delete(id);
    }
    worker?.terminate();
    worker = undefined;
  };
  return worker;
}

export class TimeoutError extends Error {}

type Body = WorkerRequest extends infer R ? (R extends { id: number } ? Omit<R, 'id'> : never) : never;

function call<T>(body: Body, timeoutMs: number): Promise<T> {
  const w = getWorker();
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      // Everything in flight dies with the worker.
      for (const [otherId, p] of pending) {
        clearTimeout(p.timer);
        p.reject(new TimeoutError('The runner was restarted'));
        pending.delete(otherId);
      }
      w.terminate();
      if (worker === w) worker = undefined;
      reject(new TimeoutError(`Stopped after ${timeoutMs / 1000} s: does the rule loop forever?`));
    }, timeoutMs);
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
    w.postMessage({ ...body, id });
  });
}

/** The first request also loads TypeScript, ESLint and the library: allow it more time. */
let warm = false;
const limit = (ms: number) => (warm ? ms : ms + 20_000);

export async function runRuleRemote(request: Extract<Body, { kind: 'rule' }>['request']): Promise<RuleRunResult> {
  const r = await call<RuleRunResult>({ kind: 'rule', request }, limit(10_000));
  warm = true;
  return r;
}

export async function runTestsRemote(files: Record<string, string>, entry: string): Promise<TestsResult> {
  const r = await call<TestsResult>({ kind: 'tests', files, entry }, limit(10_000));
  warm = true;
  return r;
}

export async function inspectRemote(code: string, opts: { file?: string; types?: boolean } = {}): Promise<InspectResult> {
  const r = await call<InspectResult>({ kind: 'inspect', code, ...opts }, limit(10_000));
  warm = true;
  return r;
}

export async function runCorpusRemote(request: Extract<Body, { kind: 'corpus' }>['request']): Promise<CorpusResult> {
  const r = await call<CorpusResult>({ kind: 'corpus', request }, limit(30_000));
  warm = true;
  return r;
}

/** Start loading the runner before it is needed (e.g. when an exercise scrolls into view). */
export function prewarm(): void {
  if (!warm) void inspectRemote('0;').catch(() => {});
}

export async function selectRemote(code: string, selector: string): Promise<SelectResult> {
  const r = await call<SelectResult>({ kind: 'select', code, selector }, limit(10_000));
  warm = true;
  return r;
}

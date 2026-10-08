import type { RunReport, RunRequest } from './protocol';

/**
 * Run an exercise's tests against the reader's code in a fresh worker. A new worker per run means an infinite
 * loop can always be stopped by the timeout.
 */
export function runExercise(req: RunRequest, timeoutMs = 10_000): Promise<RunReport> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ ok: false, error: `Stopped after ${timeoutMs / 1000} s: is there an infinite loop?`, results: [], logs: [], ms: timeoutMs });
    }, timeoutMs);
    worker.onmessage = (e: MessageEvent<RunReport>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, error: e.message || 'The worker failed to start', results: [], logs: [], ms: 0 });
    };
    worker.postMessage(req);
  });
}

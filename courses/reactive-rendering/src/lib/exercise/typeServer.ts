/**
 * One TypeScript worker shared by every editor on the page, started the first time an editor scrolls into view
 * (reading a chapter that never reaches an exercise downloads none of it).
 */
import * as Comlink from 'comlink';
import type { WorkerShape } from '@valtown/codemirror-ts/worker';

let ready: Promise<Comlink.Remote<WorkerShape>> | undefined;

export function typeServer(): Promise<Comlink.Remote<WorkerShape>> {
  ready ??= (async () => {
    const inner = new Worker(new URL('./tsWorker.ts', import.meta.url), { type: 'module' });
    const worker = Comlink.wrap<WorkerShape>(inner);
    await worker.initialize();
    return worker;
  })();
  ready.catch(() => (ready = undefined)); // a failed start can be retried by the next editor
  return ready;
}

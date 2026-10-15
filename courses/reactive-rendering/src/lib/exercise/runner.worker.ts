/// <reference lib="webworker" />
import { runInWorker } from './run';
import type { RunRequest } from './protocol';

self.onmessage = async (e: MessageEvent<RunRequest>) => {
  const report = await runInWorker(e.data);
  (self as unknown as Worker).postMessage(report);
};

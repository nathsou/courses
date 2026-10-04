/** The Ledger's checks in a Web Worker (chapter 28): one result per check as it finishes. */
import { runChecks, sources, type CheckResult } from './ledger';

export type LedgerRequest = { on: string[]; fixed: boolean; link: boolean };
export type LedgerEvent = { kind: 'result'; result: CheckResult } | { kind: 'error'; message: string } | { kind: 'done' };

const post = (e: LedgerEvent) => postMessage(e);

addEventListener('message', async (e: MessageEvent<LedgerRequest>) => {
  try {
    await runChecks(sources(e.data.on, e.data.fixed), { link: e.data.link, onResult: (result) => post({ kind: 'result', result }) });
  } catch (err) {
    post({ kind: 'error', message: String(err) });
  }
  post({ kind: 'done' });
});

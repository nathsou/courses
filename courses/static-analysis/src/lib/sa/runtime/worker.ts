/**
 * The rule runner in a Web Worker: runs rule exercises, test files and the inspector off the main thread.
 * The page terminates and replaces the worker if a request takes too long (an infinite loop in a rule).
 */
import './shims.js';
import { loadLibs } from './libs.js';
import { runRule, type RuleRunRequest } from './run.js';
import { runTests } from './tests.js';
import { inspect } from './inspect.js';
import { runCorpus, type CorpusRequest } from './corpus.js';
import { selectNodes } from './select.js';

export type WorkerRequest =
  | { id: number; kind: 'rule'; request: Omit<RuleRunRequest, 'libs'> }
  | { id: number; kind: 'tests'; files: Record<string, string>; entry: string }
  | { id: number; kind: 'inspect'; code: string; file?: string; types?: boolean }
  | { id: number; kind: 'corpus'; request: Omit<CorpusRequest, 'libs'> }
  | { id: number; kind: 'select'; code: string; selector: string };

addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const m = e.data;
  try {
    const libs = await loadLibs();
    let result: unknown;
    if (m.kind === 'rule') result = runRule({ ...m.request, libs });
    else if (m.kind === 'tests') result = runTests(m.files, m.entry, libs);
    else if (m.kind === 'inspect') result = inspect(m.code, libs, { file: m.file, types: m.types });
    else if (m.kind === 'select') result = selectNodes(m.code, m.selector, libs);
    else result = runCorpus({ ...m.request, libs });
    postMessage({ id: m.id, result: JSON.parse(JSON.stringify(result)) });
  } catch (err) {
    postMessage({ id: m.id, error: err instanceof Error ? err.message : String(err) });
  }
});

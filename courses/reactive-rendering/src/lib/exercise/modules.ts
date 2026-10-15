/**
 * Evaluates the reader's TypeScript as a CommonJS-style module with a controlled `require`, after the design of
 * Language Models from Scratch. The library modules below are what exercises may import.
 */
import { transform } from 'sucrase';
import * as heapApi from '../mm/heap/api';
import * as words from '../mm/heap/words';
import * as allocators from '../mm/heap/allocators';
import * as checker from '../mm/check/checker';
import * as trace from '../mm/trace/trace';
import * as sv39 from '../mm/machine/sv39';
import * as phys from '../mm/machine/phys';
import * as cache from '../mm/machine/cache';
import * as kernel from '../mm/kernel/kernel';
import * as buddy from '../mm/kernel/buddy';
import * as replace from '../mm/kernel/replace';
import * as gc from '../mm/managers/gcapi';
import * as benchMod from '../mm/check/bench';
import * as explore from '../mm/explore/tricolour';

export const LIBRARY: Record<string, unknown> = {
  '@mm/heap': { ...heapApi, ...words, WORD: allocators.WORD, ALIGN: allocators.ALIGN, MIN_BLOCK: allocators.MIN_BLOCK, align: allocators.align, pack: allocators.pack, blockSize: allocators.blockSize },
  '@mm/allocators': allocators,
  '@mm/check': checker,
  '@mm/trace': trace,
  '@mm/sv39': { ...sv39, ...phys },
  '@mm/cache': cache,
  '@mm/kernel': { ...kernel, ...buddy, PTE: sv39.PTE },
  '@mm/replace': replace,
  '@mm/gc': gc,
  '@mm/bench': benchMod,
  '@mm/explore': explore,
};

/** Lines added by `new Function` before the module body (for mapping stack traces). */
const FN_HEADER_LINES = 2;

export function transpile(code: string, file: string): string {
  return transform(code, { transforms: ['typescript', 'imports'], filePath: file, production: true }).code;
}

export type Resolver = (specifier: string) => unknown;

export function evaluate(code: string, file: string, resolve: Resolver, consoleImpl: Pick<Console, 'log' | 'warn' | 'error' | 'info'> = console): Record<string, unknown> {
  const js = transpile(code, file);
  const module = { exports: {} as Record<string, unknown> };
  const req = (spec: string) => {
    const m = resolve(spec);
    if (m === undefined) throw new Error(`Cannot find module '${spec}'. Available: ${Object.keys(LIBRARY).join(', ')}`);
    return m;
  };
  const fn = new Function('require', 'module', 'exports', 'console', `${js}\n//# sourceURL=${file}`);
  fn(req, module, module.exports, consoleImpl);
  return module.exports;
}

/** Turn an error into "message (line N)" using the stack, when it points into the reader's code. */
export function describeError(e: unknown, file: string): string {
  if (!(e instanceof Error)) return String(e);
  const m = e.stack && new RegExp(`${file.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}:(\\d+):(\\d+)`).exec(e.stack);
  const where = m ? ` (line ${Number(m[1]) - FN_HEADER_LINES})` : '';
  return `${e.name === 'Error' ? '' : e.name + ': '}${e.message}${where}`;
}

/**
 * Evaluates the reader's TypeScript as a CommonJS-style module with a controlled `require`, after the design of
 * Language Models from Scratch. The library modules below are what exercises may import.
 */
import { transform } from 'sucrase';
import * as dom from '../rx/dom';
import * as keyed from '../rx/keyed';
import * as vdom from '../rx/vdom';
import * as ssr from '../rx/ssr';
import * as scheduler from '../rx/scheduler';
import * as signals from '../rx/signals';
import * as reactive from '../rx/reactive';
import * as template from '../rx/template';
import * as lit from '../rx/lit';
import * as svelte4 from '../rx/svelte4';
import * as digest from '../rx/digest';
import * as morph from '../rx/morph';
import * as resume from '../rx/resume';
import * as flight from '../rx/flight';
import * as cd from '../rx/cd';
import * as tc39 from 'signal-polyfill';

/** What exercises may import: the course's reactive lab. */
export const LIBRARY: Record<string, unknown> = {
  '@rx/dom': dom,
  '@rx/keyed': keyed,
  '@rx/vdom': vdom,
  '@rx/ssr': ssr,
  '@rx/scheduler': scheduler,
  '@rx/signals': signals,
  '@rx/reactive': reactive,
  '@rx/template': template,
  '@rx/lit': lit,
  '@rx/svelte4': svelte4,
  '@rx/digest': digest,
  '@rx/morph': morph,
  '@rx/resume': resume,
  '@rx/flight': flight,
  '@rx/cd': cd,
  '@rx/tc39': tc39,
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

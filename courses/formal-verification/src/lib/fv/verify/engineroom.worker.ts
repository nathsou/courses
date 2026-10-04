/** The engine room in a Web Worker: every applicable engine on one declaration, one result per engine. */
import { parse } from '../vouch/syntax/parser';
import { check } from '../vouch/check/checker';
import { functionRoom, systemRoom, type RoomResult } from './engineroom';

export type RoomRequest = { source: string; decl?: string; timeout: number; bound?: number };
export type RoomEvent = { kind: 'start'; decl: string; target: 'system' | 'fn'; engines: string[] } | { kind: 'result'; result: RoomResult } | { kind: 'error'; message: string } | { kind: 'done' };

export const SYSTEM_ENGINES = ['explorer', 'BDD reachability', 'bounded model checking', 'k-induction', 'IC3'];
export const FUNCTION_ENGINES = ['random testing', 'symbolic execution', 'program verifier', 'interval analysis'];

const post = (e: RoomEvent) => postMessage(e);

addEventListener('message', (e: MessageEvent<RoomRequest>) => {
  try {
    const p = parse(e.data.source);
    const c = check(p.program);
    const errs = [...p.diagnostics, ...c.diagnostics].filter((d) => d.severity === 'error');
    if (errs.length) throw new Error(errs.map((d) => d.message).join(' '));
    const decls = c.program.decls.flatMap((d): { k: 'system' | 'fn'; name: string }[] =>
      d.k === 'system' ? [{ k: 'system', name: d.name }] : d.k === 'fn' && d.flavour === 'fn' && d.body ? [{ k: 'fn', name: d.name }] : [],
    );
    const d = decls.find((x) => x.name === e.data.decl) ?? decls.at(-1);
    if (!d) throw new Error('There is no system or function to check.');
    const onResult = (result: RoomResult) => post({ kind: 'result', result });
    if (d.k === 'system') {
      post({ kind: 'start', decl: d.name, target: 'system', engines: SYSTEM_ENGINES });
      systemRoom(c, d.name, { timeout: e.data.timeout, bound: e.data.bound, onResult });
    } else {
      post({ kind: 'start', decl: d.name, target: 'fn', engines: FUNCTION_ENGINES });
      functionRoom(c, d.name, e.data.source, { timeout: e.data.timeout, onResult });
    }
  } catch (err) {
    post({ kind: 'error', message: (err as Error).message ?? String(err) });
  }
  post({ kind: 'done' });
});

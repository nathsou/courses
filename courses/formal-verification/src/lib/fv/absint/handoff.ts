/**
 * Handing an analyser's invariant to the verifier (chapter 27): the abstract interpreter, or CEGAR, is an untrusted
 * oracle that proposes a loop invariant; the program verifier of Part IV checks it. The invariant is written into
 * the function as an `invariant` clause on the loop that starts on the given line, and the function is verified.
 * Only the verifier's verdict counts.
 */
import { parse } from '../vouch/syntax/parser';
import { check } from '../vouch/check/checker';
import { verifyFunction } from '../vouch/vc/verify';
import type { Shown } from './analyse';

/** An abstract state (as the analyser shows it) as a Vouch condition. */
export function shownToVouch(s: Shown): string {
  const parts: string[] = [];
  const name = (x: string) => x.replace(/^\|(\w+)\|$/, 'len($1)');
  for (const [x, v] of Object.entries(s.vars)) {
    if (x.startsWith('$')) continue;
    const single = /^(-?\d+)$/.exec(v);
    if (single) {
      parts.push(`${name(x)} == ${single[1]}`);
      continue;
    }
    const m = /^\[(−∞|-?\d+), (\+∞|-?\d+)\]$/.exec(v);
    if (!m) continue;
    if (m[1] !== '−∞') parts.push(`${m[1]} <= ${name(x)}`);
    if (m[2] !== '+∞') parts.push(`${name(x)} <= ${m[2]}`);
  }
  for (const r of s.relations) {
    if (r === 'unreachable') return 'false';
    parts.push(
      r
        .replace(/\|(\w+)\|/g, 'len($1)')
        .replace(/≤/g, '<=')
        .replace(/≥/g, '>=')
        .replace(/−/g, '-')
        .replace(/ = /g, ' == '),
    );
  }
  return parts.length ? parts.join(' && ') : 'true';
}

export interface HandoffResult {
  source: string;
  status: 'verified' | 'failed' | 'error';
  message: string;
}

export function checkInvariant(source: string, fnName: string, loopLine: number, invariant: string): HandoffResult {
  const lines = source.split('\n');
  const loop = lines[loopLine - 1];
  if (loop === undefined || !/^\s*while\b/.test(loop)) return { source, status: 'error', message: `Line ${loopLine} does not start a while loop.` };
  const indent = loop.match(/^\s*/)![0] + '  ';
  // `while c {` becomes `while c` + the invariant + `{` on its own line.
  const head = loop.replace(/\s*\{\s*$/, '');
  const withInv = [...lines.slice(0, loopLine - 1), head, `${indent}invariant ${invariant}`, `${loop.match(/^\s*/)![0]}{`, ...lines.slice(loopLine)].join('\n');
  const p = parse(withInv);
  const c = check(p.program);
  const errs = [...p.diagnostics, ...c.diagnostics].filter((d) => d.severity === 'error');
  if (errs.length) return { source: withInv, status: 'error', message: errs.map((e) => e.message).join(' ') };
  const info = c.fns.get(fnName);
  if (!info) return { source: withInv, status: 'error', message: `No function ${fnName}.` };
  const r = verifyFunction(c, info, { timeout: 8000 });
  const bad = r.verdicts.filter((v) => v.status !== 'verified');
  if (r.unsupported) return { source: withInv, status: 'error', message: r.unsupported };
  if (!bad.length) return { source: withInv, status: 'verified', message: 'The verifier proves the invariant holds on entry and is preserved, and every assertion and check of the function.' };
  return { source: withInv, status: 'failed', message: bad.map((v) => `${v.subject}: ${v.message ?? v.status}`).join(' ') };
}

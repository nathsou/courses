/**
 * An analysis of one Weft source by synth (`analyze`: diagnostics and the name index), with its offsets
 * converted to string indices of the source it was made for.
 */
import type { Analysis as SynthAnalysis, Diagnostic, SourceFile, SourceRef, Synth } from '../synth/api';
import { analyze } from '../synth/api';
import { byteToIndex } from './offsets';

export interface Located<T> {
  from: number;
  to: number;
  item: T;
}

export interface WeftAnalysis {
  /** The text that was analysed. */
  source: string;
  /** The file name the source was analysed under. */
  file: string;
  /** Every diagnostic, including those in other files of the design (without a range here). */
  diagnostics: Diagnostic[];
  /** Diagnostics located in this source. */
  located: Located<Diagnostic>[];
  refs: Located<SourceRef>[];
  /** What each name is, by its start index (for highlighting). */
  kinds: Map<number, string>;
}

export function locate(source: string, file: string, a: SynthAnalysis): WeftAnalysis {
  const at = byteToIndex(source);
  const located: Located<Diagnostic>[] = [];
  for (const d of a.diagnostics) {
    if (d.at && d.at.file === file) located.push({ from: at(d.at.start), to: at(d.at.end), item: d });
  }
  const refs: Located<SourceRef>[] = [];
  const kinds = new Map<number, string>();
  for (const r of a.refs) {
    if (r.file !== file) continue;
    const from = at(r.start);
    refs.push({ from, to: at(r.end), item: r });
    kinds.set(from, r.kind);
  }
  return { source, file, diagnostics: a.diagnostics, located, refs, kinds };
}

/** Analyses a source (with any other files of its design) and locates the result in it. */
export async function analyzeSource(synth: Synth, source: string, opts: { file?: string; others?: SourceFile[]; top?: string } = {}): Promise<WeftAnalysis> {
  const file = opts.file ?? 'design.weft';
  const a = await analyze(synth, [{ name: file, text: source }, ...(opts.others ?? [])], { top: opts.top });
  return locate(source, file, a);
}

/** The name under an index, if the analysis knows it. */
export function refAt(a: WeftAnalysis, pos: number): Located<SourceRef> | undefined {
  let best: Located<SourceRef> | undefined;
  for (const r of a.refs) {
    if (r.from <= pos && pos <= r.to && (!best || r.to - r.from < best.to - best.from)) best = r;
  }
  return best;
}

/** The first error, as one line ("line 3: `x` is not declared"), or undefined. */
export function firstError(a: { diagnostics: Diagnostic[] }): string | undefined {
  const d = a.diagnostics.find((x) => x.severity === 'error');
  if (!d) return undefined;
  return d.at ? `line ${d.at.line}: ${d.message}` : d.message;
}

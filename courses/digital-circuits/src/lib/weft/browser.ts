/**
 * Weft in the pages: analysis and formatting through synth's `check` worker lane. Each editor passes its own
 * key, so a newer keystroke supersedes an older analysis of the same editor but not of another one.
 */
import type { Analysis, SourceFile } from '../synth/api';
import { latest, request } from '../synth/client';
import { locate, type WeftAnalysis } from './analysis';

export async function analyzeInPage(key: string, source: string, opts: { file?: string; others?: SourceFile[]; top?: string } = {}): Promise<WeftAnalysis | undefined> {
  const file = opts.file ?? 'design.weft';
  const a = await latest<Analysis>(`analyze:${key}`, 'analyze', { files: [{ name: file, text: source }, ...(opts.others ?? [])], top: opts.top, testbench: true });
  return a && locate(source, file, a);
}

export async function formatInPage(source: string): Promise<string> {
  return (await request<{ text: string }>('check', 'format', { text: source })).text;
}

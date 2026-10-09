/**
 * The corpus: Corkboard and a few small projects, analysed as one program each. Running a rule on it and
 * comparing with the expected issues is the course's version of SonarJS's ruling tests.
 */
import { lint } from './lint.js';
import { loadRule } from './run.js';

import { CORPUS, corpusProjects } from './corpus-files.js';
export { CORPUS, corpusProjects };

import type { CorpusIssue } from './ruling.js';

export interface CorpusRequest {
  ruleFiles: Record<string, string>;
  entry: string;
  ruleKey: string;
  options?: unknown[];
  libs: Map<string, string>;
}

export interface CorpusResult {
  loadError?: string;
  ruleErrors: { file: string; message: string }[];
  issues: CorpusIssue[];
  files: number;
}

export function runCorpus(req: CorpusRequest): CorpusResult {
  let rule;
  try {
    rule = loadRule(req.ruleFiles, req.entry);
  } catch (e) {
    return { loadError: e instanceof Error ? e.message : String(e), ruleErrors: [], issues: [], files: 0 };
  }
  const issues: CorpusIssue[] = [];
  const ruleErrors: CorpusResult['ruleErrors'] = [];
  let files = 0;
  for (const project of corpusProjects()) {
    const projectFiles = Object.fromEntries(Object.entries(CORPUS).filter(([p]) => p.startsWith(`/${project}/`)));
    files += Object.keys(projectFiles).length;
    const r = lint({ files: projectFiles, rules: { [req.ruleKey]: rule }, options: req.options ? { [req.ruleKey]: req.options } : undefined, libs: req.libs });
    ruleErrors.push(...r.ruleErrors);
    for (const i of r.issues) issues.push({ file: i.file, line: i.line, message: i.message });
  }
  issues.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return { ruleErrors, issues, files };
}

export type { RulingDiff } from './ruling.js';
export { rulingDiff } from './ruling.js';

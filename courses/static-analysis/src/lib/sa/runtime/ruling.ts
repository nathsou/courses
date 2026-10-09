/** Comparing a rule's issues on the corpus with the expected ones, as SonarJS's ruling tests do. */
export interface CorpusIssue {
  file: string;
  line: number;
  message: string;
}

export interface RulingDiff {
  /** Issues the rule raises that the expected results do not have. */
  added: CorpusIssue[];
  /** Expected issues the rule no longer raises. */
  removed: { file: string; line: number }[];
  unchanged: number;
}

export function rulingDiff(issues: CorpusIssue[], expected: Record<string, number[]>): RulingDiff {
  const remaining = new Map(Object.entries(expected).map(([f, lines]) => [f, [...lines]]));
  const added: CorpusIssue[] = [];
  let unchanged = 0;
  for (const i of issues) {
    const lines = remaining.get(i.file);
    const k = lines?.indexOf(i.line) ?? -1;
    if (lines && k >= 0) {
      lines.splice(k, 1);
      unchanged++;
    } else added.push(i);
  }
  const removed = [...remaining].flatMap(([file, lines]) => lines.map((line) => ({ file, line })));
  return { added, removed, unchanged };
}

/** The expected-results format: file → sorted line numbers (one entry per issue). */
export function toExpected(issues: CorpusIssue[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const i of issues) (out[i.file] ??= []).push(i.line);
  for (const lines of Object.values(out)) lines.sort((a, b) => a - b);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

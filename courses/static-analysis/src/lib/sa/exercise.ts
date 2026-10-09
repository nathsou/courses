/**
 * Rule-workbench exercises: the YAML spec written in chapters (```rule blocks) and the mapping from its short
 * file names to the paths the runner and the language server use.
 *
 *     /rules/<KEY>/rule.ts         the rule (files: rule.ts, meta.ts, …)
 *     /rules/helpers/<name>.ts     a helper the reader writes (files: helpers/<name>.ts); otherwise the kit's
 *     /fixtures/<name>             fixtures (visible and hidden)
 *     /test/<name>                 test files (helper exercises)
 */
export interface WorkbenchSpec {
  id: string;
  kind?: string;
  title?: string;
  prompt?: string;
  hints?: string[];
  /** Markdown explanation shown with the reference solution. */
  solution?: string;
  /** The rule key (default 'R'). */
  key?: string;
  /** The file exporting the rule (default 'rule.ts'). */
  entry?: string;
  /** Starter files, by short name. */
  files: Record<string, string>;
  /** Short names of files shown read-only. */
  readonly?: string[];
  /** Visible fixtures (rule exercises). */
  fixtures?: Record<string, string>;
  /** Fixtures run on Submit only. */
  hidden?: Record<string, string>;
  /** Visible test files (helper exercises), by short name. */
  tests?: Record<string, string>;
  /** Test files run on Submit only. */
  hiddenTests?: Record<string, string>;
  /** Reference versions of the reader's files (checked at build time; shown on request). */
  answer?: Record<string, string>;
  /** Rule options. */
  options?: unknown[];
  /** Build a TypeScript program for type information (default true). */
  types?: boolean;
  /** Offer a corpus run with a ruling diff against content/corpus/expected/<KEY>.json. */
  corpus?: boolean;
  /** A playground: no solved state, no hidden checks. */
  playground?: boolean;
  /** Inspector tabs to offer next to the fixture (default: all). */
  inspector?: ('tree' | 'scopes' | 'types' | 'paths')[] | false;
  /** Rule variants (for `fixtures` exercises: the reader writes fixtures that must reject each one). */
  mutants?: Record<string, string>;
  /** Fixtures that catch every mutant (the reference for `fixtures` exercises). */
  answerFixtures?: Record<string, string>;
}

export function keyOf(spec: WorkbenchSpec): string {
  return spec.key ?? 'R';
}

export function ruleDir(spec: WorkbenchSpec): string {
  return `/rules/${keyOf(spec)}`;
}

/** Absolute path of a reader file from its short name. */
export function filePath(spec: WorkbenchSpec, name: string): string {
  if (name.startsWith('/')) return name;
  if (name.startsWith('helpers/')) return `/rules/${name}`;
  return `${ruleDir(spec)}/${name}`;
}

export function entryPath(spec: WorkbenchSpec): string {
  return filePath(spec, spec.entry ?? 'rule.ts');
}

export function testPath(name: string): string {
  return `/test/${name}`;
}

/** The reader's files as absolute paths. */
export function absoluteFiles(spec: WorkbenchSpec, files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(files).map(([k, v]) => [filePath(spec, k), v]));
}

/** A URI-safe version of an exercise id, for the language server's per-exercise directory. */
export function exerciseSlug(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]+/g, '-');
}

export function languageOf(name: string): 'ts' | 'js' | 'json' {
  return name.endsWith('.json') ? 'json' : /\.(m|c)?jsx?$/.test(name) ? 'js' : 'ts';
}

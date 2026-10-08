/**
 * Runs rules on files with the real ESLint `Linter` and typescript-eslint, as SonarJS does: rules are registered
 * under `sonarjs/<key>`, `settings.sonarRuntime` is true, and issues are decoded from the JSON the kit's `report`
 * encodes. Columns in the result are 0-based (as in SonarQube), lines 1-based.
 */
import { Linter } from 'eslint/universal';
import type { Rule } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import type ts from 'typescript';
import { createInMemoryProgram } from './program.js';
import { decodeMessage, type IssueLocation } from '../kit/location.js';

export interface Fix {
  range: [number, number];
  text: string;
}

export interface Issue {
  file: string;
  ruleId: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  secondaryLocations: IssueLocation[];
  cost?: number;
  fix?: Fix;
  suggestions?: { desc: string; fix: Fix }[];
  /** The message as ESLint produced it, before the analyser decodes it (for the `sonarRuntime` encoding). */
  raw?: { messageId?: string; message: string };
}

export interface ParseError {
  file: string;
  line: number;
  column: number;
  message: string;
}

export interface LintRequest {
  /** Absolute file names to contents. Declaration files (`.d.ts`) are part of the program but not linted. */
  files: Record<string, string>;
  /** Rule key (e.g. 'S1764') → rule. */
  rules: Record<string, Rule.RuleModule>;
  /** Rule key → options array. */
  options?: Record<string, unknown[]>;
  /** Files to lint (default: every non-declaration file). */
  targets?: string[];
  /** Build a TypeScript program so rules get type information (default true). */
  types?: boolean;
  libs: Map<string, string>;
  /** Extra listener: called with each file's SourceCode after linting (for the inspector). */
  settings?: Record<string, unknown>;
}

export interface LintResult {
  issues: Issue[];
  parseErrors: ParseError[];
  /** Exceptions thrown by rules, per file. */
  ruleErrors: { file: string; message: string }[];
  program?: ts.Program;
}

const LINTABLE = /\.(m|c)?(t|j)sx?$/;

export function isLintable(file: string): boolean {
  return LINTABLE.test(file) && !file.endsWith('.d.ts');
}

function toFix(f: Rule.Fix | undefined): Fix | undefined {
  return f ? { range: [f.range[0], f.range[1]], text: f.text } : undefined;
}

export function lint(req: LintRequest): LintResult {
  const program = req.types === false ? undefined : createInMemoryProgram({ files: req.files, libs: req.libs });
  const linter = new Linter({ configType: 'flat', cwd: '/' });
  const plugin = { rules: req.rules };
  const rules: Linter.RulesRecord = {};
  for (const key of Object.keys(req.rules)) rules[`sonarjs/${key}`] = ['error', ...(req.options?.[key] ?? [])] as Linter.RuleEntry;
  const config: Linter.Config[] = [
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
      languageOptions: {
        parser: tsParser as unknown as Linter.Parser,
        sourceType: 'module',
        parserOptions: { ...(program ? { programs: [program] } : {}), ecmaFeatures: { jsx: true } },
      },
      plugins: { sonarjs: plugin },
      settings: { sonarRuntime: true, ...req.settings },
      rules,
    },
  ];
  const result: LintResult = { issues: [], parseErrors: [], ruleErrors: [], program };
  const targets = req.targets ?? Object.keys(req.files).filter(isLintable);
  for (const file of targets) {
    const text = req.files[file] ?? '';
    let messages: Linter.LintMessage[];
    try {
      messages = linter.verify(text, config, file);
    } catch (e) {
      result.ruleErrors.push({ file, message: e instanceof Error ? e.message : String(e) });
      continue;
    }
    for (const m of messages) {
      if (m.fatal || !m.ruleId) {
        result.parseErrors.push({ file, line: m.line, column: m.column - 1, message: m.message });
        continue;
      }
      let message = m.message;
      let secondaryLocations: IssueLocation[] = [];
      let cost: number | undefined;
      if (m.messageId === 'sonarRuntime') {
        const decoded = decodeMessage(m.message);
        message = decoded.message;
        secondaryLocations = decoded.secondaryLocations;
        cost = decoded.cost;
      }
      result.issues.push({
        file,
        ruleId: m.ruleId.replace(/^sonarjs\//, ''),
        line: m.line,
        column: m.column - 1,
        endLine: m.endLine ?? m.line,
        endColumn: (m.endColumn ?? m.column) - 1,
        message,
        secondaryLocations,
        cost,
        fix: toFix(m.fix),
        raw: m.messageId === 'sonarRuntime' ? { messageId: m.messageId, message: m.message } : undefined,
        suggestions: m.suggestions?.map((s) => ({ desc: s.desc, fix: toFix(s.fix)! })),
      });
    }
  }
  return result;
}

/** Applies one fix to a text. */
export function applyFix(text: string, fix: Fix): string {
  return text.slice(0, fix.range[0]) + fix.text + text.slice(fix.range[1]);
}

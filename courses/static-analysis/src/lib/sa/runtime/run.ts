/**
 * Runs a rule exercise: loads the reader's rule from its files, lints every fixture, and checks the issues
 * against the fixtures' comment-based expectations.
 */
import type { Rule } from 'eslint';
import { lint, type Issue, type ParseError } from './lint.js';
import { loadModule, LoadError } from './loader.js';
import { checkFixture, type CheckResult } from './comment-based.js';

export interface RuleRunRequest {
  /** The reader's files (rule, meta, own helpers), e.g. `/rules/S1764/rule.ts`. */
  ruleFiles: Record<string, string>;
  /** The file exporting `rule`. */
  entry: string;
  ruleKey: string;
  /** Fixture name (e.g. `cb.fixture.ts`) → source. */
  fixtures: Record<string, string>;
  options?: unknown[];
  /** Other files the fixtures import (part of the program, not linted). */
  extraFiles?: Record<string, string>;
  types?: boolean;
  libs: Map<string, string>;
}

export interface FixtureReport {
  name: string;
  file: string;
  check: CheckResult;
  issues: Issue[];
  parseErrors: ParseError[];
}

export interface RuleRunResult {
  pass: boolean;
  loadError?: string;
  ruleErrors: { file: string; message: string }[];
  fixtures: FixtureReport[];
}

export function fixturePath(name: string): string {
  return `/fixtures/${name}`;
}

export function loadRule(files: Record<string, string>, entry: string): Rule.RuleModule {
  const exports = loadModule(files, entry);
  const rule = (exports.rule ?? exports.default) as Rule.RuleModule | undefined;
  if (!rule || typeof rule.create !== 'function') throw new LoadError(`${entry} must export a rule: \`export const rule: Rule.RuleModule = { meta, create }\``, entry);
  return rule;
}

export function runRule(req: RuleRunRequest): RuleRunResult {
  let rule: Rule.RuleModule;
  try {
    rule = loadRule(req.ruleFiles, req.entry);
  } catch (e) {
    return { pass: false, loadError: e instanceof Error ? e.message : String(e), ruleErrors: [], fixtures: [] };
  }
  const files: Record<string, string> = { ...req.extraFiles };
  for (const [name, src] of Object.entries(req.fixtures)) files[fixturePath(name)] = src;
  const result = lint({
    files,
    rules: { [req.ruleKey]: rule },
    options: req.options ? { [req.ruleKey]: req.options } : undefined,
    targets: Object.keys(req.fixtures).map(fixturePath),
    types: req.types,
    libs: req.libs,
  });
  const fixtures: FixtureReport[] = Object.entries(req.fixtures).map(([name, src]) => {
    const file = fixturePath(name);
    const issues = result.issues.filter((i) => i.file === file);
    const parseErrors = result.parseErrors.filter((p) => p.file === file);
    const check = checkFixture(src, issues);
    if (parseErrors.length) {
      check.pass = false;
      check.errors.push(...parseErrors.map((p) => `parse error at ${p.line}:${p.column}: ${p.message}`));
    }
    return { name, file, check, issues, parseErrors };
  });
  return { pass: result.ruleErrors.length === 0 && fixtures.every((f) => f.check.pass), ruleErrors: result.ruleErrors, fixtures };
}

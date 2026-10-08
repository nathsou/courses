/** Declarations of the `workbench:test` module that helper exercises' test files import (for the editor). */
export const WORKBENCH_TEST_FILE = '/workbench-test.d.ts';
export const WORKBENCH_TEST_DTS = `
declare module 'workbench:test' {
  import type { Rule } from 'eslint';
  /** Registers a test. */
  export function test(name: string, fn: () => void): void;
  export function expect(actual: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toContain(item: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeUndefined(): void;
    toHaveLength(n: number): void;
    toThrow(): void;
  };
  export interface Issue { line: number; column: number; endLine: number; endColumn: number; message: string; secondaryLocations: { line: number; column: number; endLine: number; endColumn: number; message?: string }[] }
  /** Runs the rule on the code with the real Linter and returns its issues (0-based columns). */
  export function lintCode(code: string, rule: Rule.RuleModule, options?: unknown[], types?: boolean): Issue[];
}
`;

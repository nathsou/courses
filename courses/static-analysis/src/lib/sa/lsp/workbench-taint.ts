/** Declarations of the `workbench:taint` module that taint rules import (for the editor). */
export const WORKBENCH_TAINT_FILE = '/workbench-taint.d.ts';
export const WORKBENCH_TAINT_DTS = `
declare module 'workbench:taint' {
  import type estree from 'estree';
  import type { SourceCode } from 'eslint';

  export interface TaintContext {
    /** Is this identifier the request parameter of a route handler (\`app.get(path, (req, res) => …)\`)? */
    isRequest(id: estree.Node): boolean;
    /** Is this identifier the response parameter of a route handler? */
    isResponse(id: estree.Node): boolean;
  }

  export interface TaintConfig {
    /** Does this expression produce untrusted data by itself? */
    isSource(node: estree.Node, ctx: TaintContext): boolean;
    /** For a call: the indices of the arguments that must not be tainted (none if the call is not a sink). */
    sinkArguments(call: estree.CallExpression, ctx: TaintContext): number[];
    /** Does this call return a value that is safe for the sink, whatever its arguments? */
    isSanitizer?(call: estree.CallExpression, ctx: TaintContext): boolean;
    /** The variables a condition proves safe on the branch where it evaluates to \`outcome\`. */
    validates?(test: estree.Node, outcome: boolean, ctx: TaintContext): string[];
  }

  export interface FlowStep {
    fn: string;
    text: string;
    line: number;
    range?: [number, number];
    fact: string;
    kind: 'start' | 'normal' | 'call' | 'return' | 'call-to-return';
  }

  /**
   * The flows from sources to sinks in the file being linted, found by the IFDS analysis of chapter 26 over the
   * file's top-level functions and route handlers. Each flow names the sink call and its tainted argument, as
   * nodes of the tree the rule sees, and the steps from the source to the sink.
   */
  export function findTaintFlows(sourceCode: SourceCode, config: TaintConfig): { call: estree.CallExpression; argument: estree.Node; steps: FlowStep[] }[];

  /** \`req.query\`, \`req.params\`, \`req.body\`, \`req.headers\`, \`req.cookies\`… and \`req.get(name)\`. */
  export function isRequestSource(node: estree.Node, ctx: TaintContext): boolean;

  /** Allowlist checks: \`ALLOWED.has(x)\`, \`list.includes(x)\`, \`/^…$/.test(x)\`, \`Number.isInteger(x)\`, \`validator.isUUID(x)\`. */
  export function allowlistValidates(test: estree.Node, outcome: boolean): string[];
}
`;

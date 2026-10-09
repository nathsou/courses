/**
 * Regular expressions as trees. Counterpart of SonarJS's `rules/helpers/regex/` (`rule-template.ts`,
 * `extract.ts`), built on the same parser, `@eslint-community/regexpp`.
 *
 * `createRegExpRule` turns a set of regexpp visitor handlers into an ESLint rule that applies them to every
 * regular-expression literal and every `new RegExp('…')` / `RegExp('…')` call with a constant pattern.
 */
import type { Rule } from 'eslint';
import type estree from 'estree';
import { RegExpParser, visitRegExpAST, type AST } from '@eslint-community/regexpp';
import type { RegExpVisitor } from '@eslint-community/regexpp/visitor';
import { getConstantValue } from './ast.js';

export interface RegexRuleContext extends Rule.RuleContext {
  /** The regex literal, or the pattern argument of a `RegExp` call. */
  node: estree.Node;
  /** The flags of the regular expression. */
  flags: string;
  /**
   * Reports on a part of the regular expression. The issue is placed on that part of the pattern when the source
   * spells the pattern as it is (a regex literal, or a string without escapes), and on the whole node otherwise.
   */
  reportRegExpNode(descriptor: RegexReportDescriptor): void;
}

export type RegexReportDescriptor = { regexpNode: AST.Node; node?: estree.Node } & (
  | { message: string; data?: Record<string, string> }
  | { messageId: string; data?: Record<string, string> }
) &
  Pick<Rule.ReportDescriptorOptions, 'suggest' | 'fix'>;

/** Where `regexpNode` is in the source, if the source spells the pattern verbatim. */
export function getRegexpRange(node: estree.Node, regexpNode: AST.Node): [number, number] | undefined {
  const range = (node as estree.Node & { range?: [number, number] }).range;
  if (!range) return undefined;
  // regexpp's offsets are relative to `/pattern/flags`, where the pattern starts at 1.
  if (node.type === 'Literal' && 'regex' in node && node.regex) return [range[0] + regexpNode.start, range[0] + regexpNode.end];
  if (node.type === 'Literal' && typeof node.value === 'string' && node.raw?.slice(1, -1) === node.value) {
    return [range[0] + regexpNode.start, range[0] + regexpNode.end];
  }
  return undefined;
}

/** Parses a regular expression; undefined if regexpp rejects it. */
export function getParsedRegex(pattern: string, flags = ''): AST.RegExpLiteral | undefined {
  try {
    return new RegExpParser({ ecmaVersion: 2022 }).parseLiteral(`/${pattern}/${flags}`);
  } catch {
    return undefined;
  }
}

export function createRegExpRule(handlers: (context: RegexRuleContext) => RegExpVisitor.Handlers, meta: Rule.RuleMetaData = {}): Rule.RuleModule {
  return {
    meta,
    create(context) {
      function check(node: estree.Node, pattern: string, flags: string) {
        const ast = getParsedRegex(pattern, flags);
        if (!ast) return;
        const reportRegExpNode = ({ regexpNode, node: _node, ...rest }: RegexReportDescriptor) => {
          const r = getRegexpRange(node, regexpNode);
          const loc = r ? { start: context.sourceCode.getLocFromIndex(r[0]), end: context.sourceCode.getLocFromIndex(r[1]) } : node.loc!;
          context.report({ ...rest, loc } as Rule.ReportDescriptor);
        };
        const regexContext = Object.create(context, {
          node: { value: node },
          flags: { value: flags },
          reportRegExpNode: { value: reportRegExpNode },
        }) as RegexRuleContext;
        visitRegExpAST(ast, handlers(regexContext));
      }
      return {
        Literal(node: estree.Literal) {
          if ('regex' in node && node.regex) check(node, node.regex.pattern, node.regex.flags);
        },
        'CallExpression, NewExpression'(node: estree.CallExpression | estree.NewExpression) {
          if (node.callee.type !== 'Identifier' || node.callee.name !== 'RegExp') return;
          const pattern = getConstantValue(context, node.arguments[0] as estree.Node | undefined);
          const flags = node.arguments[1] ? getConstantValue(context, node.arguments[1] as estree.Node) : '';
          if (typeof pattern === 'string' && typeof (flags ?? '') === 'string') check(node.arguments[0] as estree.Node, pattern, String(flags ?? ''));
        },
      } as Rule.RuleListener;
    },
  };
}

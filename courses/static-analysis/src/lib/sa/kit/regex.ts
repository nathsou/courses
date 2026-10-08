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
  /** The literal or call being analysed. */
  node: estree.Node;
  /** The flags of the regular expression. */
  flags: string;
  /** Reports on a part of the regular expression (the issue is placed on the whole literal or call). */
  reportRegExpNode(descriptor: { regexpNode: AST.Node; message: string }): void;
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
        const regexContext = Object.create(context, {
          node: { value: node },
          flags: { value: flags },
          reportRegExpNode: { value: ({ message }: { regexpNode: AST.Node; message: string }) => context.report({ node, message }) },
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
          if (typeof pattern === 'string' && typeof (flags ?? '') === 'string') check(node, pattern, String(flags ?? ''));
        },
      } as Rule.RuleListener;
    },
  };
}

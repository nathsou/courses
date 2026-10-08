/**
 * Reports the fully qualified name of every call and `new` (except calls of `require` itself), on its callee. Used by
 * the FQN view (chapter 8).
 */
import type { Rule } from 'eslint';
import type estree from 'estree';
import { getFullyQualifiedName } from '../helpers/module.js';

export const rule: Rule.RuleModule = {
  create(context) {
    return {
      'CallExpression, NewExpression'(node: estree.CallExpression | estree.NewExpression) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') return;
        context.report({ node: node.callee, message: String(getFullyQualifiedName(context, node)) });
      },
    };
  },
};

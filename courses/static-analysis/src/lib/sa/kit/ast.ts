/**
 * AST predicates and scope helpers.
 *
 * The course's counterpart of SonarJS's `rules/helpers/ast.ts`: same names and shapes, our own code. The value
 * helpers follow a variable to the single place it is written ("single write" tracking), the cheapest dataflow
 * analysis there is (chapter 7).
 */
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';

export type Node = estree.Node;

/** Is `node` an identifier, optionally with one of the given names? */
export function isIdentifier(node: Node | undefined | null, ...values: string[]): node is estree.Identifier {
  return node?.type === 'Identifier' && (values.length === 0 || values.includes(node.name));
}

/** Is `node` a member expression `object.property` with a (non-computed) property name among `names`? */
export function isMemberWithProperty(node: Node | undefined | null, ...names: string[]): node is estree.MemberExpression {
  return node?.type === 'MemberExpression' && !node.computed && isIdentifier(node.property, ...names);
}

/** Is `node` a call of a method `receiver.name(…)`? */
export function isMethodCall(node: Node | undefined | null): node is estree.CallExpression & { callee: estree.MemberExpression } {
  return node?.type === 'CallExpression' && node.callee.type === 'MemberExpression' && !node.callee.computed && node.callee.property.type === 'Identifier';
}

/** Is `call` a call `receiver.name(…)` with `name` among `methodNames` and exactly `arity` arguments? */
export function isCallingMethod(call: Node | undefined | null, arity: number, ...methodNames: string[]): call is estree.CallExpression & { callee: estree.MemberExpression & { property: estree.Identifier } } {
  return isMethodCall(call) && call.arguments.length === arity && isIdentifier(call.callee.property, ...methodNames);
}

const FUNCTION_NODES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

export type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;

export function isFunctionNode(node: Node | undefined | null): node is FunctionNode {
  return node !== undefined && node !== null && FUNCTION_NODES.has(node.type);
}

export function isLiteral(node: Node | undefined | null): node is estree.Literal {
  return node?.type === 'Literal';
}

export function isStringLiteral(node: Node | undefined | null): node is estree.Literal & { value: string } {
  return isLiteral(node) && typeof node.value === 'string';
}

export function isNumberLiteral(node: Node | undefined | null): node is estree.Literal & { value: number } {
  return isLiteral(node) && typeof node.value === 'number';
}

export function isNullLiteral(node: Node | undefined | null): boolean {
  return isLiteral(node) && node.value === null && !('regex' in node);
}

export function isUndefined(node: Node | undefined | null): boolean {
  return isIdentifier(node, 'undefined');
}

/** Strips TypeScript-only wrappers: `x as T`, `x!`, `<T>x`, `x satisfies T`. */
export function unwrapTypeScriptExpression(node: Node): Node {
  let n = node as Node & { type: string; expression?: Node };
  while (['TSAsExpression', 'TSNonNullExpression', 'TSTypeAssertion', 'TSSatisfiesExpression'].includes(n.type) && n.expression) {
    n = n.expression as typeof n;
  }
  return n;
}

/** The variable called `name` that is visible from `node`, searching outwards through the scopes. */
export function getVariableFromName(context: Rule.RuleContext, name: string, node: Node): Scope.Variable | undefined {
  let scope: Scope.Scope | null = context.sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return undefined;
}

/** Same as {@link getVariableFromName}, starting from a given scope. */
export function getVariableFromScope(scope: Scope.Scope | null, name: string): Scope.Variable | undefined {
  while (scope) {
    const variable = scope.set.get(name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return undefined;
}

/**
 * The expression written to `variable` if it is written exactly once, otherwise undefined. "Written" includes the
 * initialiser of its declaration. The expression is eslint-scope's `writeExpr`: for a destructuring declaration
 * such as `const { url } = req.body`, that is the whole right-hand side, `req.body`, not the property.
 */
export function getUniqueWriteReference(variable: Scope.Variable | undefined): Node | undefined {
  if (!variable) return undefined;
  const writes = variable.references.filter((r) => r.isWrite());
  return writes.length === 1 && writes[0]!.writeExpr ? (writes[0]!.writeExpr as Node) : undefined;
}

/** The expression written to the variable `name` visible from `node`, if it is written exactly once. */
export function getUniqueWriteUsage(context: Rule.RuleContext, name: string, node: Node): Node | undefined {
  return getUniqueWriteReference(getVariableFromName(context, name, node));
}

/** If `node` is an identifier written exactly once, the expression written to it; otherwise `node` itself. */
export function getUniqueWriteUsageOrNode(context: Rule.RuleContext, node: Node, recursive = false): Node {
  let current = node;
  const seen = new Set<Node>();
  while (current.type === 'Identifier' && !seen.has(current)) {
    seen.add(current);
    const value = getUniqueWriteUsage(context, current.name, current);
    if (!value) break;
    current = value;
    if (!recursive) break;
  }
  return current;
}

/**
 * The value of `node` if it is, or (through single writes) resolves to, a node of the given type.
 * `getValueOfExpression(context, id, 'ObjectExpression')` answers "is `id` an object literal, and which one?".
 */
export function getValueOfExpression<T extends Node['type']>(context: Rule.RuleContext, node: Node | undefined | null, type: T, recursive = false): Extract<Node, { type: T }> | undefined {
  if (!node) return undefined;
  const value = node.type === 'Identifier' ? getUniqueWriteUsageOrNode(context, node, recursive) : node;
  return value.type === type ? (value as Extract<Node, { type: T }>) : undefined;
}

/**
 * The property `key` of an object literal, looking through spread elements whose argument resolves (through single
 * writes) to another object literal. The last definition wins, as at run time.
 *
 * Three answers: the `Property` when it is found; `null` when `expr` is not an object literal, or when it certainly
 * has no such property; `undefined` when it cannot tell, because a spread element could not be resolved.
 */
export function getProperty(expr: Node | undefined | null, key: string, context: Rule.RuleContext, seen = new Set<Node>()): estree.Property | null | undefined {
  if (expr?.type !== 'ObjectExpression') return null;
  let unresolvedSpread = false;
  for (let i = expr.properties.length - 1; i >= 0; i--) {
    const p = expr.properties[i]!;
    if (p.type === 'Property' && !p.computed && (isIdentifier(p.key, key) || (isStringLiteral(p.key) && p.key.value === key))) return p;
    if (p.type === 'SpreadElement') {
      const spread = getValueOfExpression(context, p.argument, 'ObjectExpression');
      if (!spread || seen.has(spread) || spread === expr) {
        unresolvedSpread = true;
        continue;
      }
      seen.add(spread);
      const found = getProperty(spread, key, context, seen);
      seen.delete(spread);
      if (found === undefined) unresolvedSpread = true;
      else if (found !== null) return found;
    }
  }
  return unresolvedSpread ? undefined : null;
}

/** The property `key` of an object literal if its value is (through single writes) the literal `value`. */
export function getPropertyWithValue(context: Rule.RuleContext, objectExpression: estree.ObjectExpression, key: string, value: estree.Literal['value']): estree.Property | undefined {
  const property = getProperty(objectExpression, key, context);
  if (!property) return undefined;
  const literal = getValueOfExpression(context, property.value as Node, 'Literal');
  return literal?.value === value ? property : undefined;
}

/** The static string of a literal or of a template literal without expressions; undefined when dynamic. */
export function getStaticExpressionValue(expression: Node): string | undefined {
  if (expression.type === 'Literal' && !('regex' in expression)) {
    const { value } = expression;
    if (typeof value === 'string') return value;
    return typeof value === 'number' || typeof value === 'bigint' ? String(value) : '';
  }
  if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) return expression.quasis[0]?.value.cooked ?? undefined;
  return undefined;
}

/**
 * Course helper (not in SonarJS): the value of a constant expression, following single writes. Literals,
 * template literals without expressions, and identifiers written once with such a value; undefined otherwise.
 */
export function getConstantValue(context: Rule.RuleContext, node: Node | undefined | null): string | number | boolean | null | undefined {
  if (!node) return undefined;
  const n = unwrapTypeScriptExpression(node);
  if (n.type === 'Literal' && !('regex' in n)) return n.value as string | number | boolean | null;
  if (n.type === 'TemplateLiteral' && n.expressions.length === 0) return n.quasis[0]?.value.cooked ?? undefined;
  if (n.type === 'Identifier') {
    const value = getUniqueWriteUsage(context, n.name, n);
    return value && value !== n ? getConstantValue(context, value) : undefined;
  }
  return undefined;
}

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

/**
 * Is `call` a call `receiver.name(…)` where `receiver` is the identifier `objectName` (any receiver if
 * `objectName` is undefined), `name` is one of `methodNames`, and the call has exactly `arity` arguments?
 */
export function isCallingMethod(call: Node | undefined | null, arity: number, objectName: string | undefined, ...methodNames: string[]): call is estree.CallExpression {
  if (!isMethodCall(call) || call.arguments.length !== arity) return false;
  const { object, property } = call.callee;
  return (objectName === undefined || isIdentifier(object, objectName)) && isIdentifier(property, ...methodNames);
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
 * The expression written to the variable `name` if it is written exactly once, otherwise undefined.
 *
 * "Written" includes the initialiser of its declaration. Parameters are never considered (their value comes from
 * every caller), and neither are variables written in a loop header or by destructuring.
 */
export function getUniqueWriteUsage(context: Rule.RuleContext, name: string, node: Node): Node | undefined {
  const variable = getVariableFromName(context, name, node);
  if (!variable) return undefined;
  if (variable.defs.some((d) => d.type === 'Parameter' || d.type === 'ImportBinding' || d.type === 'FunctionName' || d.type === 'ClassName')) return undefined;
  const writes = variable.references.filter((r) => r.isWrite());
  if (writes.length !== 1) return undefined;
  const write = writes[0]!;
  const parent = (write.identifier as Node & { parent?: Node }).parent;
  if (parent?.type === 'VariableDeclarator' && parent.id === write.identifier && parent.init) return parent.init;
  if (parent?.type === 'AssignmentExpression' && parent.operator === '=' && parent.left === write.identifier) return parent.right;
  return undefined;
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

/** The property `key` of an object literal (only plain `key: value` properties, not spreads or computed keys). */
export function getProperty(object: estree.ObjectExpression, key: string): estree.Property | undefined {
  for (const p of object.properties) {
    if (p.type !== 'Property' || p.computed) continue;
    if ((p.key.type === 'Identifier' && p.key.name === key) || (p.key.type === 'Literal' && p.key.value === key)) return p;
  }
  return undefined;
}

/**
 * The value of a constant expression, when it can be computed without running the program: literals, template
 * literals without expressions, and identifiers written once with such a value. Undefined otherwise.
 */
export function getStaticExpressionValue(context: Rule.RuleContext, node: Node | undefined | null): string | number | boolean | null | undefined {
  if (!node) return undefined;
  const n = unwrapTypeScriptExpression(node);
  if (n.type === 'Literal' && !('regex' in n)) return n.value as string | number | boolean | null;
  if (n.type === 'TemplateLiteral' && n.expressions.length === 0) return n.quasis[0]?.value.cooked ?? undefined;
  if (n.type === 'Identifier') {
    const value = getUniqueWriteUsage(context, n.name, n);
    return value && value !== n ? getStaticExpressionValue(context, value) : undefined;
  }
  return undefined;
}

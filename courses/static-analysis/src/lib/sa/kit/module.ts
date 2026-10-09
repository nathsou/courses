/**
 * Modules and fully qualified names. Counterpart of SonarJS's `rules/helpers/module.ts`.
 *
 * A fully qualified name (FQN) says where a value comes from, independently of what the file calls it. Rules match
 * FQNs instead of spellings, so renaming an import does not hide an issue (chapter 8).
 */
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { getUniqueWriteReference, getVariableFromScope } from './ast.js';

type Node = estree.Node;

/** The module name of `require('name')`, or undefined if `node` is not such a call. */
export function getModuleNameFromRequire(node: Node): string | undefined {
  if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier' || node.callee.name !== 'require') return undefined;
  const arg = node.arguments[0];
  return node.arguments.length === 1 && arg?.type === 'Literal' && typeof arg.value === 'string' ? arg.value : undefined;
}

/** `node:fs` and `fs` name the same module. */
export function removeNodePrefix(name: string): string {
  return name.startsWith('node:') ? name.slice(5) : name;
}

/** The name of a member access: `a.b` → 'b', `a['b']` → 'b'; undefined for a computed, non-constant key. */
function propertyName(member: estree.MemberExpression): string | undefined {
  if (!member.computed && member.property.type === 'Identifier') return member.property.name;
  if (member.computed && member.property.type === 'Literal' && typeof member.property.value === 'string') return member.property.value;
  return undefined;
}

/** Marks a member access with a computed, non-constant key: no FQN goes through it. */
const UNKNOWN_PROPERTY = { type: 'UnknownProperty' } as unknown as Node;

/**
 * Peels member accesses, calls (other than `require`), `new`, tagged templates, optional chains and TypeScript
 * wrappers off `node`, prepending the property names to `fqn`. `a.b.c()` → identifier `a`, with `fqn` ['b', 'c'].
 * Stops at an identifier, at a `require('…')` call, or at anything else it cannot see through.
 */
export function reduceToIdentifier(node: Node, fqn: string[] = []): Node {
  let n = node;
  for (;;) {
    const type = n.type as string;
    if (n.type === 'MemberExpression') {
      const name = propertyName(n);
      if (name === undefined) return UNKNOWN_PROPERTY;
      fqn.unshift(name);
      n = n.object as Node;
    } else if (n.type === 'CallExpression' && getModuleNameFromRequire(n) === undefined) n = n.callee as Node;
    else if (n.type === 'NewExpression') n = n.callee as Node;
    else if (n.type === 'TaggedTemplateExpression') n = n.tag;
    else if (n.type === 'ChainExpression') n = n.expression;
    else if (type === 'TSNonNullExpression' || type === 'TSAsExpression' || type === 'TSSatisfiesExpression') n = (n as unknown as { expression: Node }).expression;
    else return n;
  }
}

/**
 * The fully qualified name of `node`: the module it comes from, followed by the properties accessed on it,
 * whatever the file calls it locally. Null when it cannot be determined. The `node:` prefix is removed.
 *
 *     import { exec as run } from 'child_process';    run('ls')            → 'child_process.exec'
 *     const cp = require('node:child_process');        cp.exec('ls')        → 'child_process.exec'
 *     const { Bucket } = require('aws-cdk-lib/aws-s3'); new Bucket(…)       → 'aws-cdk-lib.aws-s3.Bucket'
 *     Math.random()                                                          → 'Math.random'
 *
 * @param fqn qualifiers already collected (for recursive calls)
 * @param scope the scope to look names up from (defaults to the scope of `node`)
 */
export function getFullyQualifiedName(context: Rule.RuleContext, node: Node, fqn: string[] = [], scope?: Scope.Scope): string | null {
  const name = resolve(context, node, [...fqn], scope ?? context.sourceCode.getScope(node), []);
  return name === null ? null : removeNodePrefix(name);
}

function resolve(context: Rule.RuleContext, node: Node, fqn: string[], scope: Scope.Scope, visited: Scope.Variable[]): string | null {
  const base = reduceToIdentifier(node, fqn);
  const module = getModuleNameFromRequire(base);
  if (module !== undefined) return [...module.split('/'), ...fqn].join('.');
  if (base.type !== 'Identifier') return null;
  const variable = getVariableFromScope(scope, base.name);
  // Not declared by the file: a global such as Math or JSON. (SonarJS asks ESLint whether the name is a declared
  // global of the project's environments; the kit takes any undeclared name to be one.)
  if (!variable || variable.defs.length === 0) return [base.name, ...fqn].join('.');
  if (variable.defs.length > 1 || visited.includes(variable)) return null;
  const def = variable.defs[0]!;
  if (def.type === 'ImportBinding') return fromImport(def, fqn);
  if (def.type === 'Variable') return fromVariable(context, variable, def, fqn, visited);
  return null;
}

function fromImport(def: Scope.Definition, fqn: string[]): string | null {
  const declaration = def.parent as unknown as { type: string; importKind?: string; source?: estree.Literal; moduleReference?: { type: string; expression?: estree.Literal } };
  const specifier = def.node as unknown as { type: string; importKind?: string; imported?: estree.Identifier | estree.Literal };
  if (declaration.importKind === 'type' || specifier.importKind === 'type') return null;
  let source: unknown;
  if (declaration.type === 'ImportDeclaration') source = declaration.source?.value;
  // TypeScript's `import cp = require('child_process')`.
  else if (declaration.type === 'TSImportEqualsDeclaration' && declaration.moduleReference?.type === 'TSExternalModuleReference') source = declaration.moduleReference.expression?.value;
  if (typeof source !== 'string') return null;
  if (specifier.type === 'ImportSpecifier' && specifier.imported) {
    const imported = specifier.imported.type === 'Identifier' ? specifier.imported.name : String(specifier.imported.value);
    if (imported !== 'default') fqn.unshift(imported);
  }
  return [...source.split('/'), ...fqn].join('.');
}

function fromVariable(context: Rule.RuleContext, variable: Scope.Variable, def: Scope.Definition, fqn: string[], visited: Scope.Variable[]): string | null {
  const value = getUniqueWriteReference(variable);
  if (!value) return null;
  const declarator = def.node as estree.VariableDeclarator;
  if (declarator.id.type === 'ObjectPattern') {
    // const { exec } = require('child_process');   const { exec: run } = cp;
    const property = declarator.id.properties.find((p) => p.type === 'Property' && p.value === (def.name as Node));
    if (property?.type !== 'Property' || property.computed || property.key.type !== 'Identifier') return null;
    fqn.unshift(property.key.name);
  } else if (declarator.id.type !== 'Identifier') return null;
  visited.push(variable);
  return resolve(context, value, fqn, variable.scope, visited);
}

/** The import declarations of the file. */
export function getImportDeclarations(context: Rule.RuleContext): estree.ImportDeclaration[] {
  return context.sourceCode.ast.body.filter((s): s is estree.ImportDeclaration => s.type === 'ImportDeclaration');
}

/** Every `require('…')` call of the file, wherever it is. */
export function getRequireCalls(context: Rule.RuleContext): estree.CallExpression[] {
  const out: estree.CallExpression[] = [];
  const keys = context.sourceCode.visitorKeys;
  const walk = (node: Node) => {
    if (getModuleNameFromRequire(node) !== undefined) out.push(node as estree.CallExpression);
    for (const key of keys[node.type] ?? []) {
      const child = (node as unknown as Record<string, unknown>)[key];
      for (const c of Array.isArray(child) ? child : [child]) if (c && typeof (c as Node).type === 'string') walk(c as Node);
    }
  };
  walk(context.sourceCode.ast as Node);
  return out;
}

/** The modules the file imports, with `import`, `import()` or `require`, without the `node:` prefix. */
export function getCurrentFileImports(context: Rule.RuleContext): Set<string> {
  const names = new Set<string>();
  for (const d of getImportDeclarations(context)) names.add(removeNodePrefix(String(d.source.value)));
  for (const c of getRequireCalls(context)) names.add(removeNodePrefix(getModuleNameFromRequire(c)!));
  return names;
}

/** Does the file import or require one of `moduleNames`? */
export function importsModule(context: Rule.RuleContext, moduleNames: string[]): boolean {
  const imports = getCurrentFileImports(context);
  return moduleNames.some((name) => imports.has(name));
}

/**
 * Modules and fully qualified names. Counterpart of SonarJS's `rules/helpers/module.ts`.
 *
 * A fully qualified name (FQN) says where a value comes from, independently of what the file calls it:
 *
 *     import { exec as run } from 'child_process';   run('ls')          → 'child_process.exec'
 *     const cp = require('node:child_process');       cp.exec('ls')      → 'child_process.exec'
 *     const { createHash } = require('crypto');       createHash('md5')  → 'crypto.createHash'
 *     Math.random()                                                       → 'Math.random'
 *
 * Rules match FQNs instead of spellings, so renaming an import does not hide an issue (chapter 8).
 */
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { getVariableFromScope } from './ast.js';

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

function propertyName(member: estree.MemberExpression): string | undefined {
  if (!member.computed && member.property.type === 'Identifier') return member.property.name;
  if (member.computed && member.property.type === 'Literal' && typeof member.property.value === 'string') return member.property.value;
  return undefined;
}

/** The fully qualified name of `node`, or null when it cannot be determined. */
export function getFullyQualifiedName(context: Rule.RuleContext, node: Node, scope?: Scope.Scope): string | null {
  const name = fqn(context, node, [], scope ?? context.sourceCode.getScope(node), new Set());
  return name === null ? null : removeNodePrefix(name);
}

function fqn(context: Rule.RuleContext, node: Node, rest: string[], scope: Scope.Scope, seen: Set<Scope.Variable>): string | null {
  let n: Node = node;
  const parts = [...rest];
  // Peel calls and member accesses: `a.b.c()` → identifier `a` with parts ['b', 'c'].
  for (;;) {
    if (n.type === 'CallExpression') {
      const module = getModuleNameFromRequire(n);
      if (module !== undefined) return [module, ...parts].join('.');
      n = n.callee as Node;
    } else if (n.type === 'MemberExpression') {
      const p = propertyName(n);
      if (p === undefined) return null;
      parts.unshift(p);
      n = n.object as Node;
    } else if ((n as { type: string }).type === 'TSNonNullExpression' || (n as { type: string }).type === 'TSAsExpression') {
      n = (n as unknown as { expression: Node }).expression;
    } else break;
  }
  if (n.type !== 'Identifier') return null;
  const variable = getVariableFromScope(scope, n.name);
  // Not declared in the file: a global such as Math or JSON.
  if (!variable || variable.defs.length === 0) return [n.name, ...parts].join('.');
  if (variable.defs.length > 1 || seen.has(variable)) return null;
  seen.add(variable);
  const def = variable.defs[0]!;
  if (def.type === 'ImportBinding') {
    const decl = def.parent as estree.ImportDeclaration;
    const source = String(decl.source.value);
    const spec = def.node as estree.ImportSpecifier | estree.ImportDefaultSpecifier | estree.ImportNamespaceSpecifier;
    if (spec.type === 'ImportSpecifier') {
      const imported = spec.imported.type === 'Identifier' ? spec.imported.name : String(spec.imported.value);
      return [source, imported, ...parts].join('.');
    }
    return [source, ...parts].join('.');
  }
  if (def.type === 'Variable') {
    const declarator = def.node as estree.VariableDeclarator;
    if (!declarator.init) return null;
    if (declarator.id.type === 'Identifier') return fqn(context, declarator.init, parts, scope, seen);
    if (declarator.id.type === 'ObjectPattern') {
      // const { exec } = require('child_process'); const { exec: run } = cp;
      for (const p of declarator.id.properties) {
        if (p.type === 'Property' && p.value.type === 'Identifier' && p.value.name === n.name && !p.computed && p.key.type === 'Identifier') {
          return fqn(context, declarator.init, [p.key.name, ...parts], scope, seen);
        }
      }
    }
  }
  return null;
}

/** The import declarations of the file. */
export function getImportDeclarations(context: Rule.RuleContext): estree.ImportDeclaration[] {
  return context.sourceCode.ast.body.filter((s): s is estree.ImportDeclaration => s.type === 'ImportDeclaration');
}

/** Every `require('…')` call that appears directly in a variable declaration at the top level of the file. */
export function getRequireCalls(context: Rule.RuleContext): estree.CallExpression[] {
  const out: estree.CallExpression[] = [];
  for (const s of context.sourceCode.ast.body) {
    if (s.type !== 'VariableDeclaration') continue;
    for (const d of s.declarations) {
      let init = d.init as Node | null | undefined;
      while (init?.type === 'MemberExpression') init = init.object as Node;
      if (init && getModuleNameFromRequire(init) !== undefined) out.push(init as estree.CallExpression);
    }
  }
  return out;
}

/** Does the file import or require the module `name`? */
export function importsModule(context: Rule.RuleContext, name: string): boolean {
  return (
    getImportDeclarations(context).some((d) => removeNodePrefix(String(d.source.value)) === name) ||
    getRequireCalls(context).some((c) => removeNodePrefix(getModuleNameFromRequire(c)!) === name)
  );
}

import { test } from 'vitest';
import type { Rule, Scope } from 'eslint';
import { loadLibs } from '$lib/sa/runtime/libs.js';
import { lint } from '$lib/sa/runtime/lint.js';

test('probe', async () => {
  const libs = await loadLibs();
  const code = `
interface Post { title: string }
const Post = { create: (title: string): Post => ({ title }) };
Post.create('x');
`;
  const rule: Rule.RuleModule = { create: (context) => ({ 'Program:exit'(node) {
    const out: string[] = [];
    const walk = (s: Scope.Scope) => { for (const v of s.variables) { if (!v.defs.length) continue; out.push(s.type + ' ' + v.name + ' defs=' + v.defs.map(d=>d.type) + ' refs=' + v.references.map(r => (r.isRead()?'r':'')+(r.isWrite()?'w':'')+(r.writeExpr? '['+context.sourceCode.getText(r.writeExpr as any)+']':'') + (r.init?'(init)':'')+((r as any).isTypeReference?'T':'')+((r as any).isValueReference?'V':'')).join(' ')); } s.childScopes.forEach(walk); };
    walk(context.sourceCode.getScope(node));
    out.push('through: ' + context.sourceCode.getScope(node).through.map(r=>r.identifier.name+(r.isWrite()?'w':'r')).join(' '));
    console.log(out.join('\n'));
  } }) };
  for (const f of ['/src/a.ts']) { const r = lint({ files: { [f]: code }, rules: { T: rule }, libs, types: false }); console.log(f, r.ruleErrors, r.parseErrors); }
});

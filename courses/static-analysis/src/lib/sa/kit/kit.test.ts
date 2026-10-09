import { describe, expect, test } from 'vitest';
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { loadLibs } from '../runtime/libs.js';
import { lint } from '../runtime/lint.js';
import { getFullyQualifiedName, importsModule } from './module.js';
import { getValueOfExpression, getConstantValue, getProperty } from './ast.js';
import { LiveVariables, lva } from './lva.js';
import { interceptReport } from './decorators.js';
import { createRegExpRule } from './regex.js';
import { isRequiredParserServices } from './parser-services.js';
import { isNullableType, getTypeFromTreeNode } from './type.js';

async function run(code: string, rule: Rule.RuleModule, types = true) {
  const libs = await loadLibs();
  const r = lint({ files: { "/src/a.ts": code }, rules: { T: rule }, libs, types });
  if (r.ruleErrors.length || r.parseErrors.length) console.log(r.ruleErrors, r.parseErrors);
  return r.issues;
}

/** A rule that reports the FQN of every call. */
const fqnRule: Rule.RuleModule = {
  create(context) {
    return {
      CallExpression(node) {
        context.report({ node, message: String(getFullyQualifiedName(context, node)) });
      },
    };
  },
};

describe('getFullyQualifiedName', () => {
  test('imports, requires, destructuring, aliases and globals', async () => {
    const code = [
      "import { exec as run } from 'child_process';",
      "import express from 'express';",
      "import * as cp2 from 'node:child_process';",
      "const cp = require('node:child_process');",
      "const { createHash } = require('crypto');",
      "run('ls');",
      'cp.exec("ls");',
      "createHash('md5');",
      'Math.random();',
      'express();',
      "cp2.execFile('ls', []);",
      'const local = () => 1; local();',
    ].join('\n');
    const issues = await run(code, fqnRule, false);
    expect(issues.map((i) => i.message)).toEqual(['child_process', 'crypto', 'child_process.exec', 'child_process.exec', 'crypto.createHash', 'Math.random', 'express', 'child_process.execFile', 'null']);
  });

  test('new, paths, default specifiers, single writes, chains', async () => {
    const rule: Rule.RuleModule = { create: (context) => ({ 'CallExpression, NewExpression'(node: estree.Node) { context.report({ node, message: String(getFullyQualifiedName(context, node)) }); } }) };
    const code = [
      "const { Bucket } = require('aws-cdk-lib/aws-s3');",
      "import { default as exp } from 'express';",
      "let cp = require('child_process'); cp = {};",
      "let fs; fs = require('fs');",
      'new Bucket();',
      'exp();',
      "cp.exec('ls');",
      "fs.readFileSync('x');",
      "require('child_process').exec('ls');",
      "fs?.promises.readFile('x');",
      "fs[name]('x');",
    ].join('\n');
    const issues = await run(code, rule, false);
    expect(issues.map((i) => i.message)).toEqual(['aws-cdk-lib.aws-s3', 'child_process', 'fs', 'aws-cdk-lib.aws-s3.Bucket', 'express', 'null', 'fs.readFileSync', 'child_process.exec', 'child_process', 'fs.promises.readFile', 'null']);
  });

  test('importsModule', async () => {
    const rule: Rule.RuleModule = { create: (context) => ({ 'Program:exit'(node) { context.report({ node, message: `${importsModule(context, ['fs'])},${importsModule(context, ['path', 'os'])}` }); } }) };
    const issues = await run("const fs = require('node:fs');\nexport {};", rule, false);
    expect(issues[0]!.message).toBe('true,false');
  });
});

describe('value helpers', () => {
  test('getProperty: found, absent, unknown; spreads; last wins', async () => {
    const rule: Rule.RuleModule = {
      create: (context) => ({
        CallExpression(node) {
          const p = getProperty(getValueOfExpression(context, node.arguments[0], 'ObjectExpression') ?? node.arguments[0], 'k', context);
          context.report({ node, message: p === null ? 'null' : p === undefined ? 'undefined' : context.sourceCode.getText(p.value as estree.Node) });
        },
      }),
    };
    const code = [
      'declare const f: (x: unknown) => void; declare const ext: object;',
      'const base = { k: 1 };',
      'f({ k: 2 });',
      'f({ j: 2 });',
      'f({ ...base });',
      'f({ ...ext });',
      'f({ k: 3, ...base });',
      'f({ ...base, k: 4 });',
      "f({ 'k': 5 });",
      'f(42);',
      'const loop: any = { ...loop };',
      'f(loop);',
    ].join('\n');
    const issues = await run(code, rule, false);
    expect(issues.map((i) => i.message)).toEqual(['2', 'null', '1', 'undefined', '1', '4', '5', 'null', 'undefined']);
  });

  test('getValueOfExpression follows single writes', async () => {
    const rule: Rule.RuleModule = {
      create: (context) => ({
        'CallExpression > Identifier.arguments'(node: estree.Identifier) {
          const obj = getValueOfExpression(context, node, 'ObjectExpression');
          context.report({ node, message: obj ? `object with ${obj.properties.length}` : 'unknown' });
        },
      }),
    };
    const issues = await run('const a = { x: 1, y: 2 };\nlet b = {};\nb = { z: 3 };\nf(a);\nf(b);\nfunction f(_: unknown) {}', rule, false);
    expect(issues.map((i) => i.message)).toEqual(['object with 2', 'unknown']);
  });

  test('getConstantValue', async () => {
    const rule: Rule.RuleModule = { create: (context) => ({ 'CallExpression > *.arguments'(node: estree.Node) { context.report({ node, message: String(JSON.stringify(getConstantValue(context, node))) }); } }) };
    const issues = await run("const k = 'secret';\nf(k);\nf(`t`);\nf(1 + 1);\nfunction f(_: unknown) {}", rule, false);
    expect(issues.map((i) => i.message)).toEqual(['"secret"', '"t"', undefined].map((x) => (x === undefined ? 'undefined' : x)));
  });
});

describe('lva', () => {
  test('finds a dead store across branches', async () => {
    // Reports every write whose variable is not live right after it.
    const rule: Rule.RuleModule = {
      create(context) {
        const all = new Map<string, LiveVariables>();
        const current: Rule.CodePathSegment[] = [];
        return {
          onCodePathSegmentStart(s: Rule.CodePathSegment) {
            all.set(s.id, new LiveVariables(s));
            current.push(s);
          },
          onCodePathSegmentEnd() {
            current.pop();
          },
          Identifier(node: estree.Identifier) {
            const scope = context.sourceCode.getScope(node);
            const ref = scope.references.find((r) => r.identifier === node);
            if (ref && current.length) all.get(current[current.length - 1]!.id)!.add(ref);
          },
          'Program:exit'() {
            lva(all);
            for (const facts of all.values()) {
              const live = new Set<Scope.Variable>(facts.out);
              for (const ref of [...facts.references].reverse()) {
                const v = ref.resolved!;
                if (ref.isWrite() && !live.has(v) && v.scope.type !== 'global' && v.scope.type !== 'module') context.report({ node: ref.identifier, message: `dead ${v.name}` });
                if (ref.isWrite()) live.delete(v);
                if (ref.isRead()) live.add(v);
              }
            }
          },
        };
      },
    };
    const code = ['function f(c: boolean) {', '  let x = 1;', '  if (c) { x = 2; } else { return x; }', '  x = 3;', '  return 0;', '}'].join('\n');
    const issues = await run(code, rule, false);
    expect(issues.map((i) => `${i.line}:${i.message}`).sort()).toEqual(['3:dead x', '4:dead x']);
  });
});

describe('decorators and regex', () => {
  test('interceptReport drops reports', async () => {
    const base: Rule.RuleModule = { create: (context) => ({ Identifier(node: estree.Identifier) { context.report({ node, message: node.name }); } }) };
    const decorated = interceptReport(base, (context, d) => {
      if ('node' in d && (d.node as estree.Identifier).name !== 'keep') return;
      context.report(d);
    });
    const issues = await run('const keep = 1, drop = 2;', decorated, false);
    expect(issues.map((i) => i.message)).toEqual(['keep']);
  });

  test('createRegExpRule visits literals and RegExp calls', async () => {
    const rule = createRegExpRule((context) => ({ onQuantifierEnter(q) { if (q.max === Infinity && (q.element.type === 'Group' || q.element.type === 'CapturingGroup')) context.reportRegExpNode({ regexpNode: q, message: `nested ${q.raw}` }); } }));
    const issues = await run("const a = /(a+)+$/;\nconst b = new RegExp('(x*)*');\nconst c = /abc/;", rule, false);
    expect(issues.map((i) => i.message)).toEqual(['nested (a+)+', 'nested (x*)*']);
    // Precise locations: the quantifier inside the literal, and inside the string (no escapes).
    expect(issues.map((i) => [i.line, i.column, i.endColumn])).toEqual([[1, 11, 16], [2, 22, 27]]);
  });

  test('type helpers', async () => {
    const rule: Rule.RuleModule = {
      create(context) {
        const services = context.sourceCode.parserServices;
        return {
          MemberExpression(node: estree.MemberExpression) {
            if (!isRequiredParserServices(services)) return;
            context.report({ node, message: String(isNullableType(getTypeFromTreeNode(node.object as estree.Node, services))) });
          },
        };
      },
    };
    const issues = await run('declare const s: string | undefined;\ns.length;\nif (s) s.length;', rule);
    expect(issues.map((i) => i.message)).toEqual(['true', 'false']);
  });
});

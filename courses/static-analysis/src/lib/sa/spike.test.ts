import { test, expect } from 'vitest';
import { Linter } from 'eslint/universal';
import * as tsParser from '@typescript-eslint/parser';
import ts from 'typescript';

test('linter + types + code paths', () => {
  const files: Record<string,string> = { '/src/a.ts': 'const x: string | undefined = Math.random() > 0.5 ? "a" : undefined;\nlet y = 1;\ny = 2;\nexport const z = x.length + y;\n' };
  const options: ts.CompilerOptions = { strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, noLib: true };
  const host: ts.CompilerHost = {
    getSourceFile: (f, l) => files[f] !== undefined ? ts.createSourceFile(f, files[f]!, l, true) : undefined,
    getDefaultLibFileName: () => '/lib.d.ts', writeFile: () => {}, getCurrentDirectory: () => '/', getDirectories: () => [],
    fileExists: (f) => f in files, readFile: (f) => files[f], getCanonicalFileName: (f) => f, useCaseSensitiveFileNames: () => true, getNewLine: () => '\n',
  };
  const program = ts.createProgram(['/src/a.ts'], options, host);
  const segs: string[] = [];
  const linter = new Linter({ configType: 'flat', cwd: '/' });
  const msgs = linter.verify(files['/src/a.ts']!, [{
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser as never, parserOptions: { programs: [program] } },
    plugins: { t: { rules: { r: {
      meta: { messages: { m: 'type {{t}}' } },
      create(ctx) {
        const svc = ctx.sourceCode.parserServices as any;
        const checker = svc.program.getTypeChecker();
        return {
          onCodePathSegmentStart(s: any) { segs.push(s.id); },
          'MemberExpression'(node: any) {
            const t = checker.getTypeAtLocation(svc.esTreeNodeToTSNodeMap.get(node.object));
            ctx.report({ node, messageId: 'm', data: { t: checker.typeToString(t) } });
          },
        };
      },
    } } as any } },
    rules: { 't/r': 'error' },
  }], '/src/a.ts');
  console.log(msgs, segs);
  expect(msgs.some((m) => m.message.includes('string | undefined'))).toBe(true);
});

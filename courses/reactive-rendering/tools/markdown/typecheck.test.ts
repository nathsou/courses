/**
 * The editor type-checks readers' code as they type (src/lib/exercise/tsWorker.ts), so the starter and the reference
 * solution of every exercise must be free of type errors under the same options: a red squiggle on code the course
 * hands the reader would teach the wrong lesson.
 */
import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import YAML from 'yaml';

const project = path.resolve(import.meta.dirname, '../..');
const root = path.join(project, 'content/chapters');
const virtualFile = path.join(project, '__exercise.ts');

// Keep in step with `options` in src/lib/exercise/tsWorker.ts.
const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.full.d.ts'],
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  paths: { '@rx/tc39': [path.join(project, 'node_modules/signal-polyfill/dist/index.d.ts')], '@rx/*': [path.join(project, 'src/lib/rx/*')] },
};

function diagnose(code: string): string[] {
  const host = ts.createCompilerHost(options);
  const read = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...rest) => (path.resolve(name) === virtualFile ? ts.createSourceFile(name, code, options.target!) : read(name, ...rest));
  const exists = host.fileExists.bind(host);
  host.fileExists = (name) => path.resolve(name) === virtualFile || exists(name);
  const program = ts.createProgram([virtualFile], options, host);
  return ts
    .getPreEmitDiagnostics(program, program.getSourceFile(virtualFile))
    .filter((d) => d.file?.fileName === virtualFile)
    .map((d) => {
      const { line } = d.file!.getLineAndCharacterOfPosition(d.start ?? 0);
      return `line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
    });
}

describe('Exercise code type-checks as the editor sees it', () => {
  const chapters = existsSync(root) ? readdirSync(root).filter((c) => existsSync(path.join(root, c, 'index.md'))) : [];
  for (const ch of chapters) {
    const md = readFileSync(path.join(root, ch, 'index.md'), 'utf8');
    for (const m of md.matchAll(/^```build\n([\s\S]*?)^```$/gm)) {
      const ex = YAML.parse(m[1]!) as { id?: string; lang?: string; starter?: string; solution?: string };
      if (!ex?.starter || (ex.lang && ex.lang !== 'ts')) continue;
      test(`${ch}: ${ex.id}`, () => {
        expect(diagnose(ex.starter!), 'starter').toEqual([]);
        expect(diagnose(ex.solution ?? ''), 'solution').toEqual([]);
      }, 60000);
    }
  }
});

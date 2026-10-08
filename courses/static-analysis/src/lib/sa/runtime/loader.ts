/**
 * Loads the reader's TypeScript modules (rules, helpers) from an in-memory file map. Each module is transpiled to
 * CommonJS by TypeScript (types are erased, not checked: the language server checks them) and evaluated with a
 * `require` that knows the kit, ESLint's regexpp, TypeScript and the other files of the map.
 */
import ts from 'typescript';
import * as regexpp from '@eslint-community/regexpp';
import { KIT_MODULES } from '../kit/index.js';

export class LoadError extends Error {
  constructor(
    message: string,
    readonly file?: string,
  ) {
    super(message);
  }
}

const BUILTINS: Record<string, unknown> = {
  typescript: ts,
  '@eslint-community/regexpp': regexpp,
  eslint: {},
  estree: {},
  '@typescript-eslint/types': {},
};

function dirname(p: string): string {
  return p.slice(0, p.lastIndexOf('/')) || '/';
}

function resolvePath(from: string, spec: string): string {
  const parts = (spec.startsWith('/') ? spec : `${dirname(from)}/${spec}`).split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return `/${out.join('/')}`;
}

export function transpile(source: string, fileName: string): string {
  const out = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.Preserve },
  });
  const error = out.diagnostics?.find((d) => d.category === ts.DiagnosticCategory.Error);
  if (error) {
    const pos = error.file && error.start !== undefined ? error.file.getLineAndCharacterOfPosition(error.start) : undefined;
    throw new LoadError(`${fileName}${pos ? `:${pos.line + 1}:${pos.character + 1}` : ''}: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`, fileName);
  }
  return out.outputText;
}

/** Evaluates `entry` from `files` and returns its exports. */
export function loadModule(files: Record<string, string>, entry: string): Record<string, unknown> {
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const load = (file: string): Record<string, unknown> => {
    const cached = cache.get(file);
    if (cached) return cached.exports;
    const candidates = [file, file.replace(/\.js$/, '.ts'), `${file}.ts`, `${file}/index.ts`];
    const actual = candidates.find((c) => c in files);
    if (!actual) throw new LoadError(`Cannot find module '${file}'`, file);
    const module = { exports: {} as Record<string, unknown> };
    cache.set(file, module);
    const code = transpile(files[actual]!, actual);
    const require = (spec: string): unknown => {
      if (spec in BUILTINS) return BUILTINS[spec];
      const helper = /(?:^|\/)helpers\/([\w-]+)(?:\.js|\.ts)?$/.exec(spec);
      // A helper the reader wrote in this exercise wins over the kit's.
      if (helper && !(resolvePath(actual, spec).replace(/\.js$/, '.ts') in files)) {
        const kit = KIT_MODULES[helper[1]!];
        if (kit) return kit;
      }
      if (spec.startsWith('.') || spec.startsWith('/')) return load(resolvePath(actual, spec));
      throw new LoadError(`Module '${spec}' is not available in the workbench`, actual);
    };
    try {
      new Function('exports', 'require', 'module', code)(module.exports, require, module);
    } catch (e) {
      if (e instanceof LoadError) throw e;
      throw new LoadError(`${actual}: ${e instanceof Error ? e.message : String(e)}`, actual);
    }
    return module.exports;
  };
  return load(entry);
}

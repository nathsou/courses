/**
 * In-memory TypeScript programs. Fixtures, corpus files and the reader's rules never touch a file system: a
 * program is built from a map of file names to contents plus the standard library.
 */
import ts from 'typescript';
import { DEFAULT_LIB } from './libs.ts';
import { CORKBOARD_ENV, CORKBOARD_ENV_FILE } from './corkboard-env.ts';

export const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  allowJs: true,
  checkJs: false,
  jsx: ts.JsxEmit.Preserve,
  noEmit: true,
  skipLibCheck: true,
  esModuleInterop: true,
  lib: [DEFAULT_LIB],
};

export interface ProgramInput {
  /** Absolute file names (e.g. `/src/a.ts`) to contents. */
  files: Record<string, string>;
  libs: Map<string, string>;
  /** Include the declarations of Corkboard's fake runtime (`express`, `db`, …). Default true. */
  corkboardEnv?: boolean;
  options?: ts.CompilerOptions;
}

const sourceFileCache = new Map<string, ts.SourceFile>();

/** Library source files are immutable: parse each once per worker. */
function libSourceFile(name: string, text: string): ts.SourceFile {
  let sf = sourceFileCache.get(name);
  if (!sf) {
    sf = ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, true);
    sourceFileCache.set(name, sf);
  }
  return sf;
}

export function createInMemoryHost(input: ProgramInput): ts.CompilerHost {
  const files = { ...input.files };
  if (input.corkboardEnv !== false) files[CORKBOARD_ENV_FILE] = CORKBOARD_ENV;
  const lib = (f: string) => input.libs.get(f.replace(/^\/lib\//, ''));
  return {
    getSourceFile: (f, languageVersion) => {
      if (f.startsWith('/lib/')) {
        const text = lib(f);
        return text === undefined ? undefined : libSourceFile(f, text);
      }
      const text = files[f];
      return text === undefined ? undefined : ts.createSourceFile(f, text, languageVersion, true);
    },
    getDefaultLibFileName: () => `/lib/${DEFAULT_LIB}`,
    getDefaultLibLocation: () => '/lib',
    writeFile: () => {},
    getCurrentDirectory: () => '/',
    getDirectories: () => [],
    fileExists: (f) => f in files || (f.startsWith('/lib/') && lib(f) !== undefined),
    readFile: (f) => files[f] ?? (f.startsWith('/lib/') ? lib(f) : undefined),
    getCanonicalFileName: (f) => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    directoryExists: (d) => d === '/' || Object.keys(files).some((f) => f.startsWith(d.endsWith('/') ? d : `${d}/`)),
  };
}

export function createInMemoryProgram(input: ProgramInput): ts.Program {
  const roots = Object.keys(input.files);
  if (input.corkboardEnv !== false) roots.push(CORKBOARD_ENV_FILE);
  return ts.createProgram(roots, { ...COMPILER_OPTIONS, ...input.options }, createInMemoryHost(input));
}

/// <reference lib="webworker" />
/**
 * The TypeScript language service for the exercise editors, running in a worker: diagnostics, hover and completion
 * come from the real compiler (the same one that checks this site), against a virtual file system that holds the
 * standard library typings and the course's `@rx/*` modules, so a mistyped import or a wrong signature is
 * flagged as you type. The editors talk to it through @valtown/codemirror-ts and Comlink.
 */
import ts from 'typescript';
import * as Comlink from 'comlink';
import { createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';
import { createWorker } from '@valtown/codemirror-ts/worker';

// The standard library, as raw text: the worker has no network and the site is static.
const libs = import.meta.glob(['/node_modules/typescript/lib/lib.*.d.ts', '!/node_modules/typescript/lib/lib.{webworker,scripthost}*'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// The course library (not its tests), and the types of the one external module exercises may import.
const rx = import.meta.glob(['../rx/*.ts', '!../rx/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const polyfill = import.meta.glob(['/node_modules/signal-polyfill/dist/*.d.ts', '/node_modules/signal-polyfill/package.json'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function buildFiles(): Map<string, string> {
  const files = new Map<string, string>();
  for (const [path, text] of Object.entries(libs)) files.set(`/${path.split('/').pop()}`, text);
  for (const [path, text] of Object.entries(rx)) files.set(`/rx/${path.split('/').pop()}`, text);
  files.set('/rx/tc39.ts', "export * from 'signal-polyfill';\n");
  for (const [path, text] of Object.entries(polyfill)) files.set(path.replace(/^.*\/node_modules\//, '/node_modules/'), text);
  return files;
}

const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.full.d.ts'],
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  paths: { '@rx/*': ['/rx/*'] },
};

Comlink.expose(
  createWorker(async () => {
    const system = createSystem(buildFiles());
    return createVirtualTypeScriptEnvironment(system, [], ts, options);
  }),
);

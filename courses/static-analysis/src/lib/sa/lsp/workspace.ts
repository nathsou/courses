/**
 * The read-only files of the editor's workspace: TypeScript's library, the type declarations a rule imports
 * (ESLint, ESTree, JSON Schema, TypeScript, regexpp), the kit under /rules/helpers/, and Corkboard's runtime
 * declarations for fixtures.
 */
import { loadLibs } from '../runtime/libs.js';
import { KIT_SOURCES } from '../kit/sources.js';
import { CORKBOARD_ENV, CORKBOARD_ENV_FILE } from '../runtime/corkboard-env.js';
import { WORKBENCH_TEST_DTS, WORKBENCH_TEST_FILE } from './workbench-test.js';

const TYPES = import.meta.glob(
  [
    '/node_modules/eslint/lib/types/index.d.ts',
    '/node_modules/eslint/lib/types/use-at-your-own-risk.d.ts',
    '/node_modules/@eslint/core/dist/esm/types.d.ts',
    '/node_modules/@types/estree/index.d.ts',
    '/node_modules/@types/json-schema/index.d.ts',
    '/node_modules/typescript/lib/typescript.d.ts',
    '/node_modules/@eslint-community/regexpp/index.d.ts',
  ],
  { query: '?raw', import: 'default' },
) as Record<string, () => Promise<string>>;

/** Minimal package.json files so that `import … from 'eslint'` resolves to the declarations above. */
const PACKAGES: Record<string, string> = {
  '/node_modules/eslint/package.json': JSON.stringify({
    name: 'eslint',
    types: 'lib/types/index.d.ts',
    exports: { '.': { types: './lib/types/index.d.ts' }, './use-at-your-own-risk': { types: './lib/types/use-at-your-own-risk.d.ts' } },
  }),
  '/node_modules/@eslint/core/package.json': JSON.stringify({ name: '@eslint/core', types: 'dist/esm/types.d.ts' }),
  '/node_modules/@types/estree/package.json': JSON.stringify({ name: '@types/estree', types: 'index.d.ts' }),
  '/node_modules/@types/json-schema/package.json': JSON.stringify({ name: '@types/json-schema', types: 'index.d.ts' }),
  '/node_modules/typescript/package.json': JSON.stringify({ name: 'typescript', types: 'lib/typescript.d.ts' }),
  '/node_modules/@eslint-community/regexpp/package.json': JSON.stringify({ name: '@eslint-community/regexpp', types: 'index.d.ts' }),
};

let cache: Promise<Map<string, string>> | undefined;

export function loadWorkspaceFiles(): Promise<Map<string, string>> {
  cache ??= (async () => {
    const files = new Map<string, string>();
    for (const [name, text] of await loadLibs()) files.set(`/lib/${name}`, text);
    for (const [path, load] of Object.entries(TYPES)) files.set(path, await load());
    for (const [path, text] of Object.entries(PACKAGES)) files.set(path, text);
    for (const [path, load] of Object.entries(KIT_SOURCES)) files.set(`/rules/helpers/${path.replace('./', '')}`, await load());
    files.set(CORKBOARD_ENV_FILE, CORKBOARD_ENV);
    files.set(WORKBENCH_TEST_FILE, WORKBENCH_TEST_DTS);
    return files;
  })();
  return cache;
}

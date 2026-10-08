/**
 * TypeScript's standard library declarations (ES2022, no DOM), loaded lazily. The same code runs in Vitest and in
 * the browser workers: Vite turns the glob into one lazily imported string per file.
 */
const LIB_FILES = import.meta.glob(['/node_modules/typescript/lib/lib.es5.d.ts', '/node_modules/typescript/lib/lib.es20{15,16,17,18,19,20,21,22}*.d.ts', '/node_modules/typescript/lib/lib.decorators*.d.ts'], {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/** The file name TypeScript asks for when a program targets ES2022. */
export const DEFAULT_LIB = 'lib.es2022.d.ts';

let cache: Promise<Map<string, string>> | undefined;

/** All library files, keyed by base name (e.g. `lib.es2015.core.d.ts`). */
export function loadLibs(): Promise<Map<string, string>> {
  cache ??= (async () => {
    const entries = await Promise.all(Object.entries(LIB_FILES).map(async ([p, load]) => [p.split('/').pop()!, await load()] as const));
    return new Map(entries);
  })();
  return cache;
}

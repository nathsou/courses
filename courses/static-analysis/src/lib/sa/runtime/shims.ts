/**
 * Minimal Node globals for running typescript-eslint and ESLint in a browser worker. Imported first by every worker.
 */
const g = globalThis as unknown as { process?: Record<string, unknown> };
if (!g.process) {
  g.process = { env: {}, cwd: () => '/', browser: true, platform: 'browser', versions: {}, version: 'v22.0.0', emitWarning: () => {}, nextTick: (f: () => void) => queueMicrotask(f) };
}
export {};

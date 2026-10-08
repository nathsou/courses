import { sveltekit } from '@sveltejs/kit/vite';
import { useDevServer } from './tools/markdown/preprocess.ts';
import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * Serve the Markdown compiler through Vite's module graph in dev, so edits to tools/markdown/ apply
 * immediately; then reload pages that use it.
 */
function markdownDevCompiler(): Plugin {
  return {
    name: 'markdown-dev-compiler',
    apply: 'serve',
    configureServer(server) {
      useDevServer(server);
      server.watcher.on('change', (file) => {
        if (!file.includes('/tools/markdown/')) return;
        // Invalidate every compiled .md module so pages recompile with the new compiler.
        for (const mod of server.moduleGraph.idToModuleMap.values()) {
          if (mod.id?.endsWith('.md')) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

/** Browser workers bundle typescript-eslint, which imports a few Node built-ins; give them browser stand-ins. */
function nodeBuiltinsForWorkers(): Plugin {
  const stubs = fileURLToPath(new URL('./src/lib/sa/runtime/node-stubs.ts', import.meta.url));
  return {
    name: 'node-builtins-for-workers',
    enforce: 'pre',
    // In dev, workers are served through the client environment; in builds, through `worker.plugins`.
    applyToEnvironment: (env) => env.name === 'client',
    resolveId(id) {
      const bare = id.replace(/^node:/, '');
      if (bare === 'path' || bare === 'path/posix') return this.resolve('path-browserify');
      // ESLint require()s esquery's CommonJS build; the ESM build only has a default export.
      if (id === 'esquery') return this.resolve('esquery/dist/esquery.min.js');
      if (['fs', 'os', 'url', 'module', 'fs/promises'].includes(bare)) return stubs;
      return null;
    },
  };
}

export default defineConfig({
  plugins: [sveltekit(), markdownDevCompiler(), nodeBuiltinsForWorkers()],
  environments: {
    client: {
      resolve: {
        // typescript-eslint imports a few Node built-ins it never uses when given a ready-made program. Pre-bundled
        // dependencies (dev) do not go through resolve plugins, so the browser gets the same stand-ins as aliases.
        alias: [
      { find: /^(node:)?path(\/posix)?$/, replacement: 'path-browserify' },
      { find: /^(node:)?(fs|os|url|module|fs\/promises)$/, replacement: fileURLToPath(new URL('./src/lib/sa/runtime/node-stubs.ts', import.meta.url)) },
      { find: /^esquery$/, replacement: 'esquery/dist/esquery.min.js' },
        ],
      },
      // The dev dependency optimiser bundles node_modules with Rolldown, outside the plugin pipeline above.
      optimizeDeps: { rolldownOptions: { plugins: [nodeBuiltinsForWorkers()] } },
    },
  },
  server: {
    fs: { allow: ['..'] },
    watch: { ignored: ['**/build/**'] },
  },
  worker: { format: 'es', plugins: () => [nodeBuiltinsForWorkers()] },
});

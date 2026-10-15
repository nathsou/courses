# Captured compiler output

The chapters on compilers (12, 13, 17, 18, 19) quote the **real output** of each framework's compiler for the same small
component (a counter with a class that depends on its value). The files here are that output, captured on
2026-10-15, with these versions:

| File(s) | Tool | Version |
|---|---|---|
| `react.classic.js` | `@babel/preset-react` (automatic runtime, production) | Babel 7 |
| `react.compiler.js` | `babel-plugin-react-compiler` | 1.0.0 |
| `solid.dom.js`, `solid.ssr.js` | `babel-preset-solid` (`generate: 'dom'`, `'ssr'` hydratable) | 1.9.16 (solid-js 1.9.17) |
| `vue.vdom.js`, `vue.vapor.js` (+ `*.inline.js`) | `@vue/compiler-sfc` | 3.6.0-rc.11 (the release candidate that includes Vapor mode) |
| `svelte.client.js`, `svelte.server.js` | `svelte/compiler` | 5.57.2 |
| `svelte4.counter.js`, `svelte4.list.js` | `svelte/compiler` | 4.2.19 |
| `angular.counter.component.js` | `ngc` from `@angular/compiler-cli` | 22.2.3 (TypeScript 6.0.3) |

## How they were made

Each framework's source for the counter is in the file named after it (`react.jsx`, `solid.jsx`, `Counter.svelte`,
`Counter.vue`, `angular.counter.component.ts`). Run in a scratch directory with the packages above installed:

```js
// React: Babel with the compiler plugin, then the JSX transform
transformSync(src, { plugins: [['babel-plugin-react-compiler', {}]], presets: [['@babel/preset-react', { runtime: 'automatic', development: false }]], filename: 'Counter.jsx' });
// Solid
transformSync(src, { presets: [['babel-preset-solid', { generate: 'dom', hydratable: false }]], filename: 'Counter.jsx' });
// Svelte 5
compile(src, { generate: 'client', filename: 'Counter.svelte' });
// Vue: parse the SFC, then compileScript + compileTemplate (add vapor: true for Vapor mode)
// Angular: ngc -p tsconfig.json
```

Compiler output is not a stable interface. These files are a record of what the versions above wrote; the chapters say
so each time they quote one. When a version changes, regenerate them and re-read the passages that quote them.

/**
 * synth for tests and build scripts in Node: the module from static/synth/, instantiated synchronously.
 * `npm run synth` builds it; without it, `loadSynth` throws with that instruction.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { instantiateSync, SynthTrap, type SynthInstance } from './wasm';
import type { Synth } from './api';

const file = fileURLToPath(new URL('../../../static/synth/synth_playground.wasm', import.meta.url));

let compiled: WebAssembly.Module | undefined;
let shared: SynthInstance | undefined;

/** The synchronous instance, shared by everything in this process. */
export function loadSynth(): SynthInstance {
  if (shared) return shared;
  if (!existsSync(file)) throw new Error(`${file} is missing: run \`npm run synth\` (needs Rust and the wasm32-unknown-unknown target)`);
  compiled ??= new WebAssembly.Module(readFileSync(file));
  return (shared = instantiateSync(compiled));
}

/** Whether the module has been built (tests that need it can say so instead of failing obscurely). */
export function synthAvailable(): boolean {
  return existsSync(file);
}

/** The asynchronous `Synth` interface over the synchronous instance, for code shared with the pages. */
export function nodeSynth(): Synth {
  return {
    async call(method, body) {
      try {
        return loadSynth().call(method, body);
      } catch (e) {
        if (e instanceof SynthTrap) shared = undefined;
        throw e;
      }
    },
  };
}

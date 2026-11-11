/**
 * The synth toolchain compiled to WebAssembly (`static/synth/synth_playground.wasm`, built by
 * `npm run synth` from the commit in synth.json). This module instantiates it and calls it; it has no
 * DOM or Node dependencies, so the Web Worker (`worker.ts`) and the tests (`node.ts`) share it.
 *
 * The interface is synth's playground API (synth: crates/synth-playground/src/wasm.rs): a request is a
 * method name and a JSON body, the answer is JSON text. A Rust panic traps the instance; `call` then throws
 * with the panic message, and the caller starts a fresh instance.
 */

export interface SynthInstance {
  /** Calls a method synchronously and parses the answer. */
  call<T = unknown>(method: string, body: unknown): T;
}

/** A progress report of a long run: the flow's step and, where it can tell, the fraction done. */
export interface SynthProgress {
  step: string;
  fraction: number | null;
  detail: string;
}

interface Exports {
  memory: WebAssembly.Memory;
  pg_alloc(len: number): number;
  pg_free(ptr: number, len: number): void;
  pg_call(m: number, ml: number, b: number, bl: number): number;
  pg_result_len(): number;
  pg_panic(): number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/** The imports the module needs; the course has no Artix-7 database, so file reads find nothing. */
function imports(get: () => Exports | undefined, onProgress?: (p: SynthProgress) => void): WebAssembly.Imports {
  return {
    env: {
      synth_now_ms: () => performance.now(),
      synth_fs_read: () => -1,
      synth_fs_take: () => {},
      synth_progress: (ptr: number, len: number) => {
        const w = get();
        if (!w || !onProgress) return;
        onProgress(JSON.parse(dec.decode(new Uint8Array(w.memory.buffer, ptr, len).slice())) as SynthProgress);
      },
    },
  };
}

function wrap(exports: Exports): SynthInstance {
  const w = exports;
  const put = (s: string): [number, number] => {
    const b = enc.encode(s);
    const p = w.pg_alloc(b.length);
    new Uint8Array(w.memory.buffer, p, b.length).set(b);
    return [p, b.length];
  };
  return {
    call<T>(method: string, body: unknown): T {
      const [mp, ml] = put(method);
      const [bp, bl] = put(JSON.stringify(body ?? {}));
      let text: string;
      try {
        const r = w.pg_call(mp, ml, bp, bl);
        text = dec.decode(new Uint8Array(w.memory.buffer, r, w.pg_result_len()).slice());
      } catch (e) {
        let msg = e instanceof Error ? e.message : String(e);
        try {
          const p = w.pg_panic();
          const panic = dec.decode(new Uint8Array(w.memory.buffer, p, w.pg_result_len()).slice());
          if (panic) msg = `synth internal error: ${panic}`;
        } catch {
          /* no message */
        }
        throw new SynthTrap(msg);
      }
      try {
        w.pg_free(mp, ml);
        w.pg_free(bp, bl);
      } catch {
        /* trapped */
      }
      return JSON.parse(text) as T;
    },
  };
}

/** A trap inside synth (a panic): the instance is no longer usable. */
export class SynthTrap extends Error {}

/** Instantiates a compiled module synchronously (Node, workers). */
export function instantiateSync(module: WebAssembly.Module, onProgress?: (p: SynthProgress) => void): SynthInstance {
  let exports: Exports | undefined;
  const instance = new WebAssembly.Instance(module, imports(() => exports, onProgress));
  exports = instance.exports as unknown as Exports;
  return wrap(exports);
}

/** Instantiates a compiled module asynchronously (pages, where synchronous instantiation is limited). */
export async function instantiate(module: WebAssembly.Module, onProgress?: (p: SynthProgress) => void): Promise<SynthInstance> {
  let exports: Exports | undefined;
  const instance = await WebAssembly.instantiate(module, imports(() => exports, onProgress));
  exports = instance.exports as unknown as Exports;
  return wrap(exports);
}

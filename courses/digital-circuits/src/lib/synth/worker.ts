/**
 * Runs synth in a Web Worker. Messages: `{ init: url }` once, then `{ id, method, body }` → `{ id, ok, out }`
 * or `{ id, ok: false, error }`, after any number of `{ id, progress }` while a run goes on. After a trap
 * the worker instantiates the module afresh (testbench sessions are lost, which the client reports).
 */
import { instantiate, SynthTrap, type SynthInstance } from './wasm';

let module: Promise<WebAssembly.Module> | undefined;
let instance: Promise<SynthInstance> | undefined;
let current = 0;

const post = (msg: unknown) => (self as unknown as Worker).postMessage(msg);

function fresh(): Promise<SynthInstance> {
  if (!module) throw new Error('synth worker: not initialised');
  return module.then((m) => instantiate(m, (progress) => post({ id: current, progress })));
}

self.onmessage = async (e: MessageEvent<{ init?: string; id?: number; method?: string; body?: unknown }>) => {
  const { init, id, method, body } = e.data;
  if (init) {
    module = WebAssembly.compileStreaming(fetch(init)).catch(async () => {
      const resp = await fetch(init);
      if (!resp.ok) throw new Error(`${init}: HTTP ${resp.status}`);
      return WebAssembly.compile(await resp.arrayBuffer());
    });
    instance = fresh();
    return;
  }
  if (id === undefined || !method) return;
  try {
    const synth = await (instance ??= fresh());
    current = id;
    post({ id, ok: true, out: synth.call(method, body) });
  } catch (err) {
    if (err instanceof SynthTrap) instance = fresh();
    post({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};

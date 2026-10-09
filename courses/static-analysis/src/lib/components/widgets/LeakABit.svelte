<!--
  Leak a secret without copying it: the function receives a secret byte and returns a value. The figure runs it on
  random secrets (with the course's interpreter, not eval) and counts the bits recovered, then asks two analyses
  whether the result depends on the secret: taint (explicit flows only) and information flow (with the pc).
  Lines that run under a secret condition are marked. `:::leak-a-bit` with a ```js block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor, { type EditorMark } from '$lib/editor/CodeEditor.svelte';
  import { CfgError } from '$lib/sa/flow/cfg';
  import { interpret, InterpretError } from '$lib/sa/flow/interpret';
  import { analyseIfc } from '$lib/sa/taint/ifc';

  let {
    code,
    n,
    caption,
    title = 'Leak a bit',
    subtitle = 'Return the secret byte without ever assigning it, then see which analysis notices.',
    presets = '',
  }: { code: string; n?: string; caption?: string; title?: string; subtitle?: string; presets?: string } = $props();

  const PRESETS: Record<string, string> = {
    'copy it': `function leak(secret) {\n  const out = secret;\n  return out;\n}`,
    'bit by bit': `function leak(secret) {\n  let out = 0;\n  let bit = 1;\n  while (bit < 256) {\n    if ((secret & bit) !== 0) {\n      out = out | bit;\n    }\n    bit = bit * 2;\n  }\n  return out;\n}`,
    'count up': `function leak(secret) {\n  let out = 0;\n  while (out !== secret) {\n    out = out + 1;\n  }\n  return out;\n}`,
    'one bit': `function leak(secret) {\n  if (secret > 127) {\n    return 1;\n  }\n  return 0;\n}`,
    declassify: `function leak(secret) {\n  const big = declassify(secret > 127);\n  let out = 0;\n  if (big) {\n    out = 1;\n  }\n  return out;\n}`,
  };
  const presetNames = $derived(presets ? presets.split(',').map((s) => s.trim()).filter((p) => p in PRESETS) : Object.keys(PRESETS));

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  // Fixed pseudo-random secrets, so that the figure is the same for every reader.
  const SECRETS = [0, 255, 1, 128, 77, 200, 13, 154, 42, 99, 7, 183];

  const result = $derived.by(() => {
    try {
      const explicit = analyseIfc(source, { implicit: false });
      const implicit = analyseIfc(source, { implicit: true });
      const cfg = implicit.cfg;
      const runs = SECRETS.map((secret) => {
        try {
          const t = interpret(cfg, { secret }, 50_000);
          return { secret, value: t.outcome === 'returned' ? t.value : undefined, outcome: t.outcome };
        } catch (e) {
          return { secret, value: undefined, outcome: e instanceof InterpretError ? e.message : String(e) };
        }
      });
      // Bits of the secret that the outputs determine: bit i is recovered if the output tells secrets apart on it.
      const bits = Array.from({ length: 8 }, (_, i) => {
        const byOutput = new Map<string, Set<number>>();
        for (const r of runs) {
          const k = String(r.value);
          byOutput.set(k, (byOutput.get(k) ?? new Set()).add((r.secret >> i) & 1));
        }
        const values = new Set(runs.map((r) => (r.secret >> i) & 1));
        return values.size > 1 && [...byOutput.values()].every((s) => s.size === 1);
      }).filter(Boolean).length;
      const exact = runs.every((r) => r.value === r.secret);
      const distinct = new Set(runs.map((r) => String(r.value))).size;
      const marks: EditorMark[] = cfg.nodes.filter((node) => implicit.pc[node.id] === 'H' && node.range).map((node) => ({ from: node.range![0], to: node.range![1], kind: 'warn', message: 'Runs only for some secrets: the pc is secret here.', label: 'pc = H' }));
      return { explicit: explicit.output, implicit: implicit.output, runs, bits, exact, distinct, marks, error: undefined };
    } catch (e) {
      return { error: e instanceof CfgError || e instanceof InterpretError ? e.message : String(e) };
    }
  });
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => (source = code)}>
  <div class="lb">
    <div class="presets ui">
      {#each presetNames as p (p)}<button class:on={source === PRESETS[p]} onclick={() => (source = PRESETS[p]!)}>{p}</button>{/each}
    </div>
    <CodeEditor value={source} lang="js" minLines={8} label="leak(secret)" onchange={(c) => (source = c)} marks={result.marks ?? []} />
    <div class="ui" aria-live="polite">
      {#if result.error}
        <p class="err">{result.error}</p>
      {:else if result.runs}
        <div class="runs">
          {#each result.runs as r (r.secret)}
            <span class="run" class:hit={r.value === r.secret} title={String(r.outcome)}><span class="s">{r.secret}</span>→<span class="v">{r.value === undefined ? '—' : String(r.value)}</span></span>
          {/each}
        </div>
        <p class="score">
          {#if result.exact}All 8 bits leaked: the function returns the secret itself.
          {:else if result.bits}{result.bits} of 8 bits leaked{result.distinct > 1 ? `, ${result.distinct} different outputs` : ''}.
          {:else if result.distinct > 1}The output varies with the secret: some information leaks.
          {:else}Nothing leaks: the output is the same for every secret.{/if}
        </p>
        <table>
          <tbody>
            <tr><th scope="row">Taint, explicit flows only</th><td class={result.explicit === 'H' ? 'h' : 'l'}>{result.explicit === 'H' ? 'the result depends on the secret' : 'the result is public'}</td></tr>
            <tr><th scope="row">Information flow, with the pc</th><td class={result.implicit === 'H' ? 'h' : 'l'}>{result.implicit === 'H' ? 'the result depends on the secret' : 'the result is public'}</td></tr>
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .lb {
    display: grid;
    gap: 0.6rem;
  }
  .lb > :global(*) {
    min-width: 0;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .presets button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .presets button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .runs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    font-family: var(--font-mono, monospace);
    font-size: 0.78rem;
  }
  .run {
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 0.05rem 0.35rem;
  }
  .run.hit {
    border-color: var(--bad);
    color: var(--bad);
  }
  .run .s {
    color: var(--ink-2);
  }
  .score {
    font-size: 0.88rem;
    font-weight: 600;
    margin: 0.5rem 0;
  }
  table {
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.25rem 0.6rem 0.25rem 0;
    border-bottom: 1px solid var(--line);
    text-transform: none;
    letter-spacing: normal;
    font-weight: 500;
  }
  td.h {
    color: var(--bad);
    font-weight: 600;
  }
  td.l {
    color: var(--ok);
  }
  .err {
    color: var(--bad);
  }
</style>

<!--
  The rendering pipeline under a loop of reads and writes: which stages ran, which were forced by script, and what that
  cost. The numbers are a model (see src/lib/rx/pipeline.ts); the counts of forced layouts are exact.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Code from '$lib/code/Code.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { SNIPPETS, simulate, steps, type Snippet, type StageKind } from '$lib/rx/pipeline';

  let { n: figure, title = 'The pipeline under a loop', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  let snippet = $state<Snippet>('interleaved');
  let items = $state(100);
  let nodes = $state(2000);

  const current = $derived(SNIPPETS.find((s) => s.id === snippet)!);
  const result = $derived(simulate(steps(snippet, items), { nodes }));
  const LABEL: Record<StageKind, string> = { script: 'Script', style: 'Style', layout: 'Layout', paint: 'Paint', composite: 'Composite' };
  const totals = $derived(
    (['script', 'style', 'layout', 'paint', 'composite'] as StageKind[]).map((k) => ({
      kind: k,
      ms: result.stages.filter((s) => s.kind === k).reduce((a, s) => a + s.ms, 0),
      runs: result.stages.filter((s) => s.kind === k).length,
      forced: result.stages.filter((s) => s.kind === k && s.forced).length,
    })),
  );
</script>

<Widget {title} n={figure} {caption} kind="Model" subtitle="Writes invalidate; reads that depend on layout force it. Pick a snippet and watch the stages.">
  {#snippet controls()}
    <Segmented
      label="Snippet"
      bind:value={snippet}
      options={[
        { value: 'interleaved', label: 'Interleaved' },
        { value: 'batched', label: 'Batched' },
        { value: 'fragment', label: 'Off-page build' },
        { value: 'transform', label: 'Transform' },
        { value: 'reads-only', label: 'Reads only' },
      ]}
    />
    <Slider label="Items" bind:value={items} min={10} max={400} step={10} format={(v) => v.toFixed(0)} />
    <Slider label="Nodes on the page" bind:value={nodes} min={200} max={20000} step={200} format={(v) => v.toFixed(0)} />
  {/snippet}

  <Code class="code" lang="js" label="The code being run" code={current.code(items)} />

  <div class="bar" role="img" aria-label="Timeline of pipeline stages: {result.stages.length} stages, {result.forcedLayouts} forced layouts, {result.totalMs.toFixed(1)} milliseconds">
    {#each result.stages as s, i (i)}
      <span class="seg {s.kind}" class:forced={s.forced} style:flex="{Math.max(s.ms, 0.0001)} 1 0" title="{LABEL[s.kind]}{s.forced ? ' (forced)' : ''}: {s.ms.toFixed(2)} ms"></span>
    {/each}
  </div>
  <ul class="key ui">
    {#each totals.filter((t) => t.runs) as t (t.kind)}
      <li><span class="sw {t.kind}"></span>{LABEL[t.kind]} <b>{t.runs}×</b>{#if t.forced} <em>({t.forced} forced)</em>{/if} <span class="ms">{t.ms.toFixed(1)} ms</span></li>
    {/each}
  </ul>

  <div class="stats ui">
    <div><b class:bad={result.forcedLayouts > 1}>{result.forcedLayouts}</b><span>forced layouts</span></div>
    <div><b>{result.totalMs.toFixed(1)} ms</b><span>total, modelled</span></div>
    <div><b class:bad={result.forcedMs > 4}>{result.forcedMs.toFixed(1)} ms</b><span>in forced stages</span></div>
  </div>
  <p class="note ui">{current.note}</p>
</Widget>

<style>
  :global(.code) {
    margin: 0 0 0.8rem;
    padding: 0.6rem 0.8rem;
    background: var(--pn);
    border: 1px solid var(--line);
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    overflow-x: auto;
  }
  .bar {
    display: flex;
    height: 2.2rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    overflow: hidden;
    background: var(--bg);
  }
  .seg {
    min-width: 1px;
    border-right: 1px solid color-mix(in srgb, var(--bg) 60%, transparent);
  }
  .seg.script { background: var(--series-8); }
  .seg.style { background: var(--series-5); }
  .seg.layout { background: var(--series-1); }
  .seg.paint { background: var(--series-3); }
  .seg.composite { background: var(--series-6); }
  .seg.forced {
    background-image: repeating-linear-gradient(45deg, transparent 0 3px, color-mix(in srgb, var(--bg) 55%, transparent) 3px 5px);
    box-shadow: inset 0 0 0 1px var(--flash);
  }
  .key {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.1rem;
    list-style: none;
    padding: 0;
    margin: 0.6rem 0;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .sw {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    margin-right: 0.3rem;
    vertical-align: -1px;
  }
  .sw.script { background: var(--series-8); }
  .sw.style { background: var(--series-5); }
  .sw.layout { background: var(--series-1); }
  .sw.paint { background: var(--series-3); }
  .sw.composite { background: var(--series-6); }
  .ms {
    color: var(--mute);
    font-family: var(--font-mono);
    font-size: 0.74rem;
  }
  em {
    color: var(--flash);
    font-style: normal;
    font-weight: 600;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 2rem;
    margin: 0.6rem 0;
  }
  .stats div {
    display: flex;
    flex-direction: column;
  }
  .stats b {
    font-family: var(--font-mono);
    font-size: 1.3rem;
  }
  .stats b.bad {
    color: var(--flash);
  }
  .stats span {
    font-size: 0.74rem;
    color: var(--mute);
  }
  .note {
    margin: 0;
    font-size: 0.86rem;
    color: var(--ink-2);
  }
</style>

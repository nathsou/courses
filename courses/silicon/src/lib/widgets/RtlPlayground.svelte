<!--
  An HDL playground: edit a design, set its inputs cycle by cycle (click a cell to toggle a one-bit input), and
  see the waveform. The design re-simulates on every edit that parses. Drafts are kept per playground id.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import HdlEditor from '$lib/components/eda/HdlEditor.svelte';
  import Waveform from '$lib/components/eda/Waveform.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { parse, type Signal } from '$lib/eda/hdl';
  import { simulate, randomStimulus } from '$lib/eda/sim';
  import { DECADE_COUNTER } from '$lib/eda/designs';

  let {
    id = 'rtl/playground',
    title = 'A design, simulated',
    code = DECADE_COUNTER,
    cycles = 14,
    rows,
  }: { id?: string; title?: string; code?: string; cycles?: number; rows?: number } = $props();

  let src = $state(untrack(() => code));
  let stim = $state<Record<string, number[]>>({});
  let format = $state<'dec' | 'hex' | 'bin'>('dec');
  let mounted = false;
  onMount(() => {
    src = progress.draft(id, code);
    mounted = true;
  });
  $effect(() => {
    if (mounted) progress.saveDraft(id, src);
  });

  const parsed = $derived(parse(src));
  let lastGood = $state(untrack(() => parse(code)));
  $effect(() => {
    if (parsed.ok) lastGood = parsed;
  });
  const d = $derived(lastGood.ok ? lastGood.design : null);
  const defaultFor = (s: Signal, i: number) => (s.width > 1 ? i % 2 ** s.width : /^(rst|reset|clr|clear)$/.test(s.name) ? 0 : 1);
  const column = (s: Signal) => stim[s.name] ?? Array.from({ length: cycles }, (_, i) => defaultFor(s, i));
  const stimulus = $derived(d ? Array.from({ length: cycles }, (_, i) => Object.fromEntries(d.inputs.map((s) => [s.name, column(s)[i]!]))) : []);
  const trace = $derived(d ? simulate(d, stimulus) : null);

  function toggle(s: Signal, i: number) {
    const col = [...column(s)];
    col[i] = s.width === 1 ? (col[i] ? 0 : 1) : (col[i]! + 1) % 2 ** s.width;
    stim = { ...stim, [s.name]: col };
  }
  function randomise() {
    if (!d) return;
    const r = randomStimulus(d, cycles, Math.floor(Math.random() * 1e9), { rst: 0.1, reset: 0.1 });
    stim = Object.fromEntries(d.inputs.map((s) => [s.name, r.map((v) => v[s.name]!)]));
  }
  function restore() {
    src = code;
    stim = {};
  }
</script>

<Widget {title} subtitle="Edit the design; set the inputs cycle by cycle by clicking the cells; the waveform updates as you type." onreset={restore}>
  <HdlEditor bind:value={src} rows={rows ?? Math.min(14, Math.max(6, code.split('\n').length + 1))} errorLine={parsed.ok ? undefined : parsed.errors[0]!.line} label={title} />
  {#if !parsed.ok}
    <p class="err ui" aria-live="polite">Line {parsed.errors[0]!.line}: {parsed.errors[0]!.message}. {lastGood.ok ? 'The waveform shows the last version that worked.' : ''}</p>
  {/if}
  {#if d && d.inputs.length}
    <div class="stim ui" role="group" aria-label="Inputs, cycle by cycle">
      <div class="head"><span class="nm">cycle</span>{#each Array.from({ length: cycles }) as _, i (i)}<span class="c">{i}</span>{/each}</div>
      {#each d.inputs as s (s.name)}
        <div class="row">
          <span class="nm">{s.name}</span>
          {#each column(s) as v, i (i)}
            <button class="c" class:on={v !== 0} onclick={() => toggle(s, i)} aria-label="{s.name} in cycle {i}: {v}">{v}</button>
          {/each}
        </div>
      {/each}
    </div>
    <div class="bar ui">
      <button onclick={randomise}>Random inputs</button>
      <button onclick={() => (stim = {})}>Default inputs</button>
      <label>Numbers in
        <select bind:value={format}><option value="dec">decimal</option><option value="hex">hex</option><option value="bin">binary</option></select>
      </label>
    </div>
  {/if}
  {#if d && trace}
    <Waveform
      signals={[...d.inputs, ...d.regs, ...d.wires, ...d.outputs].map((s) => ({ name: s.name, width: s.width }))}
      cycles={trace.cycles.map((c) => c.values)}
      mark={trace.failure?.cycle}
      {format}
      label="Waveform of {title}"
    />
    {#if trace.failure}<p class="err ui">Assertion “{trace.failure.check.text}” (line {trace.failure.check.line}) fails in cycle {trace.failure.cycle}.</p>{/if}
  {/if}
</Widget>

<style>
  .err {
    color: var(--bad);
    font-size: 0.84rem;
    margin: 0.4rem 0 0;
  }
  .stim {
    margin-top: 0.7rem;
    overflow-x: auto;
    font-size: 0.78rem;
  }
  .head,
  .row {
    display: flex;
    align-items: center;
    gap: 2px;
    width: max-content;
  }
  .nm {
    width: 3.6rem;
    flex: none;
    font-weight: 600;
    color: var(--ink-2);
  }
  .c {
    width: 1.75rem;
    flex: none;
    text-align: center;
    font-family: var(--font-mono);
  }
  .head .c {
    color: var(--ink-3);
    font-size: 0.7rem;
  }
  button.c {
    height: 1.75rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink-2);
    border-radius: 3px;
    cursor: pointer;
    padding: 0;
  }
  button.c.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin: 0.5rem 0 0.2rem;
    font-size: 0.82rem;
  }
  .bar button,
  .bar select {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.7rem;
    cursor: pointer;
    min-height: 2rem;
  }
  .bar label {
    color: var(--ink-2);
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
  }
</style>

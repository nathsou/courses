<!--
  Manufacturing test of the decade counter. With full scan, the four flip-flops can be loaded and read directly,
  so each test is one vector: values for en, rst and the four bits of q. The tester compares the outputs and the
  flip-flops' next values with a fault-free simulation; a stuck-at fault is detected when any of them differs.
  Build a test set by hand, or let a test generator choose one.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import NetlistView from '$lib/components/eda/NetlistView.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { design } from '$lib/eda/hdl';
  import { synthesize } from '$lib/eda/techmap';
  import { DECADE_COUNTER } from '$lib/eda/designs';
  import { allFaults, atpg, coverage, detects, faultName, testPorts, type Vector } from '$lib/eda/faults';

  const nl = synthesize(design(DECADE_COUNTER));
  const faults = allFaults(nl);
  const ports = testPorts(nl).controls;
  const GOAL = 8;
  let current = $state<Record<string, number>>(Object.fromEntries(ports.map((c) => [c, 0])));
  let vectors = $state<Vector[]>([]);
  let usedAtpg = $state(false);
  let mounted = $state(false);
  onMount(() => {
    progress.load();
    mounted = true;
  });

  const cov = $derived(coverage(nl, vectors, faults));
  const undetected = $derived(faults.filter((f) => !cov.detected.has(faultName(f))));
  const preview = $derived(detects(nl, current, undetected).length);
  const full = $derived(undetected.length === 0);
  $effect(() => {
    if (full && !usedAtpg && vectors.length <= GOAL && mounted) progress.markSolved('test/scan-hand');
  });
  function add() {
    vectors = [...vectors, { ...current }];
  }
  function auto() {
    usedAtpg = true;
    vectors = atpg(nl, faults).vectors;
  }
  function clear() {
    vectors = [];
    usedAtpg = false;
  }
  const bits = (v: Vector) => ports.map((c) => v[c]).join('');
  const hotNets = $derived(new Set(undetected.map((f) => f.net)));
  const hotCells = $derived(new Set(nl.instances.filter((i) => hotNets.has(i.out)).map((i) => i.id)));
</script>

<Widget title="Testing the counter for defects" subtitle="Every wire could be stuck at 0 or stuck at 1: {faults.length} possible faults. Set a test vector (scanned into the flip-flops and applied to the inputs), see how many new faults it would catch, and add it to the test set.">
  {#snippet controls()}
    <div class="vec ui" role="group" aria-label="The test vector">
      {#each ports as c (c)}
        <button class:on={current[c] === 1} onclick={() => (current = { ...current, [c]: current[c] ? 0 : 1 })} aria-pressed={current[c] === 1}>{c} = {current[c]}</button>
      {/each}
    </div>
    <button class="b go ui" onclick={add}>Add this vector (catches {preview} new)</button>
    <button class="b ui" onclick={auto}>Let ATPG choose</button>
    <button class="b ui" onclick={clear}>Clear</button>
  {/snippet}
  <div class="cov ui">
    <div class="bar" role="img" aria-label="Fault coverage {(cov.coverage * 100).toFixed(1)} per cent"><span style:width="{cov.coverage * 100}%"></span></div>
    <span class="pct">Fault coverage <strong>{(cov.coverage * 100).toFixed(1)} %</strong> ({cov.detected.size} of {faults.length}) with {vectors.length} vector{vectors.length === 1 ? '' : 's'}</span>
  </div>
  {#if vectors.length}
    <ol class="list ui">
      {#each vectors as v, i (i)}<li><code>{bits(v)}</code></li>{/each}
    </ol>
    <p class="key ui">Bits in the order {ports.join(', ')}.</p>
  {/if}
  <p class="verdict ui" class:ok={full} aria-live="polite">
    {#if full}Coverage checked: every stuck-at fault is detected, with {vectors.length} vectors{usedAtpg ? ' chosen by the test generator' : mounted && progress.isSolved('test/scan-hand') ? ', by hand' : ''}.
    {:else}Undetected so far: {undetected.slice(0, 6).map(faultName).join('; ')}{undetected.length > 6 ? `; and ${undetected.length - 6} more` : ''}. Their wires are marked in red.{/if}
  </p>
  <NetlistView netlist={nl} hot={hotCells} hotNets={hotNets} />
  <p class="note ui">Goal: full coverage by hand with at most {GOAL} vectors{mounted && progress.isSolved('test/scan-hand') ? ' ✓' : ''}.</p>
</Widget>

<style>
  .vec {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .vec button {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.55rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .vec button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .b {
    font: inherit;
    font-size: 0.84rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .b.go {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
  }
  .cov {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    align-items: center;
    font-size: 0.86rem;
  }
  .bar {
    flex: 1 1 12rem;
    height: 0.8rem;
    background: var(--surface-2);
    border-radius: 3px;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--ok);
    transition: width 200ms;
  }
  .list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.4rem;
    margin: 0.6rem 0 0;
    padding-left: 1.4rem;
    font-size: 0.82rem;
  }
  .key,
  .note {
    font-size: 0.76rem;
    color: var(--ink-3);
    margin: 0.3rem 0 0;
  }
  .verdict {
    font-size: 0.86rem;
    margin: 0.6rem 0;
  }
  .verdict.ok {
    color: var(--ok);
    font-weight: 600;
  }
</style>

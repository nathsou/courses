<!--
  The scoreboard: every reference allocator (and, if present, the reader's) replays every trace in the bank
  through the heap checker. Utilisation = peak live payload / peak heap; throughput in simulated cycles per
  operation with a cache model. `::scoreboard{traces="phases,random" metric="utilisation"}`.
-->
<script lang="ts">
  import Widget from '../ui/Widget.svelte';
  import { onMount } from 'svelte';
  import { REFERENCE } from '$lib/mm/heap/allocators';
  import { TRACE_BANK } from '$lib/mm/trace/trace';
  import { runTrace, type CheckReport } from '$lib/mm/check/checker';
  import type { AllocatorFactory } from '$lib/mm/heap/api';
  import { benchCapacity } from '$lib/mm/check/bench';

  let {
    traces = 'phases,compiler,server,trees,random,adversary',
    allocators = 'first,next,best,explicit,explicit-addr,segregated,classes',
    title = 'The scoreboard',
    caption,
    n,
    extra,
    extraLabel = 'Your allocator',
    limit = false,
  }: { traces?: string; allocators?: string; title?: string; caption?: string; n?: string; extra?: AllocatorFactory; extraLabel?: string; limit?: boolean } = $props();

  const ts = $derived(traces.split(',').map((t) => TRACE_BANK.find((x) => x.id === t.trim())!).filter(Boolean));
  const as = $derived([...allocators.split(',').map((a) => REFERENCE.find((x) => x.id === a.trim())!).filter(Boolean), ...(extra ? [{ id: 'extra', label: extraLabel, make: extra }] : [])]);
  let metric = $state<'utilisation' | 'cycles'>('utilisation');
  let rows = $state<Record<string, Record<string, CheckReport>>>({});
  let busy = $state(true);

  async function compute() {
    busy = true;
    const out: Record<string, Record<string, CheckReport>> = {};
    for (const a of as) {
      out[a.id] = {};
      for (const t of ts) {
        await new Promise((r) => setTimeout(r, 0));
        out[a.id]![t.id] = runTrace(a.make, t.ops, { cache: true, capacity: limit ? benchCapacity(t.ops) : undefined });
      }
      rows = { ...out };
    }
    busy = false;
  }
  onMount(compute);
  $effect(() => {
    void extra;
    if (extra) compute();
  });

  const cell = (r?: CheckReport) => (!r ? '…' : !r.ok ? (r.failure?.kind === 'null' ? 'out of memory' : '✗') : metric === 'utilisation' ? `${Math.round(r.utilisation * 100)}%` : `${Math.round(r.cyclesPerOp)}`);
  const shade = (r?: CheckReport) => {
    if (!r || !r.ok) return 0;
    return metric === 'utilisation' ? r.utilisation : Math.max(0, 1 - Math.log10(r.cyclesPerOp) / 3.5);
  };
</script>

<Widget {title} {caption} {n} kind="Scoreboard">
  <div class="ctl ui" role="radiogroup" aria-label="Metric">
    <button role="radio" aria-checked={metric === 'utilisation'} class:on={metric === 'utilisation'} onclick={() => (metric = 'utilisation')}>Utilisation (higher is better)</button>
    <button role="radio" aria-checked={metric === 'cycles'} class:on={metric === 'cycles'} onclick={() => (metric = 'cycles')}>Cycles per operation (lower is better)</button>
    {#if busy}<span class="busy">replaying traces…</span>{/if}
  </div>
  <div class="table-scroll">
    <table class="ui">
      <thead><tr><th>Allocator</th>{#each ts as t (t.id)}<th title={t.description}>{t.name}</th>{/each}</tr></thead>
      <tbody>
        {#each as as a (a.id)}
          <tr class:mine={a.id === 'extra'}>
            <th scope="row">{a.label}</th>
            {#each ts as t (t.id)}
              {@const r = rows[a.id]?.[t.id]}
              <td class="mono" style:--s={shade(r)} title={r && !r.ok ? r.failure?.message : undefined}>{cell(r)}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</Widget>

<style>
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.8rem;
    margin-bottom: 0.7rem;
  }
  button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  button.on {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  .busy {
    color: var(--mute);
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: 0.8rem;
    width: 100%;
  }
  th,
  td {
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--line);
    text-align: left;
    white-space: nowrap;
  }
  thead th {
    font-size: 0.72rem;
    color: var(--ink-2);
  }
  tbody th {
    font-family: var(--font-ui);
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--fg);
  }
  td {
    background: color-mix(in srgb, var(--green) calc(var(--s) * 35%), transparent);
    text-align: right;
  }
  tr.mine th {
    color: var(--copper);
  }
</style>

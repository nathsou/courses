<!--
  What the last action did to the DOM, as a row of counters. "live" operations are the ones on nodes that were
  attached to the page: the ones a browser would have to style, lay out and paint.
-->
<script lang="ts">
  import type { OpStats } from '$lib/rx/dom';

  let { stats, label = 'Last action' }: { stats: OpStats; label?: string } = $props();
  const writes = $derived(stats.texts + stats.attrs + stats.props);
  const moves = $derived(stats.inserted + stats.removed);
</script>

<div class="counter ui" role="status" aria-label="{label}: {stats.total} DOM operations">
  <span class="big"><b>{stats.total}</b> <span class="u">DOM {stats.total === 1 ? 'operation' : 'operations'}</span></span>
  <span class="detail">
    {#if stats.total === 0}nothing touched{:else}
      {#if writes}<span title="Text, attribute and property writes">✎ {writes} write{writes === 1 ? '' : 's'}</span>{/if}
      {#if stats.created}<span title="createElement / createTextNode">+ {stats.created} created</span>{/if}
      {#if stats.parsed}<span title="Nodes made by innerHTML or cloneNode">⎘ {stats.parsed} parsed</span>{/if}
      {#if moves}<span title="insertBefore / removeChild">⇅ {stats.inserted} in, {stats.removed} out</span>{/if}
      {#if stats.listeners}<span title="addEventListener / removeEventListener">⚡ {stats.listeners} listener{stats.listeners === 1 ? '' : 's'}</span>{/if}
    {/if}
  </span>
  <span class="live" title="Operations on nodes attached to the page">{stats.live} live</span>
</div>

<style>
  .counter {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.2rem 0.8rem;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .big b {
    font-family: var(--font-mono);
    font-size: 1.15rem;
    color: var(--flash);
  }
  .u {
    color: var(--mute);
  }
  .detail {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.7rem;
    font-family: var(--font-mono);
    font-size: 0.74rem;
  }
  .live {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--mute);
  }
</style>

<!--
  One bar per object (sampled when there are many): born → last use (solid), last use → unreachable
  (dashed: dead but still reachable), unreachable → freed (hatched: waiting for the collector). A red bar with ✗ was
  freed before its last use; an open bar with an arrowhead was never freed (a leak if unreachable at the end).
  Ghost ticks (◇) mark where the program said free() under a setting that ignores it. Hover or focus a bar for its story.
-->
<script lang="ts">
  import { sample, type Bar } from './lifetime';

  let { bars, end, max = 48 }: { bars: Bar[]; end: number; max?: number } = $props();
  let width = $state(600);
  let hover = $state<Bar | null>(null);
  const shown = $derived(sample(bars, max));
  const rowH = 9;
  const pad = { l: 8, r: 14, t: 6 };
  const height = $derived(pad.t * 2 + shown.length * rowH);
  const x = (t: number) => pad.l + ((width - pad.l - pad.r) * t) / Math.max(1, end);
  const story = (b: Bar) =>
    `#${b.id} ${b.type} (line ${b.line}): born at step ${b.born}, last used at ${b.lastUse}` +
    (b.unreachable !== undefined ? `, unreachable from ${b.unreachable}` : '') +
    (b.freed !== undefined ? `, freed at ${b.freed} (${b.freedBy})` : ', never freed') +
    (b.unsafe ? ' — freed before its last use!' : '') +
    (b.leak ? ' — a leak' : '');
</script>

<div class="life" bind:clientWidth={width}>
  <svg {width} {height} role="group" aria-label="Object lifetimes">
    <defs>
      <pattern id="lag" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="5" class="lag-bg" />
        <line x1="0" y1="0" x2="0" y2="5" class="lag-line" />
      </pattern>
    </defs>
    {#each shown as b, i (b.id)}
      {@const yy = pad.t + i * rowH}
      {@const fin = b.freed ?? end}
      <g class="row" class:unsafe={b.unsafe} class:leak={b.leak} tabindex="0" role="img" aria-label={story(b)} onmouseenter={() => (hover = b)} onmouseleave={() => (hover = null)} onfocus={() => (hover = b)} onblur={() => (hover = null)}>
        <rect class="hit" x={pad.l} y={yy} width={Math.max(0, width - pad.l - pad.r)} height={rowH} />
        <rect class="use" x={x(b.born)} y={yy + 1.5} width={Math.max(1.5, x(Math.min(b.lastUse, fin)) - x(b.born))} height={rowH - 3} />
        {#if b.unreachable !== undefined && b.unreachable > b.lastUse}
          <line class="dead" x1={x(b.lastUse)} x2={x(Math.min(b.unreachable, fin))} y1={yy + rowH / 2} y2={yy + rowH / 2} />
        {:else if b.unreachable === undefined && fin > b.lastUse}
          <line class="dead" x1={x(b.lastUse)} x2={x(fin)} y1={yy + rowH / 2} y2={yy + rowH / 2} />
        {/if}
        {#if b.unreachable !== undefined && fin > b.unreachable}
          <rect class="lag" x={x(Math.max(b.unreachable, b.lastUse))} y={yy + 2} width={Math.max(0, x(fin) - x(Math.max(b.unreachable, b.lastUse)))} height={rowH - 4} />
        {/if}
        {#if b.freed !== undefined}
          <line class="free" x1={x(b.freed)} x2={x(b.freed)} y1={yy} y2={yy + rowH} />
          {#if b.unsafe}<text class="x" x={x(b.freed) + 2} y={yy + rowH - 1}>✗</text>{/if}
        {:else}
          <path class="arrow" d="M{x(end) - 4} {yy + 1.5}L{x(end) + 2} {yy + rowH / 2}L{x(end) - 4} {yy + rowH - 1.5}" />
        {/if}
        {#if b.ghost !== undefined}<path class="ghost" d="M{x(b.ghost)} {yy}l3 {rowH / 2}l-3 {rowH / 2}l-3 {-rowH / 2}z" />{/if}
      </g>
    {/each}
  </svg>
  <p class="story ui" aria-live="polite">{hover ? story(hover) : shown.length < bars.length ? `Showing ${shown.length} of ${bars.length} objects. Hover a bar for its story.` : 'Hover or focus a bar for its story.'}</p>
  <p class="legend ui">
    <span><i class="sw use"></i> in use</span>
    <span><i class="sw dead"></i> dead, still reachable</span>
    <span><i class="sw lag"></i> unreachable, not yet freed</span>
    <span><i class="sw free"></i> freed</span>
    <span class="bad">✗ freed while in use</span>
    <span>▸ never freed</span>
    <span>◇ program’s free(), ignored</span>
  </p>
</div>

<style>
  .life {
    margin-top: 0.8rem;
  }
  svg {
    display: block;
  }
  .hit {
    fill: transparent;
  }
  .row:hover .hit,
  .row:focus .hit {
    fill: var(--amber-soft);
  }
  .row:focus {
    outline: none;
  }
  .use {
    fill: var(--alloc);
    rx: 1.5;
  }
  .dead {
    stroke: var(--alloc);
    stroke-width: 1.4;
    stroke-dasharray: 2 2;
    opacity: 0.7;
  }
  .lag-bg {
    fill: var(--garbage);
    opacity: 0.25;
  }
  .lag-line {
    stroke: var(--garbage);
    stroke-width: 2;
  }
  .lag {
    fill: url(#lag);
  }
  .free {
    stroke: var(--fg);
    stroke-width: 1.5;
  }
  .unsafe .use {
    fill: var(--uaf);
  }
  .unsafe .free {
    stroke: var(--uaf);
  }
  .x {
    font-size: 9px;
    fill: var(--uaf);
    font-weight: 700;
  }
  .arrow {
    fill: none;
    stroke: var(--mute);
    stroke-width: 1.4;
  }
  .leak .arrow {
    stroke: var(--leak);
    stroke-width: 2;
  }
  .leak .use {
    fill: var(--leak);
  }
  .ghost {
    fill: none;
    stroke: var(--mute);
    stroke-width: 1;
  }
  .story {
    margin: 0.3rem 0 0;
    font-size: 0.8rem;
    min-height: 2.4em;
    color: var(--ink-2);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.9rem;
    font-size: 0.74rem;
    color: var(--ink-2);
    margin: 0.2rem 0 0;
  }
  .sw {
    display: inline-block;
    width: 1.1rem;
    height: 0.55rem;
    vertical-align: middle;
    margin-right: 0.25rem;
    border-radius: 1px;
  }
  .sw.use {
    background: var(--alloc);
  }
  .sw.dead {
    border-top: 1.5px dashed var(--alloc);
    height: 0;
  }
  .sw.lag {
    background: repeating-linear-gradient(45deg, var(--garbage) 0 2px, transparent 2px 4px);
  }
  .sw.free {
    width: 2px;
    background: var(--fg);
  }
  .bad {
    color: var(--uaf);
  }
</style>

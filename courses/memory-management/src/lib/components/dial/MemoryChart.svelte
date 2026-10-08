<!--
  Bytes over time: what the memory manager holds, against the two oracles: bytes reachable from the program
  and bytes that will actually be used again. The gap between "held" and "will be used" is drag.
-->
<script lang="ts">
  import type { Curves } from './lifetime';
  import { bytes } from '$lib/mm/util/format';

  let { curves, end, gcs = [], height = 150 }: { curves: Curves; end: number; gcs?: number[]; height?: number } = $props();
  let width = $state(600);
  const pad = { l: 52, r: 10, t: 10, b: 22 };
  const max = $derived(Math.max(64, ...curves.held, ...curves.reachable));
  const x = (t: number) => pad.l + ((width - pad.l - pad.r) * t) / Math.max(1, end);
  const y = (v: number) => pad.t + (height - pad.t - pad.b) * (1 - v / max);
  const path = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(curves.t[i]!).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const area = (vs: number[]) => `${path(vs)}L${x(end)} ${y(0)}L${x(0)} ${y(0)}Z`;
</script>

<div class="mem" bind:clientWidth={width}>
  <svg {width} {height} role="img" aria-label="Bytes held by the memory manager over time, compared with bytes reachable and bytes that will be used again">
    {#each [0, 0.5, 1] as f (f)}
      <line class="grid" x1={pad.l} x2={width - pad.r} y1={y(max * f)} y2={y(max * f)} />
      <text class="ax" x={pad.l - 6} y={y(max * f) + 3} text-anchor="end">{bytes(Math.round(max * f))}</text>
    {/each}
    {#each gcs as g, i (i)}<line class="gc" x1={x(g)} x2={x(g)} y1={pad.t} y2={height - pad.b} />{/each}
    <path class="held-area" d={area(curves.held)} />
    <path class="held" d={path(curves.held)} />
    <path class="reach" d={path(curves.reachable)} />
    <path class="live" d={path(curves.live)} />
    <text class="ax" x={pad.l} y={height - 6}>step 0</text>
    <text class="ax" x={width - pad.r} y={height - 6} text-anchor="end">step {end}</text>
  </svg>
  <p class="legend ui">
    <span><i class="k held"></i> held by the memory manager</span>
    <span><i class="k reach"></i> reachable</span>
    <span><i class="k live"></i> will be used again</span>
    {#if gcs.length}<span><i class="k gc"></i> collection</span>{/if}
  </p>
</div>

<style>
  .mem {
    margin-top: 0.6rem;
  }
  svg {
    display: block;
    overflow: visible;
  }
  .grid {
    stroke: var(--line);
  }
  .ax {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: var(--mute);
  }
  .gc {
    stroke: var(--maybe);
    stroke-dasharray: 2 3;
  }
  .held-area {
    fill: var(--alloc-soft);
  }
  .held {
    fill: none;
    stroke: var(--alloc);
    stroke-width: 2;
  }
  .reach {
    fill: none;
    stroke: var(--violet);
    stroke-width: 1.6;
    stroke-dasharray: 5 3;
  }
  .live {
    fill: none;
    stroke: var(--green);
    stroke-width: 1.6;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    font-size: 0.76rem;
    color: var(--ink-2);
    margin: 0.2rem 0 0;
  }
  .k {
    display: inline-block;
    width: 1.2rem;
    height: 0;
    vertical-align: middle;
    border-top: 2px solid;
    margin-right: 0.3rem;
  }
  .k.held {
    border-color: var(--alloc);
  }
  .k.reach {
    border-top-style: dashed;
    border-color: var(--violet);
  }
  .k.live {
    border-color: var(--green);
  }
  .k.gc {
    border-top-style: dotted;
    border-color: var(--maybe);
  }
</style>

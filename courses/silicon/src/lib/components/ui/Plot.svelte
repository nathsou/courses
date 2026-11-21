<!--
  A line chart drawn at the container's real pixel width (so labels stay legible on a phone), with linear or
  logarithmic axes, series, markers, reference lines and an overlay snippet that receives the scales.
  Colours come from tokens (pass `var(--series-1)` and so on).
-->
<script lang="ts" module>
  export interface Axis {
    min: number;
    max: number;
    log?: boolean;
    label?: string;
    format?: (v: number) => string;
    ticks?: number[];
  }
  export interface Series {
    points: [number, number][];
    color: string;
    label?: string;
    width?: number;
    dash?: string;
    /** Fill down to this y value. */
    fillTo?: number;
    opacity?: number;
  }
  export interface Marker {
    x: number;
    y: number;
    color: string;
    label?: string;
    r?: number;
  }
  export interface RefLine {
    at: number;
    color?: string;
    label?: string;
    dash?: string;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { linearTicks, logTicks, pow10, trimNumber } from '$lib/util/ticks';

  let {
    x,
    y,
    series = [],
    markers = [],
    vlines = [],
    hlines = [],
    height = 240,
    label,
    legend = true,
    left = 54,
    overlay,
  }: {
    x: Axis;
    y: Axis;
    series?: Series[];
    markers?: Marker[];
    vlines?: RefLine[];
    hlines?: RefLine[];
    height?: number;
    label: string;
    legend?: boolean;
    /** Left margin in pixels (room for the y tick labels). */
    left?: number;
    overlay?: Snippet<[{ sx: (v: number) => number; sy: (v: number) => number; w: number; h: number }]>;
  } = $props();

  let width = $state(600);
  const m = $derived({ l: left, r: 14, t: 10, b: 38 });
  const iw = $derived(Math.max(10, width - m.l - m.r));
  const ih = $derived(height - m.t - m.b);

  const tx = (a: Axis, v: number) => (a.log ? Math.log10(Math.max(v, 1e-300)) : v);
  const sx = $derived((v: number) => m.l + ((tx(x, v) - tx(x, x.min)) / (tx(x, x.max) - tx(x, x.min))) * iw);
  const sy = $derived((v: number) => m.t + ih - ((tx(y, v) - tx(y, y.min)) / (tx(y, y.max) - tx(y, y.min))) * ih);
  const clampY = (v: number) => Math.max(m.t - 2, Math.min(m.t + ih + 2, v));

  const xticks = $derived(x.ticks ?? (x.log ? logTicks(x.min, x.max, Math.max(3, Math.floor(iw / 70))) : linearTicks(x.min, x.max, Math.max(3, Math.floor(iw / 80)))));
  const yticks = $derived(y.ticks ?? (y.log ? logTicks(y.min, y.max, 6) : linearTicks(y.min, y.max, 5)));
  const fx = (v: number) => (x.format ? x.format(v) : x.log ? pow10(v) : trimNumber(v));
  const fy = (v: number) => (y.format ? y.format(v) : y.log ? pow10(v) : trimNumber(v));

  function path(s: Series): string {
    let d = '';
    let pen = false;
    for (const [px, py] of s.points) {
      if (!Number.isFinite(py) || (y.log && py <= 0)) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${sx(px).toFixed(1)},${clampY(sy(py)).toFixed(1)}`;
      pen = true;
    }
    return d;
  }
  function area(s: Series): string {
    const pts = s.points.filter(([, py]) => Number.isFinite(py));
    if (!pts.length || s.fillTo === undefined) return '';
    const base = clampY(sy(s.fillTo));
    return `M${sx(pts[0]![0])},${base}` + pts.map(([px, py]) => `L${sx(px).toFixed(1)},${clampY(sy(py)).toFixed(1)}`).join('') + `L${sx(pts.at(-1)![0])},${base}Z`;
  }
  const clipId = `clip-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="plot ui" bind:clientWidth={width} style:--left="{left}px">
  <svg {width} {height} role="img" aria-label={label}>
    <defs><clipPath id={clipId}><rect x={m.l} y={m.t - 2} width={iw} height={ih + 4} /></clipPath></defs>
    {#each yticks as t (t)}
      <line class="grid" x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} />
      <text class="tick" x={m.l - 6} y={sy(t) + 3.5} text-anchor="end">{fy(t)}</text>
    {/each}
    {#each xticks as t (t)}
      <line class="grid" x1={sx(t)} x2={sx(t)} y1={m.t} y2={m.t + ih} />
      <text class="tick" x={sx(t)} y={m.t + ih + 14} text-anchor="middle">{fx(t)}</text>
    {/each}
    <rect class="frame" x={m.l} y={m.t} width={iw} height={ih} />
    <g clip-path="url(#{clipId})">
      {#each hlines as h, i (i)}
        <line x1={m.l} x2={m.l + iw} y1={sy(h.at)} y2={sy(h.at)} stroke={h.color ?? 'var(--ink-3)'} stroke-dasharray={h.dash ?? '4 3'} />
        {#if h.label}<text class="ref" x={m.l + iw - 4} y={sy(h.at) - 4} text-anchor="end" fill={h.color ?? 'var(--ink-3)'}>{h.label}</text>{/if}
      {/each}
      {#each vlines as v, i (i)}
        <line x1={sx(v.at)} x2={sx(v.at)} y1={m.t} y2={m.t + ih} stroke={v.color ?? 'var(--ink-3)'} stroke-dasharray={v.dash ?? '4 3'} />
        {#if v.label}<text class="ref" x={sx(v.at) + 4} y={m.t + 12} fill={v.color ?? 'var(--ink-3)'}>{v.label}</text>{/if}
      {/each}
      {#each series as s, i (i)}
        {#if s.fillTo !== undefined}<path d={area(s)} fill={s.color} opacity={s.opacity ?? 0.15} />{/if}
        <path d={path(s)} fill="none" stroke={s.color} stroke-width={s.width ?? 2} stroke-dasharray={s.dash} stroke-linejoin="round" />
      {/each}
      {#if overlay}{@render overlay({ sx, sy, w: iw, h: ih })}{/if}
      {#each markers as mk, i (i)}
        <circle cx={sx(mk.x)} cy={clampY(sy(mk.y))} r={mk.r ?? 5} fill={mk.color} stroke="var(--surface)" stroke-width="1.5" />
        {#if mk.label}<text class="mk" x={sx(mk.x) + 8} y={clampY(sy(mk.y)) - 7} fill={mk.color}>{mk.label}</text>{/if}
      {/each}
    </g>
    {#if x.label}<text class="axis" x={m.l + iw / 2} y={height - 4} text-anchor="middle">{x.label}</text>{/if}
    {#if y.label}<text class="axis" transform="translate(12 {m.t + ih / 2}) rotate(-90)" text-anchor="middle">{y.label}</text>{/if}
  </svg>
  {#if legend && series.some((s) => s.label)}
    <ul class="legend">
      {#each series.filter((s) => s.label) as s (s.label)}
        <li><span class="sw" style:background={s.color} style:opacity={s.dash ? 0.7 : 1}></span>{s.label}</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .plot {
    width: 100%;
    min-width: 0;
  }
  svg {
    display: block;
    overflow: visible;
  }
  .grid {
    stroke: var(--line);
    stroke-width: 1;
  }
  .frame {
    fill: none;
    stroke: var(--line-strong);
  }
  .tick {
    fill: var(--ink-3);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
  }
  .axis {
    fill: var(--ink-2);
    font-size: 11.5px;
    font-weight: 600;
  }
  .ref,
  .mk {
    font-size: 11px;
    font-weight: 600;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1rem;
    list-style: none;
    margin: 0.25rem 0 0;
    padding: 0 0 0 var(--left);
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .sw {
    width: 0.9rem;
    height: 3px;
    border-radius: 2px;
  }
</style>

<!--
  The prime staircase π(x), with optional smooth curves x/log x, Li(x) and R(x). Zoom buttons rescale
  from x ≤ 30 (every step visible) to x ≤ 10^6 (the steps blur into a curve). Hovering or dragging reads off π(x).
  Used on the home page (compact) and in Chapter 0.
-->
<script lang="ts">
  import { primePiTable } from '$lib/primes/sieve';
  import { Li, riemannR } from '$lib/primes/count';
  import Widget from '$lib/components/ui/Widget.svelte';

  let {
    compact = false,
    ranges = [30, 100, 1000, 10_000, 100_000, 1_000_000],
    initial = 100,
    curves = ['xlogx', 'Li'],
    title = 'The prime staircase',
  }: { compact?: boolean; ranges?: number[]; initial?: number; curves?: ('xlogx' | 'Li' | 'R')[]; title?: string } = $props();

  // svelte-ignore state_referenced_locally
  let max = $state(initial);
  // svelte-ignore state_referenced_locally
  let show = $state<Record<string, boolean>>(Object.fromEntries(curves.map((c) => [c, true])));
  let hoverX = $state<number | null>(null);

  // svelte-ignore state_referenced_locally
  const table = primePiTable(Math.max(...ranges));

  // svelte-ignore state_referenced_locally
  const W = compact ? 460 : 640;
  // svelte-ignore state_referenced_locally
  const H = compact ? 280 : 360;
  // svelte-ignore state_referenced_locally
  const pad = { l: compact ? 40 : 48, r: 14, t: 14, b: 34 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const yMax = $derived(Math.max(table[max]!, Li(max)) * 1.06 + 1);
  const sx = (x: number) => pad.l + (x / max) * iw;
  const sy = (y: number) => pad.t + ih - (y / yMax) * ih;

  /** The staircase as a path: horizontal runs, vertical jumps at primes. Decimated when there are thousands of steps. */
  const stairs = $derived.by(() => {
    let d = `M${sx(0)},${sy(0)}`;
    let last = 0;
    const stride = Math.max(1, Math.floor(max / 4000));
    for (let x = 2; x <= max; x += stride) {
      const v = table[x]!;
      if (v !== last) {
        d += `H${sx(x).toFixed(2)}V${sy(v).toFixed(2)}`;
        last = v;
      }
    }
    return d + `H${sx(max).toFixed(2)}`;
  });

  function curve(f: (x: number) => number, from = 2.2): string {
    const pts: string[] = [];
    const n = 240;
    for (let i = 0; i <= n; i++) {
      const x = from + ((max - from) * i) / n;
      pts.push(`${sx(x).toFixed(2)},${sy(f(x)).toFixed(2)}`);
    }
    return 'M' + pts.join('L');
  }
  const xlogx = $derived(curve((x) => x / Math.log(x), 2.8));
  const li = $derived(curve((x) => Li(x)));
  const rr = $derived(curve((x) => riemannR(x), 1.5));

  const ticks = $derived.by(() => {
    const step = niceStep(max / 5);
    const out: number[] = [];
    for (let v = 0; v <= max; v += step) out.push(v);
    return out;
  });
  const yTicks = $derived.by(() => {
    const step = niceStep(yMax / 4);
    const out: number[] = [];
    for (let v = 0; v <= yMax; v += step) out.push(v);
    return out;
  });
  function niceStep(raw: number): number {
    const p = 10 ** Math.floor(Math.log10(raw));
    const m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  const fmt = (n: number) => (n >= 10_000 ? n.toLocaleString('en-GB') : String(n));

  let svg: SVGSVGElement;
  function move(e: PointerEvent) {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const v = Math.round(((x - pad.l) / iw) * max);
    hoverX = v >= 1 && v <= max ? v : null;
  }
  function key(e: KeyboardEvent) {
    const step = Math.max(1, Math.round(max / 100));
    if (e.key === 'ArrowRight') hoverX = Math.min(max, (hoverX ?? 0) + step);
    else if (e.key === 'ArrowLeft') hoverX = Math.max(1, (hoverX ?? max) - step);
    else return;
    e.preventDefault();
  }
  const readout = $derived(hoverX === null ? null : { x: hoverX, pi: table[hoverX]!, approx: hoverX / Math.log(hoverX), li: Li(hoverX) });
  const label = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1000 ? `${n / 1000}k` : String(n));
</script>

{#snippet chart()}
  <div class="zoom ui" role="group" aria-label="Range of x">
    <span class="zl">x up to</span>
    {#each ranges as r (r)}
      <button class:on={max === r} aria-pressed={max === r} onclick={() => ((max = r), (hoverX = null))}>{label(r)}</button>
    {/each}
  </div>
  <svg
    bind:this={svg}
    viewBox="0 0 {W} {H}"
    class="plot"
    role="slider"
    aria-label="Graph of the prime-counting function up to {fmt(max)}. Use the arrow keys to move along the x axis."
    aria-valuemin={1}
    aria-valuemax={max}
    aria-valuenow={hoverX ?? max}
    aria-valuetext={readout ? `π(${fmt(readout.x)}) = ${fmt(readout.pi)}` : `π(${fmt(max)}) = ${fmt(table[max]!)}`}
    tabindex="0"
    onpointermove={move}
    onpointerleave={() => (hoverX = null)}
    onkeydown={key}
  >
    {#each yTicks as v (v)}
      <line class="ruling" x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} />
      <text class="tick" x={pad.l - 6} y={sy(v) + 4} text-anchor="end">{fmt(v)}</text>
    {/each}
    <line class="margin" x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + ih} />
    {#each ticks as v (v)}
      <text class="tick" x={sx(v)} y={H - pad.b + 16} text-anchor="middle">{fmt(v)}</text>
    {/each}
    <text class="axis-label" x={W - pad.r} y={H - 4} text-anchor="end">x</text>
    {#if show.xlogx}<path class="c xlogx" d={xlogx} />{/if}
    {#if show.Li}<path class="c li" d={li} />{/if}
    {#if show.R}<path class="c r" d={rr} />{/if}
    <path class="stairs" d={stairs} />
    {#if max <= 100}
      {#each Array.from({ length: max - 1 }, (_, i) => i + 2).filter((x) => table[x]! > table[x - 1]!) as p (p)}
        <circle class="dot" cx={sx(p)} cy={sy(table[p]!)} r={max <= 30 ? 3.2 : 2} />
      {/each}
    {/if}
    {#if readout}
      <line class="cursor" x1={sx(readout.x)} x2={sx(readout.x)} y1={pad.t} y2={pad.t + ih} />
      <circle class="cursor-dot" cx={sx(readout.x)} cy={sy(readout.pi)} r="4" />
    {/if}
  </svg>
  <div class="legend ui">
    <span class="k stairs-k">π(x), the number of primes ≤ x</span>
    {#each curves as c (c)}
      <label class="k {c}-k"><input type="checkbox" bind:checked={show[c]} /> {c === 'xlogx' ? 'x / log x' : c === 'Li' ? 'Li(x)' : 'R(x)'}</label>
    {/each}
  </div>
  <p class="readout ui" aria-live="polite">
    {#if readout}
      π({fmt(readout.x)}) = <strong>{fmt(readout.pi)}</strong> · x/log x ≈ {readout.approx.toFixed(1)} · Li(x) ≈ {readout.li.toFixed(1)}
    {:else}
      π({fmt(max)}) = <strong>{fmt(table[max]!)}</strong>. Point at the graph (or focus it and use ← →) to read off values.
    {/if}
  </p>
{/snippet}

{#if compact}
  <div class="compact">{@render chart()}</div>
{:else}
  <Widget {title} subtitle="Every prime adds one step. Zoom out and the staircase turns into a smooth curve." onreset={() => ((max = initial), (hoverX = null))}>
    {@render chart()}
  </Widget>
{/if}

<style>
  .zoom {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
  }
  .zl {
    color: var(--mute);
    margin-right: 0.2rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .zoom button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: 999px;
    padding: 0.15rem 0.65rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    cursor: pointer;
  }
  .zoom button.on {
    background: var(--fg);
    color: var(--bg);
    border-color: var(--fg);
  }
  .plot {
    display: block;
    width: 100%;
    height: auto;
    touch-action: pan-y;
    font-family: var(--font-mono);
  }
  .plot:focus-visible {
    outline: 2px solid var(--focus);
  }
  .ruling {
    stroke: var(--ruling);
    stroke-width: 1;
  }
  .margin {
    stroke: var(--margin-rule);
    stroke-width: 1.5;
  }
  .tick {
    font-size: 11px;
    fill: var(--mute);
  }
  .axis-label {
    font-size: 12px;
    font-style: italic;
    fill: var(--mute);
  }
  .stairs {
    fill: none;
    stroke: var(--prime);
    stroke-width: 2;
    stroke-linejoin: miter;
  }
  .dot {
    fill: var(--prime);
  }
  .c {
    fill: none;
    stroke-width: 1.6;
  }
  .xlogx {
    stroke: var(--series-1);
    stroke-dasharray: 5 4;
  }
  .li {
    stroke: var(--fg);
    stroke-dasharray: 1.5 3;
    stroke-width: 2;
  }
  .r {
    stroke: var(--series-4);
  }
  .cursor {
    stroke: var(--rule-strong);
    stroke-dasharray: 2 3;
  }
  .cursor-dot {
    fill: var(--bg);
    stroke: var(--prime);
    stroke-width: 2;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin-top: 0.3rem;
  }
  .k {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .k::before {
    content: '';
    width: 1.4rem;
    border-top: 2px solid var(--prime);
  }
  .xlogx-k::before {
    border-top: 2px dashed var(--series-1);
  }
  .Li-k::before {
    border-top: 2px dotted var(--fg);
  }
  .R-k::before {
    border-top: 2px solid var(--series-4);
  }
  .k input {
    margin: 0;
  }
  .readout {
    margin: 0.4rem 0 0;
    font-size: 0.84rem;
    color: var(--ink-2);
    min-height: 1.3em;
    font-variant-numeric: tabular-nums;
  }
  .readout strong {
    color: var(--accent);
  }
</style>

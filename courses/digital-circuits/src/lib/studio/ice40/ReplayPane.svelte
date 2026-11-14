<!--
  Placement and routing as synth ran them (its trace, `run` with `trace: true`): scrub through the annealer's
  temperature steps and watch the logic cells settle on the die, with the cost and the temperature falling
  beside it; then the router's iterations and the routing nodes still shared by two nets after each.
-->
<script lang="ts">
  import type { Chip, FlowTrace } from '$lib/synth/api';
  import ChipView from './ChipView.svelte';

  let { chip, trace, mode = 'place' }: { chip: Chip; trace: FlowTrace; mode?: 'place' | 'route' } = $props();

  const snaps = $derived(trace.place.filter((s) => s.xy));
  let k = $state(0);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;
  $effect(() => {
    void snaps;
    k = 0;
  });
  function play() {
    playing = !playing;
    clearInterval(timer);
    if (!playing) return;
    if (k >= snaps.length - 1) k = 0;
    timer = setInterval(() => {
      if (k >= snaps.length - 1) {
        playing = false;
        clearInterval(timer);
      } else k++;
    }, 120);
  }
  $effect(() => () => clearInterval(timer));
  const snap = $derived(snaps[Math.min(k, snaps.length - 1)]);
  const done = $derived(k >= snaps.length - 1);

  // The cost and temperature curves, over the temperature steps.
  const W = 300;
  const H = 90;
  const curve = (vals: number[], log = false) => {
    const f = (v: number) => (log ? Math.log10(Math.max(v, 1e-9)) : v);
    const ys = vals.map(f);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    return ys.map((y, i) => `${i === 0 ? 'M' : 'L'}${((i / Math.max(1, ys.length - 1)) * W).toFixed(1)},${(H - 4 - ((y - lo) / Math.max(1e-9, hi - lo)) * (H - 8)).toFixed(1)}`).join('');
  };
  const costPath = $derived(curve(trace.place.map((s) => s.cost)));
  const tempPath = $derived(curve(trace.place.map((s) => s.temperature), true));
  const at = $derived(snap ? trace.place.indexOf(snap) : 0);
  const maxOver = $derived(Math.max(1, ...trace.route.map((r) => r.overused)));
</script>

<div class="replay ui">
  {#if mode === 'place'}
    {#if snaps.length}
      <div class="bar">
        <button type="button" class="btn primary" onclick={play} aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button>
        <label class="scrub"><span class="sr">Temperature step</span><input type="range" min="0" max={snaps.length - 1} bind:value={k} aria-valuetext="step {snap?.step} of {trace.place.at(-1)?.step}" /></label>
        <span class="now">step <b>{snap?.step}</b> of {trace.place.at(-1)?.step}: {(100 * (snap?.accepted ?? 0)).toFixed(0)}% of moves accepted, moves of up to {snap?.range.toFixed(0)} tiles</span>
      </div>
      <ChipView {chip} positions={snap?.xy} routes={done} label="The placement at step {snap?.step}" />
      <svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="The cost (wirelength and timing) and the temperature at each step: both fall as the annealer cools.">
        <path d={tempPath} class="temp" />
        <path d={costPath} class="cost" />
        <line x1={(at / Math.max(1, trace.place.length - 1)) * W} x2={(at / Math.max(1, trace.place.length - 1)) * W} y1="0" y2={H} class="cursor" />
      </svg>
      <p class="legend"><span class="c">cost</span> · <span class="t">temperature (log scale)</span>, at each of the {trace.place.length} temperature steps</p>
    {:else}
      <p>There was nothing to place.</p>
    {/if}
  {:else}
    <ChipView {chip} label="The routed design" />
    <div class="iters" role="img" aria-label="Routing nodes shared by more than one net after each iteration: {trace.route.map((r) => r.overused).join(', ')}">
      {#each trace.route as r (r.iteration)}
        <div class="it"><span class="bar-fill" style:height="{(r.overused / maxOver) * 100}%"></span><small>{r.iteration + 1}</small><b>{r.overused}</b></div>
      {/each}
    </div>
    <p class="legend">Routing nodes used by more than one net after each iteration of the router ({trace.route.length} in all). The design is routed when none is.</p>
  {/if}
</div>

<style>
  .replay {
    display: grid;
    gap: 0.5rem;
    font-size: 0.82rem;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .btn {
    height: 1.9rem;
    padding: 0 0.75rem;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: var(--on-accent);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .scrub input {
    width: 12rem;
  }
  .now {
    color: var(--ink-2);
  }
  b {
    font-family: var(--font-mono);
  }
  .chart {
    width: 100%;
    max-width: 30rem;
    height: auto;
    background: var(--pn);
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .cost {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
  .temp {
    fill: none;
    stroke: var(--sig-current);
    stroke-width: 1.2;
    stroke-dasharray: 4 3;
  }
  .cursor {
    stroke: var(--fg);
    stroke-width: 1;
  }
  .legend {
    margin: 0;
    color: var(--mute);
    font-size: 0.76rem;
  }
  .legend .c {
    color: var(--accent);
  }
  .legend .t {
    color: var(--sig-current);
  }
  .iters {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 7rem;
    padding: 0.4rem;
    background: var(--pn);
    border: 1px solid var(--line);
    border-radius: 6px;
    overflow-x: auto;
  }
  .it {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: end;
    min-width: 1.6rem;
    height: 100%;
  }
  .bar-fill {
    width: 1.1rem;
    background: var(--bad);
    border-radius: 2px 2px 0 0;
    min-height: 1px;
  }
  .it small {
    color: var(--mute);
  }
  .it b {
    position: absolute;
    top: 0;
    font-size: 0.68rem;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>

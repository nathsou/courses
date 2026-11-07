<!--
  Computing with water, as the MONIAC did: the level in a tank is the integral of inflow minus outflow. With
  an outflow that grows with the level (water drains faster from a fuller tank), the level settles where
  outflow equals inflow.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { onDestroy, onMount } from 'svelte';

  let inflow = $state(6); // litres per minute
  let k = $state(2); // outflow = k × level
  let level = $state(0);
  let history: number[] = $state([0]);
  let raf = 0;
  let last = 0;
  let playing = $state(true);
  function frame(t: number) {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (playing) {
      level = Math.max(0, level + (inflow - k * level) * dt * 0.6);
      history = [...history.slice(-299), level];
    }
    raf = requestAnimationFrame(frame);
  }
  onMount(() => {
    raf = requestAnimationFrame(frame);
  });
  onDestroy(() => typeof cancelAnimationFrame !== 'undefined' && cancelAnimationFrame(raf));
  const H = 10; // tank height in level units
  const eq = $derived(inflow / k);
</script>

<Widget title="A tank that integrates" subtitle="The level rises by inflow − outflow. The outflow grows with the level, so the level settles at inflow ÷ k. Change the tap or the drain and watch it find its new balance." onreset={() => { level = 0; history = [0]; }}>
  {#snippet controls()}
    <label>Inflow <input type="range" min="0" max="12" step="0.1" bind:value={inflow} /> <span class="num">{inflow.toFixed(1)} L/min</span></label>
    <label>Drain k <input type="range" min="0.5" max="4" step="0.1" bind:value={k} /> <span class="num">{k.toFixed(1)}</span></label>
    <button onclick={() => (playing = !playing)}>{playing ? 'Pause' : 'Run'}</button>
  {/snippet}
  <div class="wrap">
    <svg viewBox="0 0 120 170" class="tank" role="img" aria-label="A tank filling from a tap and draining from the bottom; the level is {level.toFixed(2)}">
      <rect x="30" y="20" width="60" height="130" class="glass" />
      <rect x="31" y={150 - Math.min(H, level) * 13} width="58" height={Math.min(H, level) * 13} class="water" />
      <line x1="26" y1={150 - eq * 13} x2="94" y2={150 - eq * 13} class="eq" />
      <path d="M10 8 H 52 V 20" class="pipe" />
      {#if inflow > 0}<line x1="52" y1="20" x2="52" y2={150 - Math.min(H, level) * 13} class="stream" style:stroke-width={1 + inflow / 4} />{/if}
      <path d="M60 150 V 162 H 112" class="pipe" />
      <text x="96" y={153 - eq * 13} class="lab">balance</text>
    </svg>
    <div>
      <svg viewBox="0 0 300 120" class="plot" role="img" aria-label="Level over time">
        <line x1="5" y1={110 - eq * 10} x2="295" y2={110 - eq * 10} class="eq" />
        <polyline points={history.map((h, i) => `${5 + i},${110 - Math.min(10.5, h) * 10}`).join(' ')} class="curve" />
      </svg>
      <p class="ro ui">Level <strong class="num">{level.toFixed(2)}</strong> · outflow <strong class="num">{(k * level).toFixed(2)}</strong> L/min · balance at <strong class="num">{eq.toFixed(2)}</strong></p>
    </div>
  </div>
</Widget>

<style>
  label {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.84rem;
  }
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.28rem 0.7rem;
    min-height: 2rem;
    cursor: pointer;
    color: var(--ink);
  }
  .wrap {
    display: grid;
    grid-template-columns: 8rem 1fr;
    gap: 1rem;
    align-items: center;
  }
  .tank,
  .plot {
    width: 100%;
    background: var(--scene-bg);
    border-radius: var(--radius-sm);
  }
  .glass {
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }
  .water {
    fill: color-mix(in srgb, var(--fx-blue) 55%, transparent);
  }
  .stream {
    stroke: color-mix(in srgb, var(--fx-blue) 70%, transparent);
  }
  .pipe {
    fill: none;
    stroke: var(--ink-3);
    stroke-width: 4;
  }
  .eq {
    stroke: var(--fx-red);
    stroke-dasharray: 4 3;
  }
  .lab {
    font-size: 8px;
    fill: var(--fx-red);
  }
  .curve {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
  .ro {
    font-size: 0.84rem;
    margin: 0.4rem 0 0;
  }
</style>

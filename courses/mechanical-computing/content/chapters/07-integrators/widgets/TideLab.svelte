<!--
  Kelvin's tide predictor, in principle: each constituent of the tide is a crank turning at its own period,
  moving a pulley up and down; one wire over all the pulleys adds their motions, and a pen on its end draws
  the predicted tide. Switch constituents on and off; set their amplitudes.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { CONSTITUENTS, tide } from '$lib/mech/integrators';

  let { days = 30 }: { days?: number } = $props();
  // Amplitudes in metres for an imaginary port with a large semi-diurnal tide.
  let amp: Record<string, number> = $state({ M2: 1.6, S2: 0.55, N2: 0.32, K1: 0.18, O1: 0.14 });
  let on: Record<string, boolean> = $state({ M2: true, S2: true, N2: false, K1: false, O1: false });
  let t = $state(0); // hours, cursor
  const phase = { M2: 0, S2: 0, N2: 1.2, K1: 0.4, O1: 2.1 };
  const active = $derived(Object.fromEntries(CONSTITUENTS.map((c) => [c.id, on[c.id] ? amp[c.id]! : 0])));
  const W = 620, H = 150, span = $derived(days * 24);
  const X = (h: number) => 10 + (h / span) * (W - 20);
  const Y = (z: number) => H / 2 - z * 26;
  const curve = $derived(Array.from({ length: 1200 }, (_, i) => {
    const h = (i / 1199) * span;
    return `${X(h).toFixed(1)},${Y(tide(h, active, phase)).toFixed(1)}`;
  }).join(' '));
  // The pulleys at the cursor time.
  const pulleys = $derived(CONSTITUENTS.filter((c) => on[c.id]).map((c) => ({ id: c.id, z: amp[c.id]! * Math.cos((2 * Math.PI * t) / c.period - (phase[c.id as keyof typeof phase] ?? 0)) })));
  const total = $derived(tide(t, active, phase));
</script>

<Widget title="A tide predictor" subtitle="Each constituent is a crank turning with its own period; the wire over the pulleys adds them. With M2 and S2 together, watch the spring and neap tides appear as the two drift in and out of step.">
  {#snippet controls()}
    {#each CONSTITUENTS as c (c.id)}
      <label class="c" title={c.what}><input type="checkbox" bind:checked={on[c.id]} /> {c.id}
        <input type="range" min="0" max="2" step="0.01" bind:value={amp[c.id]} disabled={!on[c.id]} aria-label="{c.id} amplitude" /></label>
    {/each}
  {/snippet}
  <div class="scroll">
    <svg viewBox="0 0 {W} {H}" class="plot" role="img" aria-label="Predicted tide over {days} days">
      <line x1="10" y1={H / 2} x2={W - 10} y2={H / 2} class="axis" />
      {#each Array.from({ length: days + 1 }) as _, d (d)}{#if d % 5 === 0}<line x1={X(d * 24)} y1={H - 12} x2={X(d * 24)} y2={H - 6} class="axis" /><text x={X(d * 24)} y={H - 1} text-anchor="middle" class="lab">{d} d</text>{/if}{/each}
      <polyline points={curve} class="curve" />
      <line x1={X(t)} y1="4" x2={X(t)} y2={H - 14} class="cursor" />
    </svg>
  </div>
  <label class="time">Time <input type="range" min="0" max={span} step="0.25" bind:value={t} /> <span class="num">day {(t / 24).toFixed(2)}</span></label>
  <div class="pulleys" aria-label="The pulleys at this moment">
    {#each pulleys as p (p.id)}<div class="pu"><span class="bar" style:transform="translateY({-p.z * 18}px)"></span><span class="id">{p.id}</span><span class="num">{p.z >= 0 ? '+' : '−'}{Math.abs(p.z).toFixed(2)}</span></div>{/each}
    <div class="pu sum"><span class="bar" style:transform="translateY({-total * 9}px)"></span><span class="id">pen</span><span class="num">{total >= 0 ? '+' : '−'}{Math.abs(total).toFixed(2)} m</span></div>
  </div>
</Widget>

<style>
  .c {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    font-size: 0.82rem;
    font-family: var(--font-mono);
  }
  .c input[type='range'] {
    width: 5rem;
  }
  .scroll {
    overflow-x: auto;
  }
  .plot {
    width: 100%;
    min-width: 30rem;
    background: var(--scene-bg);
    border-radius: var(--radius-sm);
  }
  .axis {
    stroke: var(--line-strong);
  }
  .curve {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.4;
  }
  .cursor {
    stroke: var(--fx-red);
  }
  .lab {
    font-size: 9px;
    fill: var(--ink-3);
  }
  .time {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.84rem;
    margin: 0.4rem 0;
  }
  .time input {
    flex: 1;
  }
  .pulleys {
    display: flex;
    gap: 0.9rem;
    align-items: flex-end;
    font-size: 0.76rem;
    padding-top: 2rem;
  }
  .pu {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }
  .bar {
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    border: 3px solid var(--brass);
    background: var(--surface);
  }
  .sum .bar {
    border-radius: 3px;
    border-color: var(--fx-red);
  }
  .id {
    font-family: var(--font-mono);
    font-weight: 600;
  }
</style>

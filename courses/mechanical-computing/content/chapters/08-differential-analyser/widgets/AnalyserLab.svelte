<!--
  A differential analyser set up with two integrators in a loop. The motor turns the independent-variable
  shaft along the bottom; each integrator's disc turns with it; each wheel is set by a shaft from the other
  integrator's output (through a sign-reversing gear, and an adder where needed); the output table draws the
  answer. Choose a set-up; add slip to see analog error grow.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { onDestroy } from 'svelte';
  import { SETUPS, solve, type SetupId } from '$lib/mech/da';

  let { setup: initial = 'oscillator' }: { setup?: SetupId } = $props();
  // svelte-ignore state_referenced_locally
  let id: SetupId = $state(initial);
  // svelte-ignore state_referenced_locally
  let param = $state(SETUPS[initial].param?.value ?? 0);
  let slip = $state(0);
  let progress = $state(0);
  let raf = 0;
  const T = $derived(id === 'orbit' ? 2 * Math.PI * 3 : 6 * Math.PI);
  const data = $derived(solve(SETUPS[id].make(param), T, 0.004, slip, 5));
  const ideal = $derived(slip ? solve(SETUPS[id].make(param), T, 0.004, 0, 5) : null);
  const shown = $derived(data.slice(0, Math.max(2, Math.floor(progress * data.length))));
  const now = $derived(shown.at(-1)!);

  function run() {
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const step = (t: number) => {
      progress = Math.min(1, (t - t0) / 5000);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  onDestroy(() => typeof cancelAnimationFrame !== 'undefined' && cancelAnimationFrame(raf));
  function choose() {
    param = SETUPS[id].param?.value ?? 0;
    progress = 0;
  }

  // Output table: time plot for oscillators, polar plot for the orbit.
  const PW = 300, PH = 170;
  function pathOf(rows: number[][]): string {
    if (id === 'orbit') {
      return rows.map(([th, , u], i) => {
        const r = 1 / u!;
        const x = PW / 2 + 55 * r * Math.cos(th!), y = PH / 2 - 55 * r * Math.sin(th!);
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    }
    return rows.map(([t, , y], i) => `${i ? 'L' : 'M'}${(10 + (t! / T) * (PW - 20)).toFixed(1)},${(PH / 2 - y! * 60).toFixed(1)}`).join(' ');
  }
  // Shaft "angles" for the schematic: each shaft's mark turns with its value.
  const mark = (v: number) => (v * 90) % 360;
  const names = $derived(SETUPS[id].names);
</script>

<Widget title="A differential analyser" subtitle="Two integrators in a loop. The motor turns the bottom shaft (the independent variable); every disc turns with it; each wheel is steered by the other integrator’s output. Press Run." onreset={() => { cancelAnimationFrame(raf); progress = 0; }}>
  {#snippet controls()}
    <label>Set-up <select bind:value={id} onchange={choose}>{#each Object.entries(SETUPS) as [k, v] (k)}<option value={k}>{v.label}</option>{/each}</select></label>
    {#if SETUPS[id].param}{@const p = SETUPS[id].param!}<label>{p.label} <input type="range" min={p.min} max={p.max} step="0.005" bind:value={param} oninput={() => (progress = 1)} /> <span class="num">{param.toFixed(3)}</span></label>{/if}
    <label>slip per integrator <input type="range" min="0" max="0.02" step="0.001" bind:value={slip} oninput={() => (progress = 1)} /> <span class="num">{(slip * 100).toFixed(1)}%</span></label>
    <button class="go" onclick={run}>Run</button>
  {/snippet}
  <div class="grid">
    <svg viewBox="0 0 340 200" class="schem" role="img" aria-label="Schematic: a motor, two integrators, a sign-reversing gear and the output table, joined by shafts">
      <!-- independent variable shaft -->
      <line x1="10" y1="180" x2="330" y2="180" class="shaft" />
      <g transform="translate(20 180)"><circle r="10" class="motor" /><text y="4" text-anchor="middle" class="t">M</text></g>
      <text x="40" y="196" class="lab">{id === 'orbit' ? 'θ' : 't'} (motor)</text>
      {#each [0, 1] as k (k)}
        {@const x = 80 + k * 120}
        <g transform="translate({x} 100)">
          <rect x="-40" y="-40" width="80" height="70" rx="5" class="int" />
          <text y="-46" text-anchor="middle" class="lab">integrator {k === 0 ? 'A' : 'B'}</text>
          <ellipse cx="0" cy="10" rx="30" ry="9" class="disc" />
          <line x1="0" y1="30" x2="0" y2="80" class="shaft" />
          <g transform="translate({Math.max(-26, Math.min(26, (k === 0 ? (id === 'orbit' ? 1 - (now[2] ?? 0) : -(now[2] ?? 0) - (id === 'damped' ? param * (now[1] ?? 0) : 0)) : (now[1] ?? 0)) * 22))} 4)"><rect x="-3" y="-10" width="6" height="16" rx="2" class="wheel" /></g>
          <text y="-24" text-anchor="middle" class="t">∫</text>
          <text x="5" y="62" class="lab">out: {names[k]}</text>
          <g transform="translate(40 -10)"><circle r="7" class="dial" /><line x1="0" y1="0" x2="0" y2="-6" transform="rotate({mark(now[k + 1] ?? 0)})" class="hand" /></g>
        </g>
      {/each}
      <!-- A's output feeds B's wheel; B's output, reversed (and with the constant for the orbit), feeds A's wheel -->
      <path d="M127 90 H 160 V 100" class="wire" />
      <path d="M247 90 H 290 V 30 H 80 V 60" class="wire" />
      <g transform="translate(250 30)"><rect x="-22" y="-11" width="44" height="22" rx="3" class="gear" /><text y="4" text-anchor="middle" class="t">{id === 'orbit' ? '1 − u' : id === 'damped' ? '−y − ky′' : '× −1'}</text></g>
      <path d="M290 90 H 318 V 120" class="wire" /><rect x="304" y="120" width="28" height="22" rx="3" class="table" /><text x="318" y="135" text-anchor="middle" class="t">✎</text>
    </svg>
    <svg viewBox="0 0 {PW} {PH}" class="plot" role="img" aria-label="The output table: {id === 'orbit' ? 'the orbit, drawn round the Earth at its focus' : 'y against time'}">
      {#if id === 'orbit'}
        <circle cx={PW / 2} cy={PH / 2} r="5" class="earth" />
      {:else}
        <line x1="10" y1={PH / 2} x2={PW - 10} y2={PH / 2} class="axis" />
      {/if}
      {#if ideal}<path d={pathOf(ideal.slice(0, shown.length))} class="ideal" />{/if}
      <path d={pathOf(shown)} class="curve" />
    </svg>
  </div>
  <p class="ro ui">{names[0]} = <span class="num">{(now[1] ?? 0).toFixed(3)}</span> · {names[1]} = <span class="num">{(now[2] ?? 0).toFixed(3)}</span>{#if id === 'orbit'} · r = 1/u = <span class="num">{(1 / (now[2] ?? 1)).toFixed(3)}</span>{/if}{#if slip} · <span class="warn">dashed: what a perfect machine would draw</span>{/if}</p>
</Widget>

<style>
  label {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.84rem;
  }
  select,
  button {
    font: inherit;
    font-size: 0.84rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.28rem 0.6rem;
    min-height: 2rem;
    color: var(--ink);
    cursor: pointer;
  }
  .go {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.6rem;
  }
  svg {
    width: 100%;
    background: var(--scene-bg);
    border-radius: var(--radius-sm);
  }
  .shaft {
    stroke: var(--ink-3);
    stroke-width: 3;
  }
  .motor {
    fill: var(--fx-red);
  }
  .int {
    fill: var(--surface);
    stroke: var(--line-strong);
  }
  .disc {
    fill: color-mix(in srgb, var(--ink-3) 25%, var(--surface));
    stroke: var(--ink-3);
  }
  .wheel {
    fill: var(--brass);
    stroke: var(--ink);
  }
  .dial {
    fill: var(--page);
    stroke: var(--ink-2);
  }
  .hand {
    stroke: var(--fx-red);
    stroke-width: 1.5;
  }
  .wire {
    fill: none;
    stroke: var(--brass);
    stroke-width: 2.5;
  }
  .gear,
  .table {
    fill: var(--page);
    stroke: var(--brass);
    stroke-width: 1.5;
  }
  .t {
    font-family: var(--font-mono);
    font-size: 9px;
    fill: var(--ink);
  }
  .lab {
    font-size: 8.5px;
    fill: var(--ink-3);
  }
  .axis {
    stroke: var(--line-strong);
  }
  .curve {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
  .ideal {
    fill: none;
    stroke: var(--ink-3);
    stroke-width: 1;
    stroke-dasharray: 4 3;
  }
  .earth {
    fill: var(--fx-blue);
  }
  .ro {
    font-size: 0.84rem;
    margin: 0.4rem 0 0;
  }
  .warn {
    color: var(--ink-3);
  }
</style>

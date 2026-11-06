<!--
  Two ways to carry, side by side: wheels geared directly to each other (every wheel in a long carry turns at
  once, and the stylus must drive them all), and Pascal's sautoirs (each wheel's carry is paid for in advance
  by lifting a weight; the carries fall one after another). An illustrative model: friction per wheel f, and a
  gear efficiency of 90% at every mesh.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { onDestroy } from 'svelte';

  let n = $state(6);
  let nines = $state(5);
  let t = $state(-1); // animation time in "steps"; −1 = idle
  let raf = 0;
  const EFF = 0.9;
  const f0 = 1;
  const LIFT = 0.25; // extra effort, per step, to lift the sautoir a little

  // Geared: during the single step, wheels 0..nines all turn together.
  const gearedPeak = $derived(Array.from({ length: Math.min(nines, n - 1) + 1 }, (_, i) => f0 / EFF ** i).reduce((a, b) => a + b, 0));
  const sautoirPeak = f0 + LIFT;
  const steps = $derived(Math.min(nines, n - 1) + 1); // units step, then one fall per carried wheel

  function go() {
    cancelAnimationFrame(raf);
    const start = performance.now();
    const dur = 650; // ms per step
    const total = steps * dur;
    const tickf = (now: number) => {
      const e = now - start;
      t = Math.min(e / dur, steps);
      if (e < total + 400) raf = requestAnimationFrame(tickf);
      else t = -1;
    };
    raf = requestAnimationFrame(tickf);
  }
  onDestroy(() => typeof cancelAnimationFrame !== 'undefined' && cancelAnimationFrame(raf));

  // Wheel angle (in digits) for each scheme at time t.
  function gearedTurn(k: number): number {
    if (t < 0) return 0;
    const p = Math.min(1, t);
    return k <= Math.min(nines, n - 1) ? p : 0;
  }
  function sautoirTurn(k: number): number {
    if (t < 0) return 0;
    if (k > Math.min(nines, n - 1)) return 0;
    return Math.max(0, Math.min(1, t - k));
  }
  const digitsBefore = $derived(Array.from({ length: n }, (_, k) => (k < nines ? 9 : k === nines ? 0 : 0)));
  const gearedNow = $derived(t < 0 ? 0 : t < 1 ? gearedPeak : 0);
  const sautoirNow = $derived(t < 0 ? 0 : t < 1 ? sautoirPeak : 0);
  const shown = (k: number, turn: number) => (turn >= 1 ? (digitsBefore[k]! + 1) % 10 : digitsBefore[k]!);
  const R = 15;
</script>

<Widget title="Two ways to carry" subtitle="Add 1 to a row of 9s. Geared wheels must all be driven at once by the stylus; Pascal’s sautoirs fall in turn, each paid for in advance." onreset={() => { cancelAnimationFrame(raf); t = -1; }}>
  {#snippet controls()}
    <label>Wheels <input type="range" min="3" max="10" bind:value={n} oninput={() => (nines = Math.min(nines, n - 1))} /> <span class="num">{n}</span></label>
    <label>Nines to carry through <input type="range" min="1" max={n - 1} bind:value={nines} /> <span class="num">{nines}</span></label>
    <button onclick={go}>Add 1</button>
  {/snippet}
  {#each [{ name: 'Geared carry', sub: 'one tooth on each wheel turns the next', turn: gearedTurn, now: gearedNow, peak: gearedPeak }, { name: 'Gravity carry (sautoirs)', sub: 'each wheel lifts a weight that later falls on the next', turn: sautoirTurn, now: sautoirNow, peak: sautoirPeak }] as row (row.name)}
    <div class="scheme">
      <div class="head"><strong>{row.name}</strong> <span>{row.sub}</span></div>
      <svg viewBox="0 0 {n * 40 + 10} 44" role="img" aria-label="{row.name}: wheels from the highest place on the left to the units on the right">
        {#each Array.from({ length: n }) as _, i (i)}
          {@const k = n - 1 - i}
          {@const turn = row.turn(k)}
          {@const moving = turn > 0 && turn < 1}
          <g transform="translate({i * 40 + 25} 22)">
            <circle r={R} class="wheel" class:moving />
            <g transform="rotate({turn * 36})">
              {#each Array.from({ length: 10 }) as _, s (s)}<line x1="0" y1={-R + 1} x2="0" y2={-R + 4} transform="rotate({s * 36})" class="tick" />{/each}
            </g>
            <text dy="5" text-anchor="middle" class="digit">{shown(k, turn)}</text>
          </g>
        {/each}
      </svg>
      <div class="meter" aria-label="Effort at the stylus">
        <span class="lab">effort at the stylus</span>
        <span class="bar"><span style:width="{(row.now / gearedPeak) * 100}%"></span><span class="peak" style:left="{(row.peak / gearedPeak) * 100}%"></span></span>
        <span class="num">{row.now ? row.now.toFixed(1) : '—'}</span>
      </div>
    </div>
  {/each}
  <p class="note">Peak effort: geared {gearedPeak.toFixed(1)} units against {sautoirPeak.toFixed(2)} for the sautoirs. The geared carry is over in one step; the sautoirs take {steps} steps, one after another. Units of effort: the friction of one wheel, with 90% efficiency at every mesh (an illustrative model, not a measurement).</p>
</Widget>

<style>
  label {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.84rem;
  }
  button {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 2rem;
  }
  .scheme {
    margin-bottom: 0.9rem;
  }
  .head {
    font-size: 0.86rem;
  }
  .head span {
    color: var(--ink-3);
    font-size: 0.8rem;
  }
  svg {
    width: 100%;
    max-width: 30rem;
    display: block;
    margin: 0.2rem 0;
  }
  .wheel {
    fill: var(--surface);
    stroke: var(--brass);
    stroke-width: 2;
  }
  .wheel.moving {
    fill: var(--brass-soft);
  }
  .tick {
    stroke: var(--brass);
    stroke-width: 1.2;
  }
  .digit {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    fill: var(--ink);
  }
  .meter {
    display: grid;
    grid-template-columns: 8.5rem 1fr 2.5rem;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.78rem;
    max-width: 30rem;
  }
  .lab {
    color: var(--ink-3);
  }
  .bar {
    position: relative;
    height: 0.6rem;
    background: var(--surface-2);
    border-radius: 999px;
  }
  .bar > span:first-child {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--fx-red);
    border-radius: 999px;
    transition: width 120ms;
  }
  .peak {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    background: var(--ink-2);
  }
  .note {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.3rem 0 0;
  }
</style>

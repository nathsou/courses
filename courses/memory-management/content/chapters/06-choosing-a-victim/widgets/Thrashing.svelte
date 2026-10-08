<!--
  Thrashing: n processes share 64 frames round-robin, each looping over its own working set of W pages, with
  global LRU replacement. A fault costs as much time as 100 ordinary accesses. Useful work collapses once the
  working sets no longer fit together.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  const FRAMES = 64;
  const PENALTY = 100;
  let ws = $state(12);

  function useful(n: number, w: number): number {
    // Simulate global LRU over n round-robin processes.
    const resident = new Map<string, number>();
    let clock = 0;
    let faults = 0;
    let accesses = 0;
    for (let slice = 0; slice < 60; slice++) {
      const p = slice % n;
      for (let i = 0; i < 40; i++) {
        const key = `${p}:${(slice * 40 + i) % w}`;
        accesses++;
        clock++;
        if (!resident.has(key)) {
          faults++;
          if (resident.size >= FRAMES) {
            let oldK = '';
            let oldT = Infinity;
            for (const [k, tt] of resident) if (tt < oldT) (oldT = tt), (oldK = k);
            resident.delete(oldK);
          }
        }
        resident.set(key, clock);
      }
    }
    return accesses / (accesses + faults * PENALTY);
  }
  const N = Array.from({ length: 12 }, (_, i) => i + 1);
  const curve = $derived(N.map((n) => useful(n, ws)));
  const W = 360,
    H = 130;
  const x = (n: number) => 30 + ((n - 1) * (W - 40)) / 11;
  const y = (u: number) => 10 + (1 - u) * (H - 30);
  const cliff = $derived(Math.floor(FRAMES / ws));
</script>

<Widget title="The thrashing cliff" kind="Interactive" n="6.2" caption="Each process loops over its own working set. While all the working sets fit in the 64 frames, adding processes costs nothing. One process too many, and every process faults on almost every time slice: the machine spends its time moving pages, not running programs.">
  <label class="ui cfg">Working set per process: <strong>{ws} pages</strong> <input type="range" min="4" max="32" bind:value={ws} /></label>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label="Fraction of time doing useful work against the number of processes">
    <line x1="30" x2={W - 10} y1={y(0)} y2={y(0)} class="ax" />
    <text x="2" y={y(1) + 3} class="t">100%</text>
    <text x="10" y={y(0) + 3} class="t">0%</text>
    {#each N as n (n)}<text x={x(n)} y={H - 4} class="t" text-anchor="middle">{n}</text>{/each}
    {#if cliff >= 1 && cliff <= 12}<line x1={x(cliff + 0.5)} x2={x(cliff + 0.5)} y1="8" y2={y(0)} class="cliff" /><text x={x(cliff + 0.5) + 3} y="16" class="t">64 frames ÷ {ws}</text>{/if}
    <polyline points={curve.map((u, i) => `${x(i + 1)},${y(u)}`).join(' ')} />
    {#each curve as u, i (i)}<circle cx={x(i + 1)} cy={y(u)} r="2.5" />{/each}
  </svg>
  <p class="ui note">x: number of processes · y: fraction of time spent on useful work (a fault costs 100 accesses’ worth)</p>
</Widget>

<style>
  .cfg {
    font-size: 0.86rem;
  }
  svg {
    width: 100%;
    max-width: 36rem;
    display: block;
    margin-top: 0.6rem;
  }
  .ax {
    stroke: var(--line-strong);
  }
  .t {
    font-family: var(--font-mono);
    font-size: 8px;
    fill: var(--mute);
  }
  polyline {
    fill: none;
    stroke: var(--copper);
    stroke-width: 2;
  }
  circle {
    fill: var(--copper);
  }
  .cliff {
    stroke: var(--red);
    stroke-dasharray: 3 3;
  }
  .note {
    font-size: 0.76rem;
    color: var(--ink-2);
  }
</style>

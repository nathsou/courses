<!--
  Placing the decade counter: its 29 cells (25 gates and 4 flip-flops) in four rows, inputs on the left edge and
  outputs on the right. Lines join each net's pins to the net's centre. Swap cells by hand (select one, then
  another), or let simulated annealing run. The cost is the total half-perimeter wirelength (HPWL).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { design } from '$lib/eda/hdl';
  import { synthesize } from '$lib/eda/techmap';
  import { DECADE_COUNTER } from '$lib/eda/designs';
  import { anneal, hpwl, positions, problemFrom, randomPlacement, rowWidth, type AnnealStep, type Placement } from '$lib/eda/place';

  const p = problemFrom(synthesize(design(DECADE_COUNTER)));
  let seed = $state(3);
  let pl = $state<Placement>(randomPlacement(p, 3));
  let start = $state(hpwl(p, randomPlacement(p, 3)));
  let selected = $state<string | null>(null);
  let message = $state('');
  let running = $state(false);
  let step = $state<AnnealStep | null>(null);
  let usedAnneal = $state(false);
  let mounted = $state(false);
  onMount(() => {
    progress.load();
    mounted = true;
  });

  const cost = $derived(hpwl(p, pl));
  const pos = $derived(positions(p, pl));
  const goal = $derived(Math.round(start * 0.8));
  $effect(() => {
    if (mounted && !usedAnneal && cost <= goal) progress.markSolved('physical/placer-hand');
  });

  const U = 16;
  const ROWH = 46;
  const PADX = 46;
  const W = PADX + p.sites * U + 96;
  const H = p.rows * ROWH + 20;
  const X = (sx: number) => PADX + sx * U;
  const Y = (sy: number) => 10 + (sy / (p.rows * p.rowHeight)) * (p.rows * ROWH);

  function scramble() {
    stop();
    seed++;
    pl = randomPlacement(p, seed);
    start = hpwl(p, pl);
    step = null;
    usedAnneal = false;
    selected = null;
    message = '';
  }
  function pick(id: string) {
    if (running) return;
    if (!selected) {
      selected = id;
      message = 'Now select a cell to swap it with.';
      return;
    }
    if (selected === id) {
      selected = null;
      message = '';
      return;
    }
    const next = pl.map((row) => [...row]);
    const ra = next.findIndex((r) => r.includes(selected!));
    const rb = next.findIndex((r) => r.includes(id));
    const ia = next[ra]!.indexOf(selected);
    const ib = next[rb]!.indexOf(id);
    next[ra]![ia] = id;
    next[rb]![ib] = selected;
    if (next.some((r) => rowWidth(p, r) > p.sites)) {
      message = 'Those two cells differ in width and one row would overflow; try another pair.';
    } else {
      const before = cost;
      pl = next;
      const after = hpwl(p, next);
      message = `Swapped: wirelength ${after < before ? 'down' : after > before ? 'up' : 'unchanged'} by ${Math.abs(after - before).toFixed(1)}.`;
    }
    selected = null;
  }
  let gen: Generator<AnnealStep> | null = null;
  let raf = 0;
  function run() {
    if (running) return stop();
    usedAnneal = true;
    running = true;
    gen = anneal(p, pl, { seed, batches: 90 });
    const tick = () => {
      const r = gen!.next();
      if (r.done) return stop();
      step = r.value;
      pl = r.value.placement;
      raf = requestAnimationFrame(tick);
    };
    tick();
  }
  function stop() {
    cancelAnimationFrame(raf);
    running = false;
  }
  onMount(() => stop);

  const netCentres = $derived(
    p.nets.map((n) => {
      const pts = n.pins.map((id) => pos.get(id)!);
      return { n, cx: pts.reduce((s, q) => s + q.x, 0) / pts.length, cy: pts.reduce((s, q) => s + q.y, 0) / pts.length, pts };
    }),
  );
  const label = (id: string) => p.cells.find((c) => c.id === id)!.label;
</script>

<Widget title="Placing the counter" subtitle="Each box is a cell; each fan of thin lines is a net, joining the pins it connects. Select a cell, then another, to swap them; or let annealing run. Shorter is better.">
  {#snippet controls()}
    <button class="b ui go" onclick={run}>{running ? 'Stop' : 'Anneal'}</button>
    <button class="b ui" onclick={scramble}>Scramble</button>
  {/snippet}
  <div class="scroll">
    <svg viewBox="0 0 {W} {H}" class="pl" role="img" aria-label="Placement; total wirelength {cost.toFixed(1)}">
      {#each Array.from({ length: p.rows }) as _, r (r)}
        <rect x={X(0)} y={10 + r * ROWH} width={p.sites * U} height={ROWH - 4} class="row" />
      {/each}
      {#each netCentres as c (c.n.name)}
        {@const hot = selected !== null && c.n.pins.includes(selected)}
        {#each c.pts as q, k (k)}<line x1={X(c.cx)} y1={Y(c.cy)} x2={X(q.x)} y2={Y(q.y)} class="fly" class:hot />{/each}
      {/each}
      {#each pl as row, r (r)}
        {#each row as id (id)}
          {@const q = pos.get(id)!}
          <g class="cell" class:sel={selected === id} class:ff={label(id) === 'DFF'} role="button" tabindex="0" aria-label="{label(id)} {id}" onclick={() => pick(id)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick(id))}>
            <rect x={X(q.x - q.w / 2) + 1} y={14 + r * ROWH} width={q.w * U - 2} height={ROWH - 12} rx="2" />
            <text x={X(q.x)} y={14 + r * ROWH + (ROWH - 12) / 2 + 3} class="t">{q.w >= 3 ? label(id) : label(id).slice(0, 2)}</text>
          </g>
        {/each}
      {/each}
      {#each p.io as io (io.id)}
        <circle cx={X(io.x)} cy={Y(io.y)} r="4" class="io" />
        <text x={io.side === 'left' ? X(io.x) - 7 : X(io.x) + 7} y={Y(io.y) + 3} class="iot" text-anchor={io.side === 'left' ? 'end' : 'start'}>{io.id.split(':')[1]}</text>
      {/each}
    </svg>
  </div>
  <dl class="nums ui">
    <div><dt>Wirelength (HPWL)</dt><dd>{cost.toFixed(1)}</dd></div>
    <div><dt>At the start</dt><dd>{start.toFixed(1)}</dd></div>
    <div><dt>By hand, aim for</dt><dd>≤ {goal}{mounted && progress.isSolved('physical/placer-hand') ? ' ✓' : ''}</dd></div>
    {#if step}<div><dt>Annealing temperature</dt><dd>{step.temperature.toFixed(2)} ({((step.accepted / step.tried) * 100).toFixed(0)} % of moves accepted)</dd></div>{/if}
  </dl>
  <p class="msg ui" aria-live="polite">
    {#if !usedAnneal && cost <= goal}Wirelength checked: {cost.toFixed(1)}, by hand, at least 20 % below the start.{:else}{message}{/if}
  </p>
</Widget>

<style>
  .b {
    font: inherit;
    font-size: 0.84rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .b.go {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
  }
  .scroll {
    overflow-x: auto;
  }
  .pl {
    width: 100%;
    min-width: 36rem;
    height: auto;
    display: block;
    font-family: var(--font-ui);
  }
  .row {
    fill: var(--surface-2);
  }
  .fly {
    stroke: var(--series-1);
    stroke-width: 0.8;
    opacity: 0.45;
  }
  .fly.hot {
    stroke: var(--ac);
    stroke-width: 2;
    opacity: 1;
  }
  .cell {
    cursor: pointer;
  }
  .cell rect {
    fill: var(--surface);
    stroke: var(--ink-2);
    stroke-width: 1.2;
  }
  .cell.ff rect {
    fill: var(--accent-soft);
  }
  .cell.sel rect {
    stroke: var(--ac);
    stroke-width: 3;
  }
  .cell:focus-visible rect {
    stroke: var(--focus);
    stroke-width: 3;
  }
  .t {
    font-size: 9px;
    font-weight: 700;
    text-anchor: middle;
    fill: var(--ink);
    pointer-events: none;
  }
  .io {
    fill: var(--ac);
  }
  .iot {
    font-family: var(--font-mono);
    font-size: 9px;
    fill: var(--ink-2);
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.6rem 0 0;
    font-size: 0.82rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .msg {
    font-size: 0.84rem;
    margin: 0.4rem 0 0;
    min-height: 1.2rem;
  }
</style>

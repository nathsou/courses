<!--
  Maze routing on a small grid: four nets (lettered pins), blockages (dark squares), one or two metal layers.
  Nets are routed one at a time, cheapest path first; each wire becomes an obstacle for the nets after it.
  Metal 1 prefers horizontal runs and metal 2 vertical ones; a via joins them. Watch the search spread, change
  the order, and find an order that routes everything on a single layer.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { routeAll, search, type Cell3, type RouteGrid, type RouteNet } from '$lib/eda/route';

  const GW = 12;
  const GH = 8;
  const BLOCKS = ['3,0', '6,2', '1,2', '8,6', '10,2', '4,7', '3,1', '1,4'];
  const NETS: RouteNet[] = [
    { name: 'A', pins: [[2, 5], [11, 3]] },
    { name: 'B', pins: [[10, 3], [5, 0]] },
    { name: 'C', pins: [[8, 1], [8, 4]] },
    { name: 'D', pins: [[7, 5], [2, 7]] },
  ];
  const COLOURS: Record<string, string> = { A: 'var(--series-1)', B: 'var(--series-2)', C: 'var(--series-4)', D: 'var(--series-5)' };

  let layers = $state<1 | 2>(1);
  let order = $state(['A', 'B', 'C', 'D']);
  let result = $state<ReturnType<typeof routeAll> | null>(null);
  let wave = $state<{ c: Cell3; d: number }[]>([]);
  let shownWave = $state(0);
  let mounted = $state(false);
  onMount(() => {
    progress.load();
    mounted = true;
  });

  const grid = $derived<RouteGrid>({ w: GW, h: GH, layers, blocked: new Set(BLOCKS.flatMap((b) => [`${b},0`, `${b},1`])) });
  function route() {
    wave = [];
    result = routeAll(grid, order.map((n) => NETS.find((x) => x.name === n)!));
    if (layers === 1 && result.failed.length === 0) progress.markSolved('physical/route-order');
  }
  function move(i: number, d: number) {
    const o = [...order];
    const j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j]!, o[i]!];
    order = o;
    result = null;
  }
  let raf = 0;
  function showSearch() {
    result = null;
    const first = NETS.find((n) => n.name === order[0])!;
    const others = new Set(NETS.filter((n) => n !== first).flatMap((n) => n.pins.flatMap(([x, y]) => [`${x},${y},0`, `${x},${y},1`])));
    const src = first.pins[0]!;
    const r = search(grid, others, layers === 1 ? [{ x: src[0], y: src[1], z: 0 }] : [{ x: src[0], y: src[1], z: 0 }, { x: src[0], y: src[1], z: 1 }], first.pins[1]!);
    wave = r.reached;
    shownWave = 0;
    cancelAnimationFrame(raf);
    const tick = () => {
      shownWave = Math.min(wave.length, shownWave + 3);
      if (shownWave < wave.length) raf = requestAnimationFrame(tick);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) shownWave = wave.length;
    else tick();
  }
  $effect(() => {
    void layers;
    result = null;
    wave = [];
  });
  onMount(() => () => cancelAnimationFrame(raf));

  const S = 40;
  const cx = (x: number) => x * S + S / 2;
  const segs = (cells: Cell3[]) => {
    const out: { a: Cell3; b: Cell3 }[] = [];
    const set = new Map(cells.map((c) => [`${c.x},${c.y},${c.z}`, c]));
    for (const c of cells)
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ] as [number, number][]) {
        const n = set.get(`${c.x + dx},${c.y + dy},${c.z}`);
        if (n) out.push({ a: c, b: n });
      }
    return out;
  };
  const vias = (cells: Cell3[]) => cells.filter((c) => c.z === 0 && cells.some((d) => d.z === 1 && d.x === c.x && d.y === c.y));
  const firstPin = $derived(NETS.find((n) => n.name === order[0])!);
</script>

<Widget title="Routing, one net at a time" subtitle="Each net joins its two lettered pins. Nets are routed in the order listed, each by the cheapest path around blockages and the wires already laid.">
  {#snippet controls()}
    <Segmented bind:value={layers} label="Metal layers" options={[{ value: 1, label: 'One layer' }, { value: 2, label: 'Two layers' }]} />
    <div class="order ui" role="group" aria-label="Routing order">
      {#each order as n, i (n)}
        <span class="item" style:--c={COLOURS[n]}>
          <button onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move {n} earlier">‹</button>
          <strong>{n}</strong>
          <button onclick={() => move(i, 1)} disabled={i === order.length - 1} aria-label="Move {n} later">›</button>
        </span>
      {/each}
    </div>
    <button class="b go ui" onclick={route}>Route in this order</button>
    <button class="b ui" onclick={showSearch}>Watch the search for net {order[0]}</button>
  {/snippet}
  <div class="scroll">
    <svg viewBox="0 0 {GW * S} {GH * S}" class="grid" role="img" aria-label={result ? `Routed with ${result.failed.length ? `${result.failed.join(', ')} failing` : 'every net connected'}` : 'Unrouted grid'}>
      {#each Array.from({ length: GW * GH }) as _, i (i)}
        <rect x={(i % GW) * S} y={Math.floor(i / GW) * S} width={S} height={S} class="g" class:blk={BLOCKS.includes(`${i % GW},${Math.floor(i / GW)}`)} />
      {/each}
      {#each wave.slice(0, shownWave) as w, i (i)}
        <rect x={w.c.x * S + (w.c.z ? S / 2 : 0)} y={w.c.y * S} width={layers === 2 ? S / 2 : S} height={S} class="wv" style:opacity={0.15 + 0.5 * (1 - w.d / (wave.at(-1)?.d || 1))} />
        {#if layers === 1}<text x={cx(w.c.x)} y={w.c.y * S + S / 2 + 4} class="d">{w.d}</text>{/if}
      {/each}
      {#if result}
        {#each [...result.routes.entries()] as [name, cells] (name)}
          {#each segs(cells) as s, k (k)}
            <line x1={cx(s.a.x)} y1={cx(s.a.y)} x2={cx(s.b.x)} y2={cx(s.b.y)} class="wire" class:m2={s.a.z === 1} style:stroke={COLOURS[name]} />
          {/each}
          {#each vias(cells) as v, k (k)}<rect x={cx(v.x) - 5} y={cx(v.y) - 5} width="10" height="10" class="via" style:stroke={COLOURS[name]} />{/each}
        {/each}
      {/if}
      {#each NETS as n (n.name)}
        {#each n.pins as [x, y], k (k)}
          <circle cx={cx(x)} cy={cx(y)} r="12" class="pin" class:fail={result?.failed.includes(n.name)} style:fill={COLOURS[n.name]} />
          <text x={cx(x)} y={cx(y) + 5} class="pt">{n.name}</text>
        {/each}
      {/each}
    </svg>
  </div>
  <p class="msg ui" aria-live="polite">
    {#if result}
      {#if result.failed.length}Net{result.failed.length > 1 ? 's' : ''} {result.failed.join(', ')} could not be routed: the wires laid before {result.failed.length > 1 ? 'them' : 'it'} cut off every path.
      {:else}Routing checked: all four nets connected{layers === 1 ? ', on a single layer' : ''}; {result.length} grid steps of wire{layers === 2 ? `, ${result.vias} vias` : ''}.{/if}
    {:else if wave.length}The search for net {firstPin.name} spreads outwards from its first pin, cheapest cells first{layers === 1 ? ' (the number is the cost so far)' : ''}, until it reaches the second pin.
    {:else}{mounted && progress.isSolved('physical/route-order') ? 'You have found an order that works on one layer. ' : ''}Route the nets, or watch the search.{/if}
  </p>
  <p class="key ui">Thick solid: metal 1 (prefers horizontal). Thinner dashed: metal 2 (prefers vertical). Squares: vias.</p>
</Widget>

<style>
  .order {
    display: inline-flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .item {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
    border: 2px solid var(--c);
    border-radius: var(--radius-sm);
    padding: 0 0.1rem;
  }
  .item button {
    border: 0;
    background: none;
    color: var(--ink);
    cursor: pointer;
    font-size: 1rem;
    min-width: 1.6rem;
    min-height: 2rem;
  }
  .item button:disabled {
    opacity: 0.3;
  }
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
  .grid {
    width: 100%;
    max-width: 34rem;
    min-width: 20rem;
    height: auto;
    display: block;
    margin: 0 auto;
    font-family: var(--font-ui);
  }
  .g {
    fill: var(--page);
    stroke: var(--line);
  }
  .g.blk {
    fill: color-mix(in srgb, var(--ink) 55%, var(--page));
  }
  .wv {
    fill: var(--ac);
  }
  .d {
    font-size: 10px;
    text-anchor: middle;
    fill: var(--ink-2);
  }
  .wire {
    stroke-width: 9;
    stroke-linecap: round;
  }
  .wire.m2 {
    stroke-width: 5;
    stroke-dasharray: 6 4;
  }
  .via {
    fill: var(--surface);
    stroke-width: 2.5;
  }
  .pin {
    stroke: var(--surface);
    stroke-width: 2;
  }
  .pin.fail {
    stroke: var(--bad);
    stroke-width: 4;
  }
  .pt {
    font-size: 12px;
    font-weight: 700;
    text-anchor: middle;
    fill: #fff;
  }
  .msg {
    font-size: 0.86rem;
    margin: 0.5rem 0 0;
  }
  .key {
    font-size: 0.76rem;
    color: var(--ink-3);
    margin: 0.3rem 0 0;
  }
</style>

<!--
  Multiplication by a unit a permutes the units modulo n. Its cycles all have the same length, the order of a,
  so that length divides φ(n): Lagrange's theorem, and with it Fermat's and Euler's theorems, in one picture.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { gcd, order } from '$lib/primes/arith';

  let n = $state(13);
  let a = $state(3);

  const units = $derived(Array.from({ length: n }, (_, k) => k).filter((k) => k > 0 && gcd(k, n) === 1));
  // Keep a a unit when n changes.
  $effect(() => {
    if (!units.includes(a)) a = units[1] ?? units[0]!;
  });
  const ord = $derived(order(a, n) ?? 1);
  const cycles = $derived.by(() => {
    const seen = new Set<number>();
    const out: number[][] = [];
    for (const u of units) {
      if (seen.has(u)) continue;
      const c: number[] = [];
      let x = u;
      while (!seen.has(x)) {
        seen.add(x);
        c.push(x);
        x = (x * a) % n;
      }
      out.push(c);
    }
    return out;
  });
  const cycleOf = $derived(new Map(cycles.flatMap((c, i) => c.map((x) => [x, i] as const))));
  const primitive = $derived(units.filter((u) => order(u, n) === units.length));
  const R = 120;
  const pos = (k: number) => {
    const i = units.indexOf(k);
    const t = (2 * Math.PI * i) / units.length;
    return { x: R * Math.sin(t), y: -R * Math.cos(t) };
  };
  const HUES = ['var(--series-2)', 'var(--series-1)', 'var(--series-4)', 'var(--series-3)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'];
  const arrow = (from: number) => {
    const p = pos(from);
    const q = pos((from * a) % n);
    if (from === (from * a) % n) return '';
    // A gentle curve towards the centre.
    const mx = (p.x + q.x) * 0.38;
    const my = (p.y + q.y) * 0.38;
    return `M${p.x},${p.y} Q${mx},${my} ${q.x},${q.y}`;
  };
</script>

<Widget title="Multiplying by a unit" subtitle="Arrows send each unit x modulo n to a·x. The units split into cycles, all of the same length: the order of a." onreset={() => ((n = 13), (a = 3))}>
  {#snippet controls()}
    <Slider label="n" bind:value={n} min={3} max={40} step={1} format={(v) => String(v)} />
    <label class="pick ui">
      a =
      <select bind:value={a}>
        {#each units as u (u)}<option value={u}>{u}</option>{/each}
      </select>
    </label>
  {/snippet}
  <div class="wrap">
    <svg viewBox="-150 -150 300 300" role="img" aria-label="The {units.length} units modulo {n} on a circle; multiplication by {a} splits them into {cycles.length} cycles of length {ord}.">
      <defs>
        <marker id="uc-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink-3)" /></marker>
      </defs>
      {#each units as u (u)}
        {#if arrow(u)}<path class="arc" d={arrow(u)} style:stroke={HUES[cycleOf.get(u)! % HUES.length]} marker-end="url(#uc-head)" />{/if}
      {/each}
      {#each units as u (u)}
        {@const p = pos(u)}
        <g transform="translate({p.x},{p.y})">
          <circle r="11" style:fill={HUES[cycleOf.get(u)! % HUES.length]} class:one={u === 1} />
          <text dy="0.35em" text-anchor="middle">{u}</text>
        </g>
      {/each}
    </svg>
  </div>
  <p class="out" aria-live="polite">
    φ({n}) = {units.length} units. Multiplication by {a} makes {cycles.length} {cycles.length === 1 ? 'cycle' : 'cycles'} of length {ord}, so ord({a}) = {ord} divides φ({n}) = {units.length},
    and {a}<sup>{units.length}</sup> ≡ 1 (mod {n}).
    {#if primitive.length}Primitive roots (order φ({n})): {primitive.slice(0, 16).join(', ')}{primitive.length > 16 ? ', …' : ''}.{:else}There are no primitive roots modulo {n}: no single cycle covers every unit.{/if}
  </p>
</Widget>

<style>
  .pick {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  select {
    font-family: var(--font-mono);
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
  }
  .wrap {
    max-width: 420px;
    margin: 0 auto;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .arc {
    fill: none;
    stroke-width: 1.4;
    opacity: 0.75;
  }
  circle {
    stroke: var(--surface);
    stroke-width: 2;
  }
  circle.one {
    stroke: var(--fg);
  }
  text {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: var(--fx-cream);
    font-weight: 600;
    pointer-events: none;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.88rem;
  }
</style>

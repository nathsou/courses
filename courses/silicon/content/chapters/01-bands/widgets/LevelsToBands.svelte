<!--
  From atomic levels to bands (a toy tight-binding model): N identical atoms in a row, each with two levels.
  As the atoms approach, every level splits into N levels, which crowd into a band; between the bands is a gap.
  Arbitrary energy units; the point is the counting and the crowding, not silicon's numbers.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  let N = $state(4);
  let d = $state(1.4);

  const LOW = -5;
  const HIGH = 1;
  const t = (dist: number, k: number) => k * Math.exp(-(dist - 1) * 1.6);
  const levels = (dist: number, n: number, e0: number, k: number) =>
    Array.from({ length: n }, (_, i) => e0 + 2 * t(dist, k) * Math.cos(((i + 1) * Math.PI) / (n + 1)));
  const lowLevels = $derived(levels(d, N, LOW, 0.8));
  const highLevels = $derived(levels(d, N, HIGH, 1.0));
  const gap = $derived(Math.min(...highLevels) - Math.max(...lowLevels));

  // Drawing: left, the band edges against spacing (for a very large N); right, the N levels at the chosen spacing.
  const W = 400;
  const H = 300;
  const E0 = -9;
  const E1 = 5.5;
  const y = (e: number) => 14 + ((E1 - e) / (E1 - E0)) * (H - 40);
  const D0 = 0.6;
  const D1 = 3;
  const x = (dist: number) => 40 + ((dist - D0) / (D1 - D0)) * 350;
  const edge = (e0: number, k: number, sign: number): string[] =>
    Array.from({ length: 80 }, (_, i) => {
      const dist = D0 + ((D1 - D0) * i) / 79;
      return `${x(dist).toFixed(1)},${y(e0 + sign * 2 * t(dist, k)).toFixed(1)}`;
    });
  const band = (e0: number, k: number) => `M${[...edge(e0, k, 1), ...edge(e0, k, -1).reverse()].join('L')}Z`;
</script>

<Widget title="From atoms to bands" subtitle="Bring identical atoms together and each of their energy levels splits: two atoms, two levels; N atoms, N levels. A crystal has about 10²² atoms per cm³, so the levels merge into bands.">
  {#snippet controls()}
    <Segmented bind:value={N} label="Atoms" options={[1, 2, 3, 4, 8, 16, 64].map((n) => ({ value: n, label: String(n) }))} />
    <Slider bind:value={d} min={0.6} max={3} step={0.02} label="Spacing between atoms" format={(v) => `${v.toFixed(2)} × the crystal’s`} />
  {/snippet}
  <div class="pair">
    <svg viewBox="0 0 {W} {H}" role="img" aria-label="Band edges against spacing; the current spacing is {d.toFixed(2)} times the crystal's">
      <path class="bandfill low" d={band(LOW, 0.8)} />
      <path class="bandfill high" d={band(HIGH, 1.0)} />
      <line class="cur" x1={x(d)} x2={x(d)} y1="10" y2={H - 26} />
      <line class="eq" x1={x(1)} x2={x(1)} y1="10" y2={H - 26} />
      <text class="lab" x={x(1) + 4} y={H - 30}>crystal</text>
      <text class="axis" x={x((D0 + D1) / 2)} y={H - 6}>spacing between atoms →</text>
      <text class="axis" transform="translate(16 {H / 2}) rotate(-90)">energy →</text>
      <text class="lab" x={x(2.25)} y={y(HIGH) - 8}>atomic level</text>
      <text class="lab" x={x(2.25)} y={y(LOW) - 8}>atomic level</text>
    </svg>
    <svg viewBox="0 0 220 {H}" role="img" aria-label="{N} atoms at {d.toFixed(2)} times the crystal spacing: two bands of {N} levels each, gap {gap > 0 ? gap.toFixed(2) : 'closed'}">
      <rect class="panel" x="10" y="10" width="200" height={H - 36} rx="4" />
      {#each highLevels as e, i (i)}<line class="lvl high" x1="40" x2="180" y1={y(e)} y2={y(e)} />{/each}
      {#each lowLevels as e, i (i)}<line class="lvl low" x1="40" x2="180" y1={y(e)} y2={y(e)} />{/each}
      {#if gap > 0}
        <line class="gapline" x1="110" x2="110" y1={y(Math.min(...highLevels))} y2={y(Math.max(...lowLevels))} />
        <text class="lab" x="116" y={(y(Math.min(...highLevels)) + y(Math.max(...lowLevels))) / 2 + 4}>gap</text>
      {/if}
      <text class="lab c" x="110" y={H - 6}>{N} atom{N === 1 ? '' : 's'}: {N} + {N} levels</text>
    </svg>
  </div>
  <p class="read ui">
    {#if gap > 0}The lower band (filled with electrons from the bonds, in silicon) and the upper band (empty) are separated by a gap of {gap.toFixed(2)} units.{:else}At this spacing the two bands overlap: there is no gap, and the material would conduct like a metal.{/if}
  </p>
</Widget>

<style>
  .pair {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr);
    gap: 0.75rem;
  }
  @media (max-width: 560px) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }
    .pair svg:last-child {
      max-width: 16rem;
      margin: 0 auto;
    }
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-ui);
  }
  .bandfill.low {
    fill: var(--hole);
    opacity: 0.18;
  }
  .bandfill.high {
    fill: var(--electron);
    opacity: 0.18;
  }
  .cur {
    stroke: var(--ac);
    stroke-width: 2.5;
  }
  .eq {
    stroke: var(--ink-3);
    stroke-dasharray: 4 3;
  }
  .panel {
    fill: var(--page);
    stroke: var(--line-strong);
  }
  .lvl {
    stroke-width: 2;
  }
  .lvl.low {
    stroke: var(--hole);
  }
  .lvl.high {
    stroke: var(--electron);
  }
  .gapline {
    stroke: var(--ink-2);
    stroke-dasharray: 3 3;
  }
  .lab {
    fill: var(--ink-2);
    font-size: 13px;
  }
  .lab.c {
    text-anchor: middle;
  }
  .axis {
    fill: var(--ink-2);
    font-size: 13px;
    font-weight: 600;
    text-anchor: middle;
  }
  .read {
    margin: 0.4rem 0 0;
    font-size: 0.84rem;
    color: var(--ink-2);
  }
</style>

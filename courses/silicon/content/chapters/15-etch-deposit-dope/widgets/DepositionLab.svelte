<!--
  Coating a trench. Sputtering (PVD) sends atoms in straight lines from above, so the bottom of a deep trench
  sees only a sliver of sky; CVD molecules bounce around before they react, coating deeper the less readily they
  stick; ALD builds the film one self-limiting atomic layer at a time and coats every surface equally.
  Illustrative models: a view factor for PVD, reaction–diffusion for CVD, uniform for ALD.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  let method = $state<'pvd' | 'cvd' | 'ald'>('pvd');
  let ar = $state(3);
  let sticking = $state(0.05);

  // Thickness on the trench walls at depth z (in trench widths), relative to the top surface.
  const coverage = (z: number) => {
    if (method === 'ald') return 1;
    if (method === 'pvd') {
      // A point at depth z on the floor or wall sees the opening under an angle that shrinks with depth.
      return Math.max(0.02, 0.5 * (1 / Math.sqrt(1 + 4 * z * z)));
    }
    const phi = ar * Math.sqrt(8 * sticking);
    return Math.cosh(phi * (1 - z / ar)) / Math.cosh(phi);
  };
  const bottom = $derived(method === 'pvd' ? Math.max(0.02, 1 / Math.sqrt(1 + 4 * ar * ar)) : coverage(ar));

  const W = 300;
  const TW = 60; // trench width in px
  const H = $derived(TW * ar);
  const T = 14; // top film thickness in px
  const top = 60;
  const x0 = (W - TW) / 2;
  const wallPts = $derived(Array.from({ length: 41 }, (_, i) => (i / 40) * ar));
  const left = $derived(wallPts.map((z) => [x0 + coverage(z) * T, top + z * TW] as [number, number]));
  const right = $derived(wallPts.map((z) => [x0 + TW - coverage(z) * T, top + z * TW] as [number, number]));
</script>

<Widget title="Coating a trench" subtitle="A trench in the wafer, a chosen number of times deeper than it is wide, is coated with a film. Compare how evenly three methods reach the bottom.">
  {#snippet controls()}
    <Segmented bind:value={method} label="Method" options={[{ value: 'pvd', label: 'Sputtering (PVD)' }, { value: 'cvd', label: 'CVD' }, { value: 'ald', label: 'ALD' }]} />
    <Slider bind:value={ar} min={0.5} max={10} step={0.1} label="Aspect ratio (depth ÷ width)" format={(v) => `${v.toFixed(1)} : 1`} />
    {#if method === 'cvd'}<Slider bind:value={sticking} min={0.001} max={1} log label="Sticking probability" format={(v) => v.toFixed(3)} />{/if}
  {/snippet}
  <svg viewBox="0 0 {W} {top + H + 40}" class="xs" role="img" aria-label="Film at the bottom: {(bottom * 100).toFixed(0)} % of its thickness on top">
    <rect x="0" y={top} width={W} height={H + 40} class="si" />
    <rect x={x0} y={top} width={TW} height={H} class="air" />
    <rect x="0" y={top - T} width={x0} height={T} class="film" />
    <rect x={x0 + TW} y={top - T} width={W - x0 - TW} height={T} class="film" />
    <path d="M{x0},{top} {left.map(([x, y]) => `L${x},${y}`).join(' ')} L{x0},{top + H} Z" class="film" />
    <path d="M{x0 + TW},{top} {right.map(([x, y]) => `L${x},${y}`).join(' ')} L{x0 + TW},{top + H} Z" class="film" />
    <rect x={x0} y={top + H - bottom * T} width={TW} height={bottom * T} class="film" />
    {#if method === 'pvd'}
      <path d="M{x0 - 2},{top - T} q{T * 0.5},0 {T * 0.7},{T * 0.8} L{x0},{top} Z M{x0 + TW + 2},{top - T} q{-T * 0.5},0 {-T * 0.7},{T * 0.8} L{x0 + TW},{top} Z" class="film" />
    {/if}
  </svg>
  <dl class="nums ui">
    <div><dt>Film at the bottom ÷ film on top (step coverage)</dt><dd>{(bottom * 100).toFixed(0)} %</dd></div>
    <div><dt>On the walls, halfway down</dt><dd>{(coverage(ar / 2) * 100).toFixed(0)} %</dd></div>
  </dl>
</Widget>

<style>
  .xs {
    width: 100%;
    max-width: 22rem;
    height: auto;
    display: block;
    margin: 0 auto;
    max-height: 30rem;
  }
  .si {
    fill: var(--m-si);
  }
  .air {
    fill: var(--page);
  }
  .film {
    fill: var(--m-metal);
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.4rem 0 0;
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
</style>

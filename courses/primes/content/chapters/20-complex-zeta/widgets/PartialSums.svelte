<!--
  Partial sums of Σ n^(−s) drawn as a chain of arrows in the complex plane: each term n^(−s) has length n^(−σ) and
  direction −t log n. For σ > 1 the chain converges; for σ ≤ 1 it spirals away. Two repairs: the alternating series
  η(s) = Σ (−1)^(n−1) n^(−s) converges for σ > 0, and adding the Euler–Maclaurin correction N^(1−s)/(s − 1) − N^(−s)/2 to
  the partial sum makes it converge to ζ(s) for σ > −1.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { c, add, sub, div, scale, powReal, abs, format, type Complex } from '$lib/primes/complex';
  import { zeta, eta } from '$lib/primes/zeta';

  let sigma = $state(0.5);
  let t = $state(14.1347);
  let mode = $state<'zeta' | 'eta' | 'corrected'>('corrected');
  let N = $state(60);

  const s = $derived(c(sigma, t));
  const target = $derived(mode === 'eta' ? eta(s) : zeta(s));
  const path = $derived.by(() => {
    const pts: Complex[] = [c(0)];
    let sum = c(0);
    for (let n = 1; n <= N; n++) {
      const term = powReal(n, s);
      sum = mode === 'eta' && n % 2 === 0 ? sub(sum, term) : add(sum, term);
      if (mode === 'corrected') {
        // Σ_{m<n} m^(−s) + n^(1−s)/(s − 1) + n^(−s)/2, the Euler–Maclaurin approximation with cut-off n.
        const before = sub(sum, term);
        pts.push(add(add(before, div(scale(term, n), sub(s, c(1)))), scale(term, 0.5)));
      } else pts.push(sum);
    }
    return pts;
  });

  const W = 640;
  const H = 340;
  const view = $derived.by(() => {
    // Fit the later part of the chain (the early terms can swing far out) together with the target.
    const tail = path.slice(Math.max(1, Math.floor(path.length * 0.3)));
    const finite = [...tail, target].filter((p) => Number.isFinite(p.re) && Number.isFinite(p.im) && abs(p) < 1e3);
    let x0 = Math.min(...finite.map((p) => p.re));
    let x1 = Math.max(...finite.map((p) => p.re));
    let y0 = Math.min(...finite.map((p) => p.im));
    let y1 = Math.max(...finite.map((p) => p.im));
    const pad = 0.08 * Math.max(x1 - x0, y1 - y0, 0.5);
    x0 -= pad;
    x1 += pad;
    y0 -= pad;
    y1 += pad;
    // Equal scales on both axes.
    const k = Math.max((x1 - x0) / W, (y1 - y0) / H);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return { k, cx, cy };
  });
  const px = (p: Complex) => W / 2 + (p.re - view.cx) / view.k;
  const py = (p: Complex) => H / 2 - (p.im - view.cy) / view.k;
  const last = $derived(path[path.length - 1]!);
  const dist = $derived(abs(sub(last, target)));

  const PRESETS = [
    { label: 's = 2', sigma: 2, t: 0, mode: 'zeta' as const },
    { label: 's = 1.2 + 6i', sigma: 1.2, t: 6, mode: 'zeta' as const },
    { label: 's = ½ + 6i', sigma: 0.5, t: 6, mode: 'zeta' as const },
    { label: 'first zero, ½ + 14.1347i', sigma: 0.5, t: 14.1347, mode: 'corrected' as const },
  ];
</script>

<Widget title="Adding up n⁻ˢ" subtitle="Each term n⁻ˢ is an arrow of length n^(−σ) turned by the angle −t log n. The chain of partial sums converges when σ > 1. The two other series still converge to the left of that line." onreset={() => ((sigma = 0.5), (t = 14.1347), (mode = 'corrected'), (N = 60))}>
  {#snippet controls()}
    <Slider label="σ = Re s" bind:value={sigma} min={-0.9} max={2.5} step={0.01} />
    <Slider label="t = Im s" bind:value={t} min={0} max={40} step={0.01} />
    <Slider label="terms N" bind:value={N} min={2} max={400} step={1} format={(v) => String(v)} />
    <Segmented label="Series" bind:value={mode} options={[{ value: 'zeta', label: 'Σ n⁻ˢ' }, { value: 'eta', label: 'Σ (−1)ⁿ⁻¹ n⁻ˢ = η(s)' }, { value: 'corrected', label: 'Σ n⁻ˢ + correction' }]} size="sm" />
  {/snippet}
  <div class="presets ui">
    {#each PRESETS as p (p.label)}
      <button onclick={() => ((sigma = p.sigma), (t = p.t), (mode = p.mode))}>{p.label}</button>
    {/each}
  </div>
  <svg viewBox="0 0 {W} {H}" class="plot" role="img" aria-label="Partial sums of the series at s = {sigma.toFixed(2)} + {t.toFixed(2)} i.">
    <line class="axis" x1="0" x2={W} y1={py(c(0))} y2={py(c(0))} />
    <line class="axis" y1="0" y2={H} x1={px(c(0))} x2={px(c(0))} />
    <polyline class="chain" points={path.map((p) => `${px(p)},${py(p)}`).join(' ')} />
    {#each path.slice(1, 40) as p, i (i)}<circle cx={px(p)} cy={py(p)} r="1.8" class="node" />{/each}
    {#if Number.isFinite(target.re)}
      <circle cx={px(target)} cy={py(target)} r="5" class="target" />
    {/if}
    <circle cx={px(c(0))} cy={py(c(0))} r="2.5" class="origin" />
  </svg>
  <p class="out" aria-live="polite">
    {mode === 'eta' ? 'η(s)' : 'ζ(s)'} = {format(target, 5)} (red circle). After {N} terms the chain ends at {format(last, 5)}, at distance {dist < 1e-4 ? dist.toExponential(1) : dist.toFixed(4)}.
    {#if mode === 'zeta' && sigma <= 1}The series diverges here: the arrows shrink like n^(−{sigma.toFixed(2)}), too slowly, and the chain spirals outwards forever.{/if}
    {#if mode === 'eta' && sigma <= 0}η(s) only converges for σ > 0.{/if}
  </p>
</Widget>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.6rem;
  }
  .presets button {
    font: inherit;
    font-size: 0.76rem;
    padding: 0.15rem 0.55rem;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
  }
  .plot {
    width: 100%;
    height: auto;
    display: block;
    background: var(--chart-surface);
    border: 1px solid var(--line-strong);
  }
  .axis {
    stroke: var(--ruling);
  }
  .chain {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.3;
    stroke-linejoin: round;
  }
  .node {
    fill: var(--fx-blue);
  }
  .target {
    fill: none;
    stroke: var(--prime);
    stroke-width: 2;
  }
  .origin {
    fill: var(--ink);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>

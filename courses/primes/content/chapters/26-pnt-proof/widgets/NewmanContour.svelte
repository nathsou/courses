<!--
  Newman's contour. The circle |z| = R, cut off by the line Re z = −δ, on and inside which g(z) is holomorphic.
  C₊ is the arc in Re z > 0, C₋ the part in Re z < 0. The proof bounds the integral over C₊ by B/R directly, and over
  C₋ splits it: the g_T part moves to the left semicircle (bounded by B/R), and the g part tends to 0 as T → ∞
  because e^(zT) does. Hover over a piece to see its estimate.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';

  let R = $state(2);
  let delta = $state(0.35);
  let piece = $state<'plus' | 'minus' | 'semi' | null>(null);
  const S = 300;
  const scale = $derived((S / 2 - 20) / 3.2);
  const X = (x: number) => S / 2 + x * scale;
  const Y = (y: number) => S / 2 - y * scale;
  const yCut = $derived(Math.sqrt(Math.max(0, R * R - delta * delta)));
  // Arc in Re z > 0 from −iR to iR.
  const plusArc = $derived(`M${X(0)},${Y(-R)} A${R * scale},${R * scale} 0 0 0 ${X(0)},${Y(R)}`);
  // C₋: from iR along the circle to −δ + i·yCut, down the line, along the circle back to −iR.
  const minusPath = $derived(`M${X(0)},${Y(R)} A${R * scale},${R * scale} 0 0 0 ${X(-delta)},${Y(yCut)} L${X(-delta)},${Y(-yCut)} A${R * scale},${R * scale} 0 0 0 ${X(0)},${Y(-R)}`);
  const semi = $derived(`M${X(0)},${Y(R)} A${R * scale},${R * scale} 0 0 0 ${X(0)},${Y(-R)}`);
  const NOTES = {
    plus: 'C₊ (Re z > 0): |g(z) − g_T(z)| ≤ B e^(−T Re z)/Re z and |e^(zT)(1 + z²/R²)/z| = e^(T Re z) · 2 Re z/R², so the integrand is at most 2B/R² on an arc of length πR. Contribution ≤ B/R, for every T.',
    minus: 'C₋, the g part: g(z)(1 + z²/R²)/z is a fixed continuous function on C₋, and e^(zT) → 0 at every point with Re z < 0 (the two endpoints have measure zero). Contribution → 0 as T → ∞.',
    semi: 'C₋, the g_T part: g_T is entire, so its contour can be moved to the left semicircle C₋′ (|z| = R, Re z < 0), where |g_T(z)| ≤ B e^(−T Re z)/|Re z|. The same estimate as on C₊ gives ≤ B/R.',
  } as const;
</script>

<Widget title="Newman’s contour" subtitle="The circle of radius R, cut by the line Re z = −δ, chosen so that g is holomorphic on and inside it (shaded). Hover over a piece to see how it is estimated." onreset={() => ((R = 2), (delta = 0.35), (piece = null))}>
  {#snippet controls()}
    <Slider label="R" bind:value={R} min={0.8} max={3} step={0.05} />
    <Slider label="δ" bind:value={delta} min={0.05} max={0.7} step={0.01} />
  {/snippet}
  <div class="row">
    <svg viewBox="0 0 {S} {S}" role="img" aria-label="Newman's contour with R = {R.toFixed(2)} and delta = {delta.toFixed(2)}.">
      <rect class="strip" x={X(-delta)} y="0" width={S - X(-delta)} height={S} />
      <line class="axis" x1="0" x2={S} y1={Y(0)} y2={Y(0)} />
      <line class="axis" y1="0" y2={S} x1={X(0)} x2={X(0)} />
      <line class="cut" x1={X(-delta)} x2={X(-delta)} y1="0" y2={S} />
      <path class="semi" class:on={piece === 'semi'} d={semi} role="presentation" onpointerenter={() => (piece = 'semi')} onpointerleave={() => (piece = null)} />
      <path class="minus" class:on={piece === 'minus'} d={minusPath} role="presentation" onpointerenter={() => (piece = 'minus')} onpointerleave={() => (piece = null)} />
      <path class="plus" class:on={piece === 'plus'} d={plusArc} role="presentation" onpointerenter={() => (piece = 'plus')} onpointerleave={() => (piece = null)} />
      <circle cx={X(0)} cy={Y(0)} r="3.5" class="origin" />
      <text x={X(0) + 6} y={Y(0) - 6}>0</text>
      <text x={X(R * 0.75) + 8} y={Y(R * 0.75)}>C₊</text>
      <text x={X(-delta) - 22} y={Y(R * 0.35)}>C₋</text>
      <text x={X(-R * 0.72) - 28} y={Y(R * 0.72)}>C₋′</text>
      <text x={X(-delta) + 4} y={14}>Re z = −δ</text>
      <text x={X(0) + 4} y={Y(R) - 4}>iR</text>
      <text x={X(0) + 4} y={Y(-R) + 14}>−iR</text>
    </svg>
    <div class="notes ui">
      {#each ['plus', 'minus', 'semi'] as const as k (k)}
        <button class:on={piece === k} onpointerenter={() => (piece = k)} onpointerleave={() => (piece = null)} onfocus={() => (piece = k)} onblur={() => (piece = null)}>{NOTES[k]}</button>
      {/each}
    </div>
  </div>
  <p class="out">Cauchy's formula on this contour, with the extra factor (1 + z²/R²) (equal to 1 at z = 0), gives g(0) − g_T(0). The three pieces add up to at most 2B/R + o(1) as T → ∞, and R can be as large as we like.</p>
</Widget>

<style>
  .row {
    display: grid;
    grid-template-columns: minmax(12rem, 300px) 1fr;
    gap: 1rem;
    align-items: start;
  }
  @media (max-width: 640px) {
    .row {
      grid-template-columns: 1fr;
    }
  }
  svg {
    width: 100%;
    display: block;
    background: var(--chart-surface);
    border: 1px solid var(--rule);
    font-family: var(--font-mono);
  }
  .strip {
    fill: color-mix(in srgb, var(--fx-blue) 10%, transparent);
  }
  .axis {
    stroke: var(--ruling);
  }
  .cut {
    stroke: var(--mute);
    stroke-dasharray: 4 3;
  }
  path {
    fill: none;
    stroke-width: 3;
    cursor: help;
  }
  .plus {
    stroke: var(--prime);
  }
  .minus {
    stroke: var(--fx-blue);
  }
  .semi {
    stroke: var(--series-3);
    stroke-dasharray: 6 4;
    stroke-width: 2;
  }
  path.on {
    stroke-width: 5;
  }
  .origin {
    fill: var(--fg);
  }
  text {
    font-size: 11px;
    fill: var(--ink-2);
  }
  .notes {
    display: grid;
    gap: 0.5rem;
  }
  .notes button {
    text-align: left;
    font: inherit;
    font-size: 0.8rem;
    line-height: 1.45;
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--rule);
    border-left-width: 4px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink);
    cursor: default;
  }
  .notes button:nth-child(1) {
    border-left-color: var(--prime);
  }
  .notes button:nth-child(2) {
    border-left-color: var(--fx-blue);
  }
  .notes button:nth-child(3) {
    border-left-color: var(--series-3);
  }
  .notes button.on {
    background: color-mix(in srgb, var(--fx-blue) 8%, transparent);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>

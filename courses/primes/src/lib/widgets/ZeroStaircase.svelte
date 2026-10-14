<!--
  Riemann's formula in action: the prime staircase π(x) rebuilt from the smooth term li(x) and the first K
  pairs of zeros of ζ. K = 0 gives a smooth curve; each extra pair of zeros adds a wave, and the steps appear.
-->
<script lang="ts">
  import { primePiTable } from '$lib/primes/sieve';
  import { piExplicit } from '$lib/primes/explicit';
  import { ZEROS } from '$lib/primes/zeros';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';

  let { xMax = 100, initialZeros = 0 }: { xMax?: number; initialZeros?: number } = $props();

  // svelte-ignore state_referenced_locally
  let k = $state(initialZeros);
  // svelte-ignore state_referenced_locally
  const table = primePiTable(xMax);

  const W = 640;
  const H = 320;
  const pad = { l: 40, r: 12, t: 12, b: 30 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  // svelte-ignore state_referenced_locally
  const yMax = table[xMax]! * 1.12 + 1;
  // svelte-ignore state_referenced_locally
  const sx = (x: number) => pad.l + (x / xMax) * iw;
  const sy = (y: number) => pad.t + ih - (y / yMax) * ih;

  const stairs = (() => {
    let d = `M${sx(0)},${sy(0)}`;
    let last = 0;
    for (let x = 2; x <= xMax; x++) {
      const v = table[x]!;
      if (v !== last) {
        d += `H${sx(x).toFixed(2)}V${sy(v).toFixed(2)}`;
        last = v;
      }
    }
    return d + `H${sx(xMax).toFixed(2)}`;
  })();

  const approx = $derived.by(() => {
    const zs = ZEROS.slice(0, k);
    const pts: string[] = [];
    const n = 500;
    for (let i = 0; i <= n; i++) {
      const x = 2 + ((xMax - 2) * i) / n;
      const y = piExplicit(x, zs);
      pts.push(`${sx(x).toFixed(2)},${sy(Math.max(-2, Math.min(yMax + 2, y))).toFixed(2)}`);
    }
    return 'M' + pts.join('L');
  });

  const yTicks = (() => {
    const out: number[] = [];
    const step = yMax > 60 ? 10 : 5;
    for (let v = 0; v <= yMax; v += step) out.push(v);
    return out;
  })();
  const xTicks = (() => {
    const out: number[] = [];
    const step = xMax > 150 ? 50 : 10;
    for (let v = 0; v <= xMax; v += step) out.push(v);
    return out;
  })();
</script>

<Widget title="The zeros rebuild the staircase" subtitle="Riemann’s formula: a smooth curve plus one wave for each zero of ζ. Add zeros and watch the steps appear." onreset={() => (k = initialZeros)}>
  {#snippet controls()}
    <Slider label="zeros used" bind:value={k} min={0} max={ZEROS.length} step={1} format={(v) => String(v)} />
  {/snippet}
  <svg viewBox="0 0 {W} {H}" class="plot" role="img" aria-label="The prime-counting function up to {xMax} and its approximation from {k} zeros of the zeta function.">
    {#each yTicks as v (v)}
      <line class="ruling" x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} />
      <text class="tick" x={pad.l - 6} y={sy(v) + 4} text-anchor="end">{v}</text>
    {/each}
    <line class="margin" x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + ih} />
    {#each xTicks as v (v)}
      <text class="tick" x={sx(v)} y={H - pad.b + 16} text-anchor="middle">{v}</text>
    {/each}
    <path class="stairs" d={stairs} />
    <path class="approx" d={approx} />
  </svg>
  <div class="legend ui">
    <span class="k s">π(x)</span>
    <span class="k a">Riemann’s formula with {k === 0 ? 'no zeros (the smooth part only)' : k === 1 ? 'the first zero' : `the first ${k} zeros`}</span>
  </div>
</Widget>

<style>
  .plot {
    display: block;
    width: 100%;
    height: auto;
    font-family: var(--font-mono);
  }
  .ruling {
    stroke: var(--ruling);
  }
  .margin {
    stroke: var(--margin-rule);
    stroke-width: 1.5;
  }
  .tick {
    font-size: 11px;
    fill: var(--mute);
  }
  .stairs {
    fill: none;
    stroke: var(--prime);
    stroke-width: 2;
    opacity: 0.55;
  }
  .approx {
    fill: none;
    stroke: var(--fg);
    stroke-width: 1.6;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin-top: 0.4rem;
  }
  .k {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .k::before {
    content: '';
    width: 1.4rem;
    border-top: 2px solid var(--fg);
  }
  .k.s::before {
    border-top-color: var(--prime);
    opacity: 0.55;
  }
</style>

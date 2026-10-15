<!--
  How common are smooth numbers? For x = 10^6 and a range of bounds B, the measured proportion of n ≤ x whose
  prime factors are all ≤ B, against Dickman's prediction ρ(u) with u = log x / log B.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { linearSieve } from '$lib/primes/sieve';
  import { dickmanRho } from '$lib/primes/factor';

  const X = 1_000_000;
  // Largest prime factor of every n ≤ X, from the smallest-prime-factor table.
  const points = (() => {
    const { spf } = linearSieve(X);
    const lpf = new Int32Array(X + 1);
    lpf[1] = 1;
    for (let n = 2; n <= X; n++) {
      const p = spf[n]!;
      lpf[n] = Math.max(p, lpf[n / p]!);
    }
    const sorted = Array.from(lpf.subarray(1)).sort((a, b) => a - b);
    const bounds = [10, 20, 31, 50, 100, 200, 316, 500, 1000, 3162, 10000, 31623, 100000];
    let k = 0;
    return bounds.map((B) => {
      while (k < sorted.length && sorted[k]! <= B) k++;
      return { B, u: Math.log(X) / Math.log(B), frac: k / X };
    });
  })();
  const curve = Array.from({ length: 161 }, (_, i) => {
    const u = 1 + i * 0.03125;
    return { u, r: dickmanRho(u) };
  });
  let hover = $state<{ B: number; u: number; frac: number } | null>(null);
</script>

<Widget title="How rare are smooth numbers?" subtitle="Dots: the proportion of n ≤ 10⁶ with no prime factor above B, for several B. Curve: Dickman’s ρ(u), with u = log x / log B.">
  <Plot
    x={{ domain: [1, 6], label: 'u = log x / log B' }}
    y={{ domain: [1e-4, 1], type: 'log', label: 'proportion that is B-smooth' }}
    height={280}
    label="Proportion of smooth numbers below a million against Dickman's function."
    onpointer={(pt) => (hover = pt ? (points.reduce((a, b) => (Math.abs(b.u - pt.x) < Math.abs(a.u - pt.x) ? b : a)) ?? null) : null)}
  >
    {#snippet marks({ sx, sy })}
      <path class="c" d={'M' + curve.filter((c) => c.r > 1e-4).map((c) => `${sx(c.u)},${sy(c.r)}`).join('L')} />
      {#each points.filter((p) => p.u <= 6) as p (p.B)}
        <circle cx={sx(p.u)} cy={sy(Math.max(1e-4, p.frac))} r={hover === p ? 6 : 4} class="pt" />
      {/each}
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    {#if hover}
      B = {hover.B.toLocaleString('en-GB')} (u = {hover.u.toFixed(2)}): {(hover.frac * 100).toFixed(2)}% of the numbers up to a million are B-smooth; ρ(u) = {(dickmanRho(hover.u) * 100).toFixed(2)}%.
    {:else}
      Point at the chart. {#each [1000, 100, 10] as B, i (B)}{@const pt = points.find((q) => q.B === B)!}{i ? '; ' : ''}B = {B} (u = {pt.u.toFixed(0)}): {(pt.frac * 100).toFixed(pt.frac < 0.01 ? 2 : 1)}% smooth, ρ(u) = {(dickmanRho(pt.u) * 100).toFixed(dickmanRho(pt.u) < 0.01 ? 3 : 1)}%{/each}. For small B, smooth numbers are more common than ρ predicts: ρ is the limit as x → ∞.
    {/if}
  </p>
</Widget>

<style>
  .c {
    fill: none;
    stroke: var(--fg);
    stroke-width: 1.6;
  }
  .pt {
    fill: var(--prime);
    stroke: var(--surface);
    stroke-width: 1.5;
  }
  .out {
    margin: 0.5rem 0 0;
    font-size: 0.86rem;
  }
</style>

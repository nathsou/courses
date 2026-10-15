<!--
  The Goldbach comet. For each even n ≤ N, r(n) = the number of ordered pairs of primes (p, q) with p + q = n.
  The points form bands: n divisible by 3 (and by 5, 7, …) have more representations, as the Hardy–Littlewood factor
  Π_{p | n, p > 2} (p − 1)/(p − 2) predicts. Normalising by the full prediction collapses the comet onto 1.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve, primesUpTo } from '$lib/primes/sieve';

  const NMAX = 40_000;
  const flags = sieve(NMAX);
  const PS = primesUpTo(NMAX);
  const C2 = 0.6601618158468696;
  const data = (() => {
    const out: { n: number; r: number; pred: number; mod3: boolean }[] = [];
    for (let n = 4; n <= NMAX; n += 2) {
      let r = 0;
      for (const p of PS) {
        if (p >= n) break;
        if (flags[n - p]) r++;
      }
      // Hardy–Littlewood: 2C₂ Π_{p | n, p > 2} (p − 1)/(p − 2) ∫₂^{n−2} dt/(log t log(n − t)).
      let factor = 2 * C2;
      let m = n;
      while (m % 2 === 0) m /= 2;
      for (let p = 3; p * p <= m; p += 2) {
        if (m % p === 0) {
          factor *= (p - 1) / (p - 2);
          while (m % p === 0) m /= p;
        }
      }
      if (m > 1) factor *= (m - 1) / (m - 2);
      // ∫₂^{n−2} dt/(log t log(n − t)) = 2∫₂^{n/2}, by Simpson's rule in u = log t (the integrand is steep near t = 2).
      const a = Math.log(2);
      const b = Math.log(n / 2);
      const steps = 200;
      const h = (b - a) / steps;
      const f = (u: number) => Math.exp(u) / (u * Math.log(n - Math.exp(u)));
      let sum = f(a) + f(b);
      for (let i = 1; i < steps; i++) sum += (i % 2 ? 4 : 2) * f(a + i * h);
      const integral = (2 * sum * h) / 3;
      out.push({ n, r, pred: factor * integral, mod3: n % 3 === 0 });
    }
    return out;
  })();
  let N = $state(10_000);
  let normalised = $state(false);
  const shown = $derived(data.filter((d) => d.n <= N));
  const yMax = $derived(normalised ? 2 : Math.max(...shown.map((d) => d.r)) * 1.05);
  const last = $derived(shown[shown.length - 1]!);
  const minR = $derived(Math.min(...shown.filter((d) => d.n >= 6).map((d) => d.r)));
</script>

<Widget title="The Goldbach comet" subtitle="Each dot is an even number n with height r(n), the number of ordered ways to write n = p + q with p, q prime. Red dots: n divisible by 3." onreset={() => ((N = 10_000), (normalised = false))}>
  {#snippet controls()}
    <Segmented label="n up to" bind:value={N} options={[{ value: 1000, label: '10³' }, { value: 10_000, label: '10⁴' }, { value: NMAX, label: '4·10⁴' }]} size="sm" />
    <Toggle bind:checked={normalised} label="divide by the Hardy–Littlewood prediction" />
  {/snippet}
  <Plot x={{ domain: [0, N], label: 'n' }} y={{ domain: [0, yMax], label: normalised ? 'r(n) / prediction' : 'r(n)' }} height={270} label="The Goldbach comet up to {N}.">
    {#snippet marks({ sx, sy })}
      {#if normalised}<line class="one" x1={sx(0)} x2={sx(N)} y1={sy(1)} y2={sy(1)} />{/if}
      {#each shown as d (d.n)}
        <circle cx={sx(d.n)} cy={sy(normalised ? Math.min(2, d.r / d.pred) : d.r)} r={N > 20000 ? 0.8 : 1.2} class:m3={d.mod3} class="pt" />
      {/each}
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    r({last.n.toLocaleString('en-GB')}) = {last.r}; prediction {last.pred.toFixed(1)}. Every even n from 6 to {N.toLocaleString('en-GB')} has at least {minR} representation{minR === 1 ? "" : "s"}. {normalised ? 'Normalised, the bands merge into one cloud around 1.' : 'The upper bands are multiples of 3, then of 5, 7, …: those n have more chances.'}
  </p>
</Widget>

<style>
  .pt {
    fill: var(--fx-blue);
    opacity: 0.55;
  }
  .pt.m3 {
    fill: var(--prime);
  }
  .one {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>

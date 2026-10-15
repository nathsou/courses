<!--
  Robin's criterion: RH holds if and only if σ(n) < e^γ n log log n for every n > 5040. The plot shows
  σ(n)/(n log log n) for n up to N (one dot per n would be too many, so only record-setters and a thinned sample are
  drawn). The 26 exceptions, all ≤ 5040, are red. Gronwall: the lim sup of the ratio is exactly e^γ ≈ 1.781.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sigmaTable } from '$lib/primes/sieve';
  import { EULER_GAMMA } from '$lib/primes/count';

  const NMAX = 1_000_000;
  const sig = sigmaTable(NMAX);
  const EG = Math.exp(EULER_GAMMA);
  let N = $state(100_000);
  const data = $derived.by(() => {
    const records: { n: number; r: number }[] = [];
    const bad: { n: number; r: number }[] = [];
    const cloud: [number, number][] = [];
    let best = 0;
    for (let n = 3; n <= N; n++) {
      const r = sig[n]! / (n * Math.log(Math.log(n)));
      if (r >= EG) bad.push({ n, r });
      if (n > 5040 && r > best) {
        best = r;
        records.push({ n, r });
      }
      if (n % Math.max(1, Math.floor(N / 3000)) === 0) cloud.push([n, r]);
    }
    return { records, bad, cloud };
  });
  const last = $derived(data.records[data.records.length - 1]);
</script>

<Widget title="Robin’s inequality" subtitle="σ(n)/(n log log n), where σ(n) is the sum of the divisors of n. The dashed line is e^γ ≈ 1.781. Red: the 26 numbers n ≥ 3 above it, all at most 5040. RH is equivalent to there being no others." onreset={() => (N = 100_000)}>
  {#snippet controls()}
    <Segmented label="n up to" bind:value={N} options={[{ value: 10_000, label: '10⁴' }, { value: 100_000, label: '10⁵' }, { value: NMAX, label: '10⁶' }]} size="sm" />
  {/snippet}
  <Plot x={{ domain: [3, N], type: 'log', label: 'n' }} y={{ domain: [0.4, 3.6], label: 'σ(n)/(n log log n)' }} height={260} label="Robin's ratio for n up to {N}.">
    {#snippet marks({ sx, sy })}
      {#each data.cloud as [n, r] (n)}<circle cx={sx(n)} cy={sy(Math.min(3.6, r))} r="1.2" class="c" />{/each}
      <line class="eg" x1={sx(3)} x2={sx(N)} y1={sy(EG)} y2={sy(EG)} />
      {#each data.records as p (p.n)}<circle cx={sx(p.n)} cy={sy(p.r)} r="2.6" class="rec" />{/each}
      {#each data.bad as p (p.n)}<circle cx={sx(p.n)} cy={sy(Math.min(3.6, p.r))} r="3.2" class="bad" />{/each}
    {/snippet}
  </Plot>
  <p class="out">
    Above the line: {data.bad.map((p) => p.n).join(', ')}.
    {#if last}Beyond 5040, the record ratio up to {N.toLocaleString('en-GB')} is {last.r.toFixed(4)} at n = {last.n.toLocaleString('en-GB')}, still below e^γ = {EG.toFixed(4)}; the records (blue) creep up towards it.{/if}
  </p>
</Widget>

<style>
  .c {
    fill: var(--mute);
    opacity: 0.35;
  }
  .eg {
    stroke: var(--fg);
    stroke-dasharray: 5 4;
  }
  .rec {
    fill: var(--fx-blue);
  }
  .bad {
    fill: var(--prime);
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>

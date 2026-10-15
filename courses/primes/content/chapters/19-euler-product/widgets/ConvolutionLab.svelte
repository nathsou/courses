<!--
  Dirichlet convolution: (f * g)(n) = Σ_{d | n} f(d) g(n/d). Pick two arithmetic functions, see their convolution
  for n ≤ 30, and whether it is a function on the list. Each function has a Dirichlet series, and convolving
  functions multiplies their series.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { mobiusTable, mangoldtTable, totientTable } from '$lib/primes/sieve';

  const N = 30;
  const mu = mobiusTable(N);
  const lam = mangoldtTable(N);
  const phi = totientTable(N);
  const divisors = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
  const omegaBig = (n: number) => {
    let k = 0;
    for (let p = 2; p * p <= n; p++) while (n % p === 0) ((n /= p), k++);
    return n > 1 ? k + 1 : k;
  };

  interface Fn {
    id: string;
    name: string;
    series: string;
    f: (n: number) => number;
  }
  const FNS: Fn[] = [
    { id: 'eps', name: 'ε (1 at n = 1, else 0)', series: '1', f: (n) => (n === 1 ? 1 : 0) },
    { id: 'one', name: '1 (constant)', series: 'ζ(s)', f: () => 1 },
    { id: 'id', name: 'id (n ↦ n)', series: 'ζ(s − 1)', f: (n) => n },
    { id: 'mu', name: 'μ (Möbius)', series: '1/ζ(s)', f: (n) => mu[n]! },
    { id: 'Lambda', name: 'Λ (von Mangoldt)', series: '−ζ′(s)/ζ(s)', f: (n) => lam[n]! },
    { id: 'log', name: 'log n', series: '−ζ′(s)', f: (n) => Math.log(n) },
    { id: 'phi', name: 'φ (Euler’s totient)', series: 'ζ(s − 1)/ζ(s)', f: (n) => phi[n]! },
    { id: 'd', name: 'd (number of divisors)', series: 'ζ(s)²', f: (n) => divisors(n).length },
    { id: 'sigma', name: 'σ (sum of divisors)', series: 'ζ(s)ζ(s − 1)', f: (n) => divisors(n).reduce((a, b) => a + b, 0) },
    { id: 'liouville', name: 'λ (Liouville, (−1)^Ω(n))', series: 'ζ(2s)/ζ(s)', f: (n) => (omegaBig(n) % 2 ? -1 : 1) },
    { id: 'sqfree', name: '|μ| (square-free indicator)', series: 'ζ(s)/ζ(2s)', f: (n) => Math.abs(mu[n]!) },
  ];
  const byId = Object.fromEntries(FNS.map((x) => [x.id, x]));

  let fId = $state('mu');
  let gId = $state('one');
  let hoverN = $state<number | null>(null);
  const f = $derived(byId[fId]!);
  const g = $derived(byId[gId]!);
  const ns = Array.from({ length: N }, (_, i) => i + 1);
  const h = $derived(ns.map((n) => divisors(n).reduce((acc, d) => acc + f.f(d) * g.f(n / d), 0)));
  const match = $derived(FNS.find((x) => ns.every((n, i) => Math.abs(x.f(n) - h[i]!) < 1e-9)));
  const fmt = (v: number) => (Number.isInteger(Math.round(v * 1e9) / 1e9) ? String(Math.round(v)) : v.toFixed(2));
  const sum = $derived(hoverN === null ? '' : divisors(hoverN).map((d) => `${fmt(f.f(d))}·${fmt(g.f(hoverN! / d))}`).join(' + '));

  const wrap = (t: string) => (/[ /]/.test(t) ? `(${t})` : t);
  const PRESETS = [
    ['mu', 'one', 'Möbius: μ * 1 = ε'],
    ['one', 'one', '1 * 1 = d'],
    ['Lambda', 'one', 'Λ * 1 = log'],
    ['phi', 'one', 'φ * 1 = id'],
    ['mu', 'id', 'μ * id = φ'],
    ['liouville', 'one', 'λ * 1 = ?'],
  ] as const;
</script>

<Widget title="Dirichlet convolution" subtitle="(f * g)(n) = Σ f(d) g(n/d) over the divisors d of n. Convolving two functions multiplies their Dirichlet series." onreset={() => ((fId = 'mu'), (gId = 'one'))}>
  {#snippet controls()}
    <label class="pick ui">f <select bind:value={fId}>{#each FNS as x (x.id)}<option value={x.id}>{x.name}</option>{/each}</select></label>
    <label class="pick ui">g <select bind:value={gId}>{#each FNS as x (x.id)}<option value={x.id}>{x.name}</option>{/each}</select></label>
  {/snippet}
  <div class="presets ui">
    {#each PRESETS as [a, b, text] (text)}
      <button class:on={fId === a && gId === b} onclick={() => ((fId = a), (gId = b))}>{text}</button>
    {/each}
  </div>
  <div class="scroll">
    <table>
      <tbody>
        <tr><th>n</th>{#each ns as n (n)}<td class:hl={hoverN === n} onpointerenter={() => (hoverN = n)} onpointerleave={() => (hoverN = null)}>{n}</td>{/each}</tr>
        <tr><th>f</th>{#each ns as n (n)}<td class:hl={hoverN === n}>{fmt(f.f(n))}</td>{/each}</tr>
        <tr><th>g</th>{#each ns as n (n)}<td class:hl={hoverN === n}>{fmt(g.f(n))}</td>{/each}</tr>
        <tr class="res"><th>f * g</th>{#each ns as n, i (n)}<td class:hl={hoverN === n} onpointerenter={() => (hoverN = n)} onpointerleave={() => (hoverN = null)}>{fmt(h[i]!)}</td>{/each}</tr>
      </tbody>
    </table>
  </div>
  <p class="out" aria-live="polite">
    {#if hoverN !== null}
      (f * g)({hoverN}) = {sum} = {fmt(h[hoverN - 1]!)}.
    {:else if match}
      f * g = <strong>{match.name.split(' (')[0]}</strong>. In series: {wrap(f.series)} × {wrap(g.series)} = {match.series}.
    {:else}
      f * g is not on the list. Its series is {wrap(f.series)} × {wrap(g.series)}.
    {/if}
  </p>
</Widget>

<style>
  .pick {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.82rem;
    font-weight: 600;
  }
  select {
    font: inherit;
    font-weight: 400;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    max-width: 14rem;
  }
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
  .presets button.on {
    border-color: var(--prime);
    color: var(--prime);
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.74rem;
  }
  th {
    font-family: var(--font-ui);
    text-align: left;
    padding: 0.2rem 0.5rem 0.2rem 0;
    white-space: nowrap;
    position: sticky;
    left: 0;
    background: var(--surface);
  }
  td {
    text-align: right;
    padding: 0.2rem 0.35rem;
    border-left: 1px solid var(--ruling);
    min-width: 1.6rem;
  }
  tr:first-child td {
    color: var(--mute);
    cursor: default;
  }
  tr.res td {
    font-weight: 700;
    color: var(--prime);
    border-top: 1px solid var(--rule);
  }
  td.hl {
    background: var(--hl, color-mix(in srgb, var(--fx-blue) 14%, transparent));
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
    overflow-wrap: anywhere;
  }
</style>

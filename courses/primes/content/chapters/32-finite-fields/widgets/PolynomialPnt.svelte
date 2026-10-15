<!--
  The prime number theorem for polynomials over F_q. The number of monic irreducible polynomials of degree n is
  I_n = (1/n) Σ_{d | n} μ(d) q^(n/d), exactly, so I_n = q^n/n + O(q^(n/2)/n): the "primes" of F_q[T] obey their PNT with
  a Riemann-Hypothesis-quality error, because the zeta function of F_q[T], 1/(1 − q^(1−s)), has no zeros at all.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { mobiusTable } from '$lib/primes/sieve';

  const mu = mobiusTable(40);
  let q = $state(2);
  const rows = $derived(
    Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
      let s = 0n;
      for (let d = 1; d <= n; d++) if (n % d === 0 && mu[d]) s += BigInt(mu[d]!) * BigInt(q) ** BigInt(n / d);
      const I = s / BigInt(n);
      const main = q ** n / n;
      const err = Number(I) - main;
      return { n, I, main, rel: err / (q ** (n / 2) / n) };
    }),
  );
  const fmt = (x: bigint) => x.toLocaleString('en-GB');
</script>

<Widget title="Counting irreducible polynomials" subtitle="Iₙ, the number of monic irreducible polynomials of degree n with coefficients in the field with q elements, against qⁿ/n. The last column measures the error in units of q^(n/2)/n, the size the Riemann Hypothesis would predict." onreset={() => (q = 2)}>
  {#snippet controls()}
    <Segmented label="q" bind:value={q} options={[{ value: 2, label: 'q = 2' }, { value: 3, label: '3' }, { value: 5, label: '5' }, { value: 7, label: '7' }]} size="sm" />
  {/snippet}
  <div class="scroll">
    <table>
      <thead><tr><th>n</th><th>Iₙ</th><th>qⁿ/n</th><th>(Iₙ − qⁿ/n) ÷ (q^(n/2)/n)</th></tr></thead>
      <tbody>
        {#each rows as r (r.n)}
          <tr><td>{r.n}</td><td>{fmt(r.I)}</td><td>{r.main < 1e15 ? r.main.toLocaleString('en-GB', { maximumFractionDigits: 1 }) : r.main.toExponential(4)}</td><td class:neg={r.rel < 0}>{r.rel.toFixed(3)}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="out">The error column stays between −1.25 and 0, never growing: the main correction is −q^(n/2)/n when n is even (from d = 2), and much smaller when n is odd.</p>
</Widget>

<style>
  .scroll {
    overflow-x: auto;
    max-height: 22rem;
    overflow-y: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }
  th,
  td {
    text-align: right;
    padding: 0.2rem 0.6rem;
    border-bottom: 1px solid var(--ruling);
    white-space: nowrap;
  }
  th {
    font-family: var(--font-ui);
    font-weight: 600;
    position: sticky;
    top: 0;
    background: var(--surface);
  }
  td.neg {
    color: var(--prime);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>

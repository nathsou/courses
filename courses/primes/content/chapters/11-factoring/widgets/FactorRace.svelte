<!--
  Four factoring methods on the same number, each with a time limit: trial division, Fermat's difference of
  squares, Pollard's ρ and Pollard's p − 1. Presets are chosen so that each method has a number it is best at.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { gcdBig, isqrtBig, modPowBig } from '$lib/primes/arith';
  import { isPrime } from '$lib/primes/primality';
  import { primesUpTo } from '$lib/primes/sieve';

  const PRESETS: { n: string; label: string }[] = [
    { n: '10403', label: '101 · 103' },
    { n: '999962000357', label: '999,979 · 999,983' },
    { n: '4000000047000000133', label: '(10⁹ + 7)(4·10⁹ + 19)' },
    { n: '23645300015417145622609836592762539461851639', label: '44 digits, a factor p with smooth p − 1' },
    { n: '18446744073709551617', label: '2⁶⁴ + 1' },
    { n: '1522605027922533360535618378132637429718068114961380688657908494580122963258952897654000350692006139', label: 'RSA-100' },
  ];
  let text = $state(PRESETS[2]!.n);
  let parsed = $state<bigint | null>(4000000047000000133n);
  let rows = $state<{ name: string; result: string; ms: number; ok: boolean }[]>([]);
  let running = $state(false);

  const LIMIT = 1500;

  function trial(n: bigint) {
    const t0 = performance.now();
    if (n % 2n === 0n) return 2n;
    for (let d = 3n; d * d <= n; d += 2n) {
      if (n % d === 0n) return d;
      if ((d & 0xffffn) === 1n && performance.now() - t0 > LIMIT) return null;
    }
    return n;
  }
  function fermat(n: bigint) {
    const t0 = performance.now();
    if (n % 2n === 0n) return 2n;
    let a = isqrtBig(n);
    if (a * a < n) a++;
    for (let i = 0; ; i++) {
      const b2 = a * a - n;
      const b = isqrtBig(b2);
      if (b * b === b2) return a - b;
      a++;
      if ((i & 0x3ff) === 0 && performance.now() - t0 > LIMIT) return null;
    }
  }
  function rho(n: bigint) {
    const t0 = performance.now();
    if (n % 2n === 0n) return 2n;
    for (let c = 1n; c < 20n; c++) {
      let x = 2n;
      let y = 2n;
      for (let i = 0; ; i++) {
        x = (x * x + c) % n;
        y = (y * y + c) % n;
        y = (y * y + c) % n;
        const g = gcdBig(x > y ? x - y : y - x, n);
        if (g === n) break;
        if (g > 1n) return g;
        if ((i & 0x3ff) === 0 && performance.now() - t0 > LIMIT) return null;
      }
    }
    return null;
  }
  function pMinus1(n: bigint) {
    const t0 = performance.now();
    let a = 2n;
    for (const p of primesUpTo(1_000_000)) {
      let q = p;
      while (q * p <= 1_000_000) q *= p;
      a = modPowBig(a, BigInt(q), n);
      if (p % 1024 === 1) {
        const g = gcdBig(a - 1n, n);
        if (g > 1n && g < n) return g;
        if (performance.now() - t0 > LIMIT) return null;
      }
    }
    const g = gcdBig(a - 1n, n);
    return g > 1n && g < n ? g : null;
  }
  const METHODS = [
    { name: 'Trial division', run: trial },
    { name: 'Fermat (difference of squares)', run: fermat },
    { name: 'Pollard ρ', run: rho },
    { name: 'Pollard p − 1 (B = 10⁶)', run: pMinus1 },
  ];
  async function race() {
    if (parsed === null || parsed < 4n) return;
    const n = parsed;
    running = true;
    rows = [];
    if (isPrime(n)) {
      rows = [{ name: 'Miller–Rabin', result: 'n is prime: nothing to factor', ms: 0, ok: true }];
      running = false;
      return;
    }
    for (const m of METHODS) {
      await new Promise((r) => setTimeout(r, 20));
      const t = performance.now();
      const f = m.run(n);
      const ms = performance.now() - t;
      const ok = f !== null && f > 1n && f < n;
      rows = [...rows, { name: m.name, result: ok ? `${f} × ${n / f!}` : f === n ? 'n looks prime to it' : `gave up after ${LIMIT / 1000} s`, ms, ok }];
    }
    running = false;
  }
</script>

<Widget title="A factoring race" subtitle="Each method gets 1.5 seconds. Different numbers favour different methods; RSA-100 (330 bits) defeats them all.">
  {#snippet controls()}
    <NumberInput label="n" bind:value={text} bind:parsed min={4n} width="34ch" />
    <Button variant="primary" onclick={race} disabled={running}>{running ? 'Racing…' : 'Factor'}</Button>
    <div class="presets ui" role="group" aria-label="Examples">
      {#each PRESETS as p (p.n)}<button onclick={() => (text = p.n)}>{p.label}</button>{/each}
    </div>
  {/snippet}
  {#if rows.length}
    <table>
      <thead><tr><th>method</th><th>result</th><th>time</th></tr></thead>
      <tbody>
        {#each rows as r (r.name)}<tr class:ok={r.ok}><td>{r.name}</td><td class="res">{r.result}</td><td class="num">{r.ms.toFixed(0)} ms</td></tr>{/each}
      </tbody>
    </table>
  {:else}
    <p class="hint">Pick an example and press <em>Factor</em>. The whole race can take up to six seconds.</p>
  {/if}
</Widget>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    flex-basis: 100%;
  }
  .presets button {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
    cursor: pointer;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.82rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid var(--ruling);
    vertical-align: top;
  }
  .res {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    overflow-wrap: anywhere;
    color: var(--ink-3);
  }
  tr.ok .res {
    color: var(--ok);
    font-weight: 600;
  }
  .num {
    font-family: var(--font-mono);
    white-space: nowrap;
    text-align: right;
  }
  .hint {
    color: var(--mute);
    font-size: 0.85rem;
  }
</style>

<!--
  Time several sieves in your own browser: the plain sieve, the odd-only sieve, a 2·3·5 wheel, the linear sieve
  and a segmented sieve, all counting the primes up to N. Timings are your machine's, so they vary.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { countPrimesInRange, linearSieve } from '$lib/primes/sieve';

  let N = $state(10_000_000);
  let rows = $state<{ name: string; count: number; ms: number; memory: string }[]>([]);
  let running = $state(false);

  function plain(n: number) {
    const s = new Uint8Array(n + 1);
    let c = 0;
    for (let p = 2; p <= n; p++) {
      if (s[p]) continue;
      c++;
      for (let m = p * p; m <= n; m += p) s[m] = 1;
    }
    return c;
  }
  function oddOnly(n: number) {
    // index i stands for 2i + 1
    const size = (n - 1) >> 1;
    const s = new Uint8Array(size + 1);
    let c = n >= 2 ? 1 : 0;
    for (let i = 1; i <= size; i++) {
      if (s[i]) continue;
      c++;
      const p = 2 * i + 1;
      for (let m = (p * p - 1) >> 1; m <= size; m += p) s[m] = 1;
    }
    return c;
  }
  function wheel30(n: number) {
    // Only numbers coprime to 30 are stored: 8 residues per block of 30.
    const RES = [1, 7, 11, 13, 17, 19, 23, 29];
    const idx = new Int8Array(30).fill(-1);
    RES.forEach((r, i) => (idx[r] = i));
    const blocks = Math.floor(n / 30) + 1;
    const s = new Uint8Array(blocks * 8);
    const num = (j: number) => 30 * Math.floor(j / 8) + RES[j % 8]!;
    let c = [2, 3, 5].filter((p) => p <= n).length;
    for (let j = 1; j < s.length; j++) {
      const p = num(j);
      if (p > n) break;
      if (s[j]) continue;
      c++;
      if (p * p > n) continue;
      for (let m = p * p; m <= n; m += 2 * p) {
        const k = idx[m % 30]!;
        if (k >= 0) s[Math.floor(m / 30) * 8 + k] = 1;
      }
    }
    return c;
  }
  const VARIANTS: { name: string; run: (n: number) => number; memory: (n: number) => string }[] = [
    { name: 'Plain sieve', run: plain, memory: (n) => `${(n / 1e6).toFixed(0)} MB` },
    { name: 'Odd numbers only', run: oddOnly, memory: (n) => `${(n / 2e6).toFixed(0)} MB` },
    { name: 'Wheel mod 30 (8 of every 30)', run: wheel30, memory: (n) => `${((n * 8) / 30e6).toFixed(1)} MB` },
    { name: 'Linear sieve (smallest factors)', run: (n) => linearSieve(n).primes.length, memory: (n) => `${((n * 4) / 1e6).toFixed(0)} MB + primes` },
    { name: 'Segmented (64 KB blocks)', run: (n) => countPrimesInRange(1, n), memory: () => '64 KB + √N' },
  ];

  async function race() {
    running = true;
    rows = [];
    for (const v of VARIANTS) {
      await new Promise((r) => setTimeout(r, 20));
      const t = performance.now();
      const count = v.run(N);
      rows = [...rows, { name: v.name, count, ms: performance.now() - t, memory: v.memory(N) }];
    }
    running = false;
  }
  const best = $derived(rows.length ? Math.min(...rows.map((r) => r.ms)) : 1);
</script>

<Widget title="A sieve race" subtitle="Count the primes up to N five ways, timed in your browser. All five must agree on the count.">
  {#snippet controls()}
    <Segmented label="N" bind:value={N} options={[{ value: 1_000_000, label: '10⁶' }, { value: 10_000_000, label: '10⁷' }, { value: 30_000_000, label: '3 × 10⁷' }]} size="sm" />
    <Button variant="primary" onclick={race} disabled={running}>{running ? 'Running…' : 'Run'}</Button>
  {/snippet}
  {#if rows.length}
    <table>
      <thead><tr><th>method</th><th>π(N)</th><th>time</th><th>memory</th></tr></thead>
      <tbody>
        {#each rows as r (r.name)}
          <tr>
            <td>{r.name}</td>
            <td class="num">{r.count.toLocaleString('en-GB')}</td>
            <td class="num"><span class="bar" style:width="{Math.min(100, (best / r.ms) * 100)}%"></span><span class="t">{r.ms.toFixed(0)} ms</span></td>
            <td class="num">{r.memory}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="hint">Press <em>Run</em>. The 3 × 10⁷ race takes a few seconds and briefly freezes the page.</p>
  {/if}
</Widget>

<style>
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
  }
  th {
    font-weight: 600;
  }
  .num {
    font-family: var(--font-mono);
    text-align: right;
    white-space: nowrap;
  }
  td.num {
    position: relative;
  }
  .bar {
    position: absolute;
    right: 0;
    top: 15%;
    height: 70%;
    background: var(--accent-soft);
    z-index: 0;
    max-width: 100%;
  }
  .t {
    position: relative;
  }
  .hint {
    color: var(--mute);
    font-size: 0.85rem;
  }
</style>

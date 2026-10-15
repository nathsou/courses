<!--
  Long gaps between primes. Left: n! + 2, …, n! + n are all composite (k divides n! + k). Right: the record gaps
  that actually occur below 10^7, found by sieving — much smaller than n! suggests.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { sieve } from '$lib/primes/sieve';

  let n = $state(6);
  const fact = $derived.by(() => {
    let f = 1n;
    for (let k = 2n; k <= BigInt(n); k++) f *= k;
    return f;
  });
  const run = $derived(Array.from({ length: n - 1 }, (_, i) => i + 2));

  // Record gaps below 10^7 (computed once).
  const records = (() => {
    const N = 10_000_000;
    const s = sieve(N);
    const out: { p: number; gap: number }[] = [];
    let prev = 2;
    let best = 0;
    for (let k = 3; k <= N; k++) {
      if (!s[k]) continue;
      if (k - prev > best) {
        best = k - prev;
        out.push({ p: prev, gap: best });
      }
      prev = k;
    }
    return out;
  })();
  const short = (v: bigint) => {
    const t = v.toString();
    return t.length > 16 ? `${t.slice(0, 6)}…${t.slice(-6)}` : t;
  };
</script>

<Widget title="Gaps as long as you like" subtitle="Left: a run of n − 1 consecutive composites starting at n! + 2. Right: the record gaps that really occur below ten million." onreset={() => (n = 6)}>
  {#snippet controls()}
    <Slider label="n" bind:value={n} min={3} max={20} step={1} format={(v) => String(v)} />
  {/snippet}
  <div class="cols">
    <div>
      <p class="h">n! = {fact.toLocaleString('en-GB')}</p>
      <ul class="run">
        {#each run as k (k)}
          <li><span class="num">n! + {k}</span> <span class="div">divisible by {k}</span></li>
        {/each}
      </ul>
      <p class="note">{n - 1} composites in a row, starting at {short(fact + 2n)}.</p>
    </div>
    <div>
      <p class="h">Record gaps below 10⁷</p>
      <div class="scroll">
        <table>
          <thead><tr><th>gap</th><th>after the prime</th></tr></thead>
          <tbody>
            {#each records as r (r.p)}
              <tr class:hl={r.gap >= n && records.find((x) => x.gap >= n) === r}><td>{r.gap}</td><td>{r.p.toLocaleString('en-GB')}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="note">The first gap of length at least {n} actually appears after {records.find((x) => x.gap >= n)?.p.toLocaleString('en-GB') ?? '?'}.</p>
    </div>
  </div>
</Widget>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1rem 1.5rem;
  }
  .h {
    margin: 0 0 0.4rem;
    font-weight: 600;
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
  .run {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    max-height: 13rem;
    overflow-y: auto;
  }
  .run li {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.12rem 0;
    border-bottom: 1px solid var(--ruling);
  }
  .div {
    color: var(--fx-blue);
  }
  .scroll {
    max-height: 13rem;
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
    padding: 0.12rem 0.5rem;
    border-bottom: 1px solid var(--ruling);
  }
  th {
    font-family: var(--font-ui);
    font-weight: 600;
  }
  tr.hl td {
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-weight: 600;
  }
  .note {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
</style>

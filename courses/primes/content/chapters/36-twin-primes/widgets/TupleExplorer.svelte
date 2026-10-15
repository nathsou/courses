<!--
  Admissible tuples. A set of shifts H = {h₁, …, h_k} is admissible if for every prime p some residue modulo p is
  missed by all the hᵢ (only p ≤ k need checking). The prime k-tuples conjecture predicts how many n ≤ x make every
  n + hᵢ prime: 𝔖(H) ∫₂^x dt/log^k t. Type shifts or pick a preset; the widget checks admissibility and counts.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { sieve, primesUpTo } from '$lib/primes/sieve';

  const N = 10_000_000;
  const flags = sieve(N + 100);
  const SMALL = primesUpTo(100_000);
  const PRESETS = [
    { label: 'twins', h: '0 2' },
    { label: 'cousins', h: '0 4' },
    { label: 'sexy', h: '0 6' },
    { label: 'triplets', h: '0 2 6' },
    { label: 'other triplets', h: '0 4 6' },
    { label: 'quadruplets', h: '0 2 6 8' },
    { label: 'quintuplets', h: '0 2 6 8 12' },
    { label: 'not admissible', h: '0 2 4' },
  ];
  let text = $state('0 2 6');
  const H = $derived([...new Set(text.split(/[\s,]+/).filter(Boolean).map(Number).filter((v) => Number.isInteger(v) && v >= 0 && v <= 80))].sort((a, b) => a - b));
  const blocker = $derived(SMALL.filter((p) => p <= Math.max(2, H.length)).find((p) => new Set(H.map((h) => h % p)).size === p));
  const singular = $derived.by(() => {
    if (blocker !== undefined || H.length === 0) return 0;
    const k = H.length;
    let s = 1;
    for (const p of SMALL) {
      const nu = new Set(H.map((h) => h % p)).size;
      s *= (1 - nu / p) / Math.pow(1 - 1 / p, k);
    }
    return s;
  });
  const count = $derived.by(() => {
    if (H.length === 0) return { n: 0, first: [] as number[] };
    const top = H[H.length - 1]!;
    let n = 0;
    const first: number[] = [];
    for (let m = 2; m + top <= N; m++) {
      let ok = true;
      for (const h of H) {
        if (!flags[m + h]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        n++;
        if (first.length < 6) first.push(m);
      }
    }
    return { n, first };
  });
  const predicted = $derived.by(() => {
    if (!singular) return 0;
    const k = H.length;
    // ∫₂^N dt/log^k t by Simpson in u = log t.
    const a = Math.log(2);
    const b = Math.log(N);
    const m = 2000;
    const h = (b - a) / m;
    const f = (u: number) => Math.exp(u) / Math.pow(u, k);
    let s = f(a) + f(b);
    for (let i = 1; i < m; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
    return (singular * s * h) / 3;
  });
</script>

<Widget title="Admissible patterns" subtitle="Shifts h₁, …, h_k (between 0 and 80). The pattern n + h₁, …, n + h_k can be all prime infinitely often only if no prime p sees every residue among the hᵢ. Counts are for n + h_k ≤ 10⁷." onreset={() => (text = '0 2 6')}>
  <div class="presets ui">
    {#each PRESETS as p (p.label)}
      <button class:on={text === p.h} onclick={() => (text = p.h)}>{p.label}</button>
    {/each}
  </div>
  <label class="field ui">Shifts <input type="text" bind:value={text} spellcheck="false" aria-label="Shifts, separated by spaces" /></label>
  <div class="result" class:bad={blocker !== undefined}>
    {#if H.length === 0}
      Type some shifts.
    {:else if blocker !== undefined}
      <strong>Not admissible:</strong> the shifts {H.join(', ')} cover every residue modulo {blocker}, so one of n + hᵢ is always divisible by {blocker}. The only possible occurrences have n + hᵢ = {blocker} for some i. Found {count.n}{count.first.length ? ` (n = ${count.first.join(', ')})` : ''}.
    {:else}
      <strong>Admissible</strong> (k = {H.length}, diameter {H[H.length - 1]! - H[0]!}). Singular series 𝔖 = {singular.toFixed(4)}.
      Up to 10⁷: <strong>{count.n.toLocaleString('en-GB')}</strong> occurrences{count.first.length ? `, starting n = ${count.first.join(', ')}` : ''}; the Hardy–Littlewood prediction 𝔖∫dt/log^k t is {Math.round(predicted).toLocaleString('en-GB')}{count.n ? ` (ratio ${(count.n / predicted).toFixed(3)})` : ''}.
    {/if}
  </div>
</Widget>

<style>
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
  .field {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.84rem;
    font-weight: 600;
  }
  input {
    flex: 1;
    max-width: 24rem;
    font-family: var(--font-mono);
    font-size: 0.9rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
  }
  .result {
    margin-top: 0.7rem;
    padding: 0.6rem 0.8rem;
    border-left: 4px solid var(--ok);
    background: var(--ok-soft);
    font-size: 0.86rem;
    line-height: 1.5;
  }
  .result.bad {
    border-left-color: var(--bad);
    background: var(--bad-soft);
  }
</style>

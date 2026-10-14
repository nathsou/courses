<!--
  The Chinese remainder theorem as a grid: the integer k sits in column k mod m and row k mod n. Counting
  0, 1, 2, … walks diagonally and wraps around; it visits every cell exactly when gcd(m, n) = 1.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { gcd, lcm } from '$lib/primes/arith';

  let m = $state(3);
  let n = $state(5);
  let pick = $state<[number, number] | null>([2, 3]);

  const cell = $derived(Math.max(22, Math.min(40, Math.floor(460 / Math.max(m, n)))));
  const table = $derived.by(() => {
    const t: (number | null)[][] = Array.from({ length: n }, () => Array<number | null>(m).fill(null));
    for (let k = 0; k < lcm(m, n); k++) t[k % n]![k % m] = k;
    return t;
  });
  const g = $derived(gcd(m, n));
  const answer = $derived(pick ? table[pick[1]]![pick[0]] : null);
</script>

<Widget title="The remainder grid" subtitle="Write k in the column k mod m and the row k mod n. Click a cell: is there a number with those two remainders?" onreset={() => ((m = 3), (n = 5), (pick = [2, 3]))}>
  {#snippet controls()}
    <Slider label="m (columns)" bind:value={m} min={2} max={12} step={1} format={(v) => String(v)} oninput={() => (pick = null)} />
    <Slider label="n (rows)" bind:value={n} min={2} max={12} step={1} format={(v) => String(v)} oninput={() => (pick = null)} />
  {/snippet}
  <div class="scroll">
    <table style:--c="{cell}px">
      <thead><tr><th>mod {n} ↓ / mod {m} →</th>{#each Array.from({ length: m }) as _, x (x)}<th>{x}</th>{/each}</tr></thead>
      <tbody>
        {#each table as row, y (y)}
          <tr>
            <th>{y}</th>
            {#each row as v, x (x)}
              <td class:empty={v === null} class:on={pick && pick[0] === x && pick[1] === y}>
                <button onclick={() => (pick = [x, y])} aria-label="Remainder {x} mod {m} and {y} mod {n}">{v ?? '·'}</button>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="out" aria-live="polite">
    {#if pick}
      {#if answer !== null}
        k ≡ {pick[0]} (mod {m}) and k ≡ {pick[1]} (mod {n}): <strong>k ≡ {answer} (mod {lcm(m, n)})</strong>.
      {:else}
        No integer leaves remainder {pick[0]} mod {m} and {pick[1]} mod {n}: since gcd({m}, {n}) = {g}, the two remainders would have to agree mod {g}.
      {/if}
    {/if}
    {#if g === 1}Every cell is filled: {m} and {n} are coprime, so each pair of remainders occurs exactly once among 0, …, {m * n - 1}.{:else}Only {lcm(m, n)} of the {m * n} cells are filled, because gcd({m}, {n}) = {g}.{/if}
  </p>
</Widget>

<style>
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    margin: 0 auto;
  }
  th {
    font-weight: 500;
    color: var(--mute);
    padding: 0 0.4rem;
    font-size: 0.7rem;
    white-space: nowrap;
  }
  td {
    width: var(--c);
    height: var(--c);
    padding: 0;
    border: 1px solid var(--ruling);
  }
  td button {
    width: 100%;
    height: 100%;
    border: 0;
    background: color-mix(in srgb, var(--fx-blue) 12%, var(--surface));
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  td.empty button {
    background: var(--pn);
    color: var(--ink-3);
  }
  td.on button {
    background: var(--prime);
    color: var(--on-accent);
    font-weight: 700;
  }
  .out {
    margin: 0.7rem 0 0;
    font-size: 0.86rem;
  }
</style>

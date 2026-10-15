<!--
  The extended Euclidean algorithm as a table. Each row keeps the invariant r = a·x + b·y; the last non-zero r
  is the gcd, and its row gives Bézout's coefficients. Works on integers of any size (bigint).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';

  let ta = $state('240');
  let tb = $state('46');
  let pa = $state<bigint | null>(240n);
  let pb = $state<bigint | null>(46n);

  const rows = $derived.by(() => {
    if (pa === null || pb === null || pa < 0n || pb < 0n) return null;
    const out: { r: bigint; q: bigint | null; x: bigint; y: bigint }[] = [
      { r: pa, q: null, x: 1n, y: 0n },
      { r: pb, q: null, x: 0n, y: 1n },
    ];
    while (out.at(-1)!.r !== 0n && out.length < 200) {
      const p = out.at(-2)!;
      const c = out.at(-1)!;
      const q = p.r / c.r;
      c.q = q;
      out.push({ r: p.r - q * c.r, q: null, x: p.x - q * c.x, y: p.y - q * c.y });
    }
    return out;
  });
  const g = $derived(rows ? rows.at(-2) ?? rows[0]! : null);
</script>

<Widget title="Extended Euclid" subtitle="Every row satisfies r = a·x + b·y. Each new row is the row two above minus q times the row above. The last non-zero r is the gcd, with its Bézout coefficients beside it.">
  {#snippet controls()}
    <NumberInput label="a" bind:value={ta} bind:parsed={pa} min={0n} width="16ch" />
    <NumberInput label="b" bind:value={tb} bind:parsed={pb} min={0n} width="16ch" />
  {/snippet}
  {#if rows && g}
    <div class="scroll">
      <table>
        <thead><tr><th>r</th><th>q</th><th>x</th><th>y</th><th class="check">check: a·x + b·y</th></tr></thead>
        <tbody>
          {#each rows as row, i (i)}
            <tr class:gcd={row === g && row.r !== 0n} class:zero={row.r === 0n}>
              <td>{row.r}</td>
              <td>{row.q ?? ''}</td>
              <td>{row.x}</td>
              <td>{row.y}</td>
              <td class="check">{pa! * row.x + pb! * row.y === row.r ? '✓' : '✗'} {pa! * row.x + pb! * row.y}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="out" aria-live="polite">
      gcd({pa}, {pb}) = <strong>{g.r}</strong> = {pa}·({g.x}) + {pb}·({g.y})
    </p>
  {:else}
    <p>Enter two non-negative integers.</p>
  {/if}
</Widget>

<style>
  .scroll {
    overflow-x: auto;
    max-height: 22rem;
  }
  table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
    min-width: 100%;
  }
  th,
  td {
    text-align: right;
    padding: 0.25rem 0.7rem;
    border-bottom: 1px solid var(--ruling);
    white-space: nowrap;
  }
  th {
    font-family: var(--font-ui);
    font-weight: 600;
    border-bottom: 1.5px solid var(--fg);
  }
  .check {
    color: var(--mute);
    text-align: left;
  }
  tr.gcd td {
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-weight: 600;
  }
  tr.zero td {
    color: var(--ink-3);
  }
  .out {
    margin: 0.75rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.88rem;
    overflow-wrap: anywhere;
  }
</style>

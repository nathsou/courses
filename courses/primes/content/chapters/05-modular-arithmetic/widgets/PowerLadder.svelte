<!--
  Exponentiation by squaring, traced. Read the exponent's bits from the left: square for every bit, multiply by
  the base for every 1. Big numbers are bigints, so try a 300-digit modulus.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';

  let tb = $state('7');
  let te = $state('560');
  let tm = $state('561');
  let b = $state<bigint | null>(7n);
  let e = $state<bigint | null>(560n);
  let m = $state<bigint | null>(561n);

  const trace = $derived.by(() => {
    if (b === null || e === null || m === null || m < 1n || e < 0n) return null;
    const bits = e.toString(2);
    const rows: { bit: string; prefix: string; value: bigint; op: string }[] = [];
    let r = 1n % m;
    let prefix = '';
    for (const bit of bits) {
      r = (r * r) % m;
      let op = 'square';
      prefix += bit;
      if (bit === '1') {
        r = (r * (((b % m) + m) % m)) % m;
        op = 'square, × base';
      }
      rows.push({ bit, prefix, value: r, op });
    }
    return { bits, rows, result: e === 0n ? 1n % m : r, mults: rows.length + rows.filter((x) => x.bit === '1').length };
  });
  const short = (v: bigint | string) => {
    const s = v.toString();
    return s.length > 24 ? `${s.slice(0, 10)}…${s.slice(-10)}` : s;
  };
</script>

<Widget title="Exponentiation by squaring" subtitle="Compute b^e mod m by reading e in binary from the left: square at every bit, and also multiply by b when the bit is 1. The partial exponent doubles (or doubles plus one) at each step.">
  {#snippet controls()}
    <NumberInput label="base b" bind:value={tb} bind:parsed={b} width="10ch" />
    <NumberInput label="exponent e" bind:value={te} bind:parsed={e} min={0n} width="16ch" />
    <NumberInput label="modulus m" bind:value={tm} bind:parsed={m} min={1n} width="16ch" />
  {/snippet}
  {#if trace}
    <p class="bits">e = {short(e!)} = <span class="mono">{trace.bits.length > 64 ? `${trace.bits.slice(0, 32)}…` : trace.bits}</span><sub>2</sub> ({trace.bits.length} bits)</p>
    <div class="scroll">
      <table>
        <thead><tr><th>bit</th><th>exponent so far</th><th>step</th><th>b<sup>exponent</sup> mod m</th></tr></thead>
        <tbody>
          {#each trace.rows.slice(0, 40) as r, i (i)}
            <tr><td class:one={r.bit === '1'}>{r.bit}</td><td>{short(BigInt('0b' + r.prefix))}</td><td>{r.op}</td><td>{short(r.value)}</td></tr>
          {/each}
        </tbody>
      </table>
      {#if trace.rows.length > 40}<p class="more">… {trace.rows.length - 40} more rows</p>{/if}
    </div>
    <p class="out" aria-live="polite">{short(b!)}^{short(e!)} mod {short(m!)} = <strong>{short(trace.result)}</strong>, using {trace.mults} modular multiplications instead of {e! > 10n ** 12n ? 'about ' + short(e!) : short(e! - 1n)}.</p>
  {:else}
    <p>Enter a base, a non-negative exponent and a positive modulus.</p>
  {/if}
</Widget>

<style>
  .bits {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .scroll {
    max-height: 18rem;
    overflow: auto;
  }
  table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    width: 100%;
  }
  th,
  td {
    text-align: right;
    padding: 0.15rem 0.6rem;
    border-bottom: 1px solid var(--ruling);
    white-space: nowrap;
  }
  th {
    font-family: var(--font-ui);
    font-weight: 600;
  }
  td.one {
    color: var(--accent);
    font-weight: 700;
  }
  .more {
    font-size: 0.78rem;
    color: var(--mute);
  }
  .out {
    margin: 0.6rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
</style>

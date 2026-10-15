<!--
  The multiplication table of ℤ/nℤ. Units (numbers coprime to n) are marked; the cells where a·b ≡ 1 show their
  inverses, and the zero cells off the axes show zero divisors when n is composite.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { gcd } from '$lib/primes/arith';

  let n = $state(12);
  let op = $state<'mul' | 'add'>('mul');
  let hover = $state<[number, number] | null>(null);

  const cells = $derived(Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => (op === 'mul' ? (a * b) % n : (a + b) % n))));
  const units = $derived(Array.from({ length: n }, (_, a) => gcd(a, n) === 1));
  const unitCount = $derived(units.filter(Boolean).length);
  const zeroDivisors = $derived(op === 'mul' ? Array.from({ length: n }, (_, a) => a).filter((a) => a > 0 && cells[a]!.some((v, b) => b > 0 && v === 0)) : []);
  const size = $derived(n <= 12 ? 30 : n <= 20 ? 22 : 16);
</script>

<Widget title="Arithmetic on a clock" subtitle="The table of a · b (or a + b) modulo n. Rows and columns of units are shaded; a red cell is a product equal to 1, which pairs a unit with its inverse." onreset={() => ((n = 12), (op = 'mul'))}>
  {#snippet controls()}
    <Slider label="n" bind:value={n} min={2} max={30} step={1} format={(v) => String(v)} />
    <Segmented label="Operation" bind:value={op} options={[{ value: 'mul', label: 'a × b' }, { value: 'add', label: 'a + b' }]} />
  {/snippet}
  <div class="scroll">
    <table style:--s="{size}px" onpointerleave={() => (hover = null)}>
      <thead>
        <tr><th class="corner">{op === 'mul' ? '×' : '+'}</th>{#each cells as _, b (b)}<th class:unit={op === 'mul' && units[b]}>{b}</th>{/each}</tr>
      </thead>
      <tbody>
        {#each cells as row, a (a)}
          <tr>
            <th class:unit={op === 'mul' && units[a]}>{a}</th>
            {#each row as v, b (b)}
              <td
                class:one={op === 'mul' && v === 1}
                class:zero={op === 'mul' && v === 0 && a > 0 && b > 0}
                class:unitrow={op === 'mul' && units[a] && units[b]}
                class:hl={hover && (hover[0] === a || hover[1] === b)}
                onpointerenter={() => (hover = [a, b])}
              >{n <= 20 ? v : ''}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="out" aria-live="polite">
    {#if hover}
      {hover[0]} {op === 'mul' ? '×' : '+'} {hover[1]} ≡ {cells[hover[0]]![hover[1]]} (mod {n}).
    {/if}
    {#if op === 'mul'}
      {unitCount} of the {n} residues are units (φ({n}) = {unitCount}).
      {#if zeroDivisors.length}Zero divisors: {zeroDivisors.slice(0, 12).join(', ')}{zeroDivisors.length > 12 ? ', …' : ''}.{:else}No zero divisors: {n} is prime, so every non-zero residue has an inverse.{/if}
    {:else}
      Every row of the addition table is a shuffle of 0, …, {n - 1}: you can always subtract.
    {/if}
  </p>
</Widget>

<style>
  .scroll {
    overflow: auto;
    max-height: 30rem;
  }
  table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: calc(var(--s) * 0.42);
    margin: 0 auto;
  }
  th,
  td {
    width: var(--s);
    height: var(--s);
    min-width: var(--s);
    text-align: center;
    padding: 0;
    border: 1px solid var(--surface);
  }
  th {
    color: var(--mute);
    font-weight: 500;
  }
  th.unit {
    color: var(--fx-blue);
    font-weight: 700;
  }
  .corner {
    color: var(--ink);
  }
  td {
    background: var(--pn);
    color: var(--ink-2);
  }
  td.unitrow {
    background: color-mix(in srgb, var(--fx-blue) 14%, var(--surface));
  }
  td.zero {
    background: var(--surface-3);
    color: var(--ink);
    font-weight: 700;
  }
  td.one {
    background: var(--prime);
    color: var(--on-accent);
    font-weight: 700;
  }
  td.hl {
    outline: 1px solid var(--fg);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.85rem;
    min-height: 2.6em;
  }
</style>

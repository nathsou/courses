<!--
  The whole engine at the level of its numbers: eight columns of 31 digits. Choose a polynomial, set the
  columns up (staggered, as the engine needs, or naively), and step half-cycle by half-cycle. Values that
  disagree with the true table are marked.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { evalPoly, halfCycleA, halfCycleB, initialColumns, POLYS, staggeredColumns } from '$lib/mech/difference';

  let { poly = 'cubes', staggered: st = true }: { poly?: string; staggered?: boolean } = $props();
  // svelte-ignore state_referenced_locally
  let which = $state(poly);
  // svelte-ignore state_referenced_locally
  let staggered = $state(st);
  let cols: bigint[] = $state([]);
  let half: 'A' | 'B' = $state('A');
  let x = $state(0);
  let printed: { x: number; v: bigint }[] = $state([]);

  function setup() {
    const p = POLYS[which]!.p;
    const c = staggered ? staggeredColumns(p) : initialColumns(p);
    cols = Array.from({ length: 8 }, (_, i) => c[i] ?? 0n);
    half = 'A';
    x = 0;
    printed = [{ x: 0, v: cols[0]! }];
  }
  // svelte-ignore state_referenced_locally
  setup();

  function step() {
    const c = [...cols];
    if (half === 'A') {
      halfCycleA(c);
      half = 'B';
    } else {
      halfCycleB(c);
      half = 'A';
      x++;
      printed = [...printed, { x, v: c[0]! }].slice(-12);
    }
    cols = c;
  }
  function cycles(n: number) {
    for (let i = 0; i < 2 * n; i++) step();
  }
  const p = $derived(POLYS[which]!.p);
  const fmt = (v: bigint) => {
    const neg = v < 0n;
    const s = (neg ? -v : v).toString().padStart(31, '0');
    return (neg ? '−' : '') + s.replace(/^0+(?=\d)/, (z) => '·'.repeat(z.length));
  };
</script>

<Widget title="Eight columns of thirty-one digits" subtitle="The engine at the level of its numbers. Step half-cycle by half-cycle: in A, columns 1, 3, 5, 7 add into 0, 2, 4, 6; in B, columns 2, 4, 6 add into 1, 3, 5." onreset={setup}>
  {#snippet controls()}
    <label>Table of <select bind:value={which} onchange={setup}>{#each Object.entries(POLYS) as [k, v] (k)}<option value={k}>{v.label}</option>{/each}</select></label>
    <label class="chk"><input type="checkbox" bind:checked={staggered} onchange={setup} /> staggered set-up</label>
    <button class="go" onclick={step}>Half-cycle {half}</button>
    <button onclick={() => cycles(1)}>Full cycle</button>
    <button onclick={() => cycles(10)}>Ten cycles</button>
  {/snippet}
  <div class="grid">
    <table class="engine">
      <thead><tr><th>Column</th><th class="num">Value</th></tr></thead>
      <tbody>
        {#each cols as v, i (i)}
          {@const active = half === 'A' ? i % 2 === 0 && i < 7 : i % 2 === 1 && i < 6}
          <tr class:active>
            <td>{i}{i === 0 ? ' (table)' : ''}</td>
            <td class="digits">{fmt(v)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <div class="printer">
      <h5>Printed</h5>
      <ol>
        {#each printed as r (r.x)}
          {@const ok = r.v === evalPoly(p, BigInt(r.x))}
          <li class:bad={!ok}><span class="x">x = {r.x}</span> <span class="num">{String(r.v)}</span>{#if !ok} <span class="note">should be {String(evalPoly(p, BigInt(r.x)))}</span>{/if}</li>
        {/each}
      </ol>
    </div>
  </div>
  <p class="hint">Highlighted rows receive an addition in the next half-cycle. Leading zeros are shown as dots.</p>
</Widget>

<style>
  label {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.86rem;
  }
  select,
  button {
    font: inherit;
    font-size: 0.86rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.28rem 0.6rem;
    min-height: 2rem;
    color: var(--ink);
    cursor: pointer;
  }
  .go {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 12rem;
    gap: 1rem;
  }
  @media (max-width: 640px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .engine {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.8rem;
    display: block;
    overflow-x: auto;
  }
  .engine td,
  .engine th {
    padding: 0.2rem 0.5rem;
    border-bottom: 1px solid var(--line);
    text-align: left;
    white-space: nowrap;
  }
  .digits {
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
  }
  tr.active td {
    background: var(--brass-soft);
  }
  .printer h5 {
    margin: 0 0 0.3rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-3);
  }
  .printer ol {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: var(--font-mono);
    font-size: 0.82rem;
  }
  .x {
    color: var(--ink-3);
  }
  .bad {
    color: var(--bad);
  }
  .note {
    font-size: 0.72rem;
  }
  .hint {
    font-size: 0.78rem;
    color: var(--ink-3);
    margin: 0.5rem 0 0;
  }
</style>

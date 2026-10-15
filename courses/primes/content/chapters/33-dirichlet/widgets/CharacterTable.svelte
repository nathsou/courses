<!--
  The Dirichlet characters modulo q, drawn as clock hands: each value χ(a) is a root of unity, shown as an arrow at
  its angle (or a dot for 0, when a shares a factor with q). The last column is L(1, χ), which Dirichlet's proof needs
  to be nonzero for every non-principal χ.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { characters, lFunction } from '$lib/primes/dirichlet';
  import { c, abs, format } from '$lib/primes/complex';
  import { gcd } from '$lib/primes/arith';

  let q = $state(5);
  const chars = $derived(characters(q));
  const units = $derived(Array.from({ length: q }, (_, a) => a).filter((a) => gcd(a, q) === 1));
  const L1 = $derived(chars.map((ch) => (ch.principal ? null : lFunction(ch, c(1), 20_000))));
  let hoverRow = $state<number | null>(null);
</script>

<Widget title="Dirichlet characters" subtitle="Each row is a character χ modulo q: a function on residues that is multiplicative, χ(ab) = χ(a)χ(b), with values on the unit circle (arrows) or 0 (dots, for a not coprime to q). The last column is L(1, χ)." onreset={() => (q = 5)}>
  {#snippet controls()}
    <Slider label="modulus q" bind:value={q} min={3} max={16} step={1} format={(v) => String(v)} />
  {/snippet}
  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th></th>
          {#each Array.from({ length: q }, (_, a) => a) as a (a)}<th class:unit={units.includes(a)}>{a}</th>{/each}
          <th class="l">L(1, χ)</th>
        </tr>
      </thead>
      <tbody>
        {#each chars as ch, i (i)}
          <tr class:principal={ch.principal} class:real={ch.real && !ch.principal} onpointerenter={() => (hoverRow = i)} onpointerleave={() => (hoverRow = null)}>
            <th>χ<sub>{i}</sub>{ch.principal ? ' (principal)' : ch.real ? ' (real)' : ''}</th>
            {#each ch.values as v, a (a)}
              <td>
                <svg viewBox="-10 -10 20 20" width="22" height="22" aria-label="χ({a}) = {abs(v) < 1e-9 ? '0' : format(v, 2)}">
                  {#if abs(v) < 1e-9}
                    <circle r="1.8" class="zero" />
                  {:else}
                    <circle r="8" class="dial" />
                    <line x1="0" y1="0" x2={7 * v.re} y2={-7 * v.im} class="hand" />
                  {/if}
                </svg>
              </td>
            {/each}
            <td class="l mono">{L1[i] ? format(L1[i]!, 3) : 'pole'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="out" aria-live="polite">
    φ({q}) = {chars.length} characters. {hoverRow !== null && L1[hoverRow] ? `|L(1, χ${hoverRow})| = ${abs(L1[hoverRow]!).toFixed(4)}.` : 'Every non-principal L(1, χ) is visibly nonzero, which is the hard part of Dirichlet’s theorem.'} Real characters (green rows) take only the values ±1 and 0.
  </p>
</Widget>

<style>
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: 0.78rem;
  }
  th,
  td {
    padding: 0.1rem 0.15rem;
    text-align: center;
    border-bottom: 1px solid var(--ruling);
  }
  thead th {
    font-family: var(--font-mono);
    color: var(--mute);
    font-weight: 400;
  }
  thead th.unit {
    color: var(--ink);
    font-weight: 700;
  }
  tbody th {
    text-align: left;
    white-space: nowrap;
    font-family: var(--font-ui);
    font-weight: 600;
    padding-right: 0.5rem;
  }
  tr.real th {
    color: var(--ok);
  }
  tr.principal th {
    color: var(--mute);
  }
  .dial {
    fill: none;
    stroke: var(--ruling);
  }
  .hand {
    stroke: var(--prime);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  tr.real .hand {
    stroke: var(--ok);
  }
  .zero {
    fill: var(--mute);
  }
  .l {
    text-align: right;
    white-space: nowrap;
    padding-left: 0.8rem;
  }
  .mono {
    font-family: var(--font-mono);
  }
  tbody tr:hover {
    background: color-mix(in srgb, var(--fx-blue) 8%, transparent);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>

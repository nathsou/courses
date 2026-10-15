<!--
  Zagier's one-sentence proof that a prime p ≡ 1 (mod 4) is a sum of two squares. S is the finite set of triples
  (x, y, z) of positive integers with x² + 4yz = p. Two involutions act on S: Zagier's (arcs above) has exactly one
  fixed point, (1, 1, (p − 1)/4), so |S| is odd; then the swap (x, y, z) ↦ (x, z, y) (arcs below) must also have a
  fixed point, y = z, and then p = x² + (2y)².
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { zagier, zagierTriples } from '$lib/primes/gaussian';
  import { primesUpTo } from '$lib/primes/sieve';

  const PS = primesUpTo(400).filter((p) => p % 4 === 1);
  let idx = $state(3);
  const p = $derived(PS[idx]!);
  const triples = $derived(zagierTriples(p).sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  const key = (t: number[]) => t.join(',');
  const pos = $derived(new Map(triples.map((t, i) => [key(t), i])));
  const zPairs = $derived(triples.map((t, i) => [i, pos.get(key(zagier(t)))!] as [number, number]).filter(([i, j]) => i <= j));
  const sPairs = $derived(triples.map((t, i) => [i, pos.get(key([t[0], t[2], t[1]]))!] as [number, number]).filter(([i, j]) => i <= j));
  const W = 640;
  const H = 230;
  const mid = H / 2;
  const x = $derived((i: number) => 20 + (i * (W - 40)) / Math.max(1, triples.length - 1));
  const arc = (i: number, j: number, up: boolean) => {
    const a = x(i);
    const b = x(j);
    const h = Math.min(mid - 14, 10 + (b - a) * 0.45);
    return `M${a},${mid} C${a},${mid + (up ? -h : h)} ${b},${mid + (up ? -h : h)} ${b},${mid}`;
  };
  const fixedSwap = $derived(triples.filter((t) => t[1] === t[2]));
  let hover = $state<number | null>(null);
</script>

<Widget title="Zagier’s one-sentence proof" subtitle="Dots: the triples (x, y, z) of positive integers with x² + 4yz = p. Arcs above pair each triple with its image under Zagier’s involution; arcs below, under (x, y, z) ↦ (x, z, y). A loop is a fixed point." onreset={() => (idx = 3)}>
  {#snippet controls()}
    <Slider label="p" bind:value={idx} min={0} max={PS.length - 1} step={1} format={(i) => String(PS[Math.round(i)])} />
  {/snippet}
  <svg viewBox="0 0 {W} {H}" class="plot" role="img" aria-label="The {triples.length} triples for p = {p} with the two involutions.">
    {#each zPairs as [i, j] (i)}
      {#if i === j}<circle cx={x(i)} cy={mid - 12} r="9" class="zloop" />{:else}<path d={arc(i, j, true)} class="z" />{/if}
    {/each}
    {#each sPairs as [i, j] (i)}
      {#if i === j}<circle cx={x(i)} cy={mid + 12} r="9" class="sloop" />{:else}<path d={arc(i, j, false)} class="s" />{/if}
    {/each}
    {#each triples as t, i (i)}
      <circle cx={x(i)} cy={mid} r={hover === i ? 6 : 4.5} class="dot" role="presentation" onpointerenter={() => (hover = i)} onpointerleave={() => (hover = null)}><title>({t.join(', ')})</title></circle>
    {/each}
  </svg>
  <div class="legend ui"><span class="k z">Zagier’s involution</span><span class="k s">swap y and z</span></div>
  <p class="out" aria-live="polite">
    {#if hover !== null}
      ({triples[hover]!.join(', ')}): {triples[hover]![0]}² + 4·{triples[hover]![1]}·{triples[hover]![2]} = {p}.
    {:else}
      p = {p}: |S| = {triples.length}, which is odd. Zagier's involution fixes only (1, 1, {(p - 1) / 4}); the swap fixes ({fixedSwap.map((t) => t.join(', ')).join('), (')}), so {p} = {fixedSwap[0]![0]}² + {2 * fixedSwap[0]![1]}².
    {/if}
  </p>
</Widget>

<style>
  .plot {
    width: 100%;
    height: auto;
    display: block;
  }
  path {
    fill: none;
    stroke-width: 1.4;
  }
  .z,
  .zloop {
    stroke: var(--fx-blue);
    fill: none;
  }
  .s,
  .sloop {
    stroke: var(--prime);
    fill: none;
  }
  .zloop,
  .sloop {
    stroke-width: 2;
  }
  .dot {
    fill: var(--fg);
  }
  .legend {
    display: flex;
    gap: 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .k::before {
    content: '';
    display: inline-block;
    width: 1.2rem;
    border-top: 2px solid;
    margin-right: 0.4rem;
    vertical-align: middle;
  }
  .k.z::before {
    border-color: var(--fx-blue);
  }
  .k.s::before {
    border-color: var(--prime);
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>

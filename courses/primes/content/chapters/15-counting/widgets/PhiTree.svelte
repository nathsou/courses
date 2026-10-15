<!--
  Legendre's recursion φ(x, a) = φ(x, a − 1) − φ(⌊x/p_a⌋, a − 1), drawn as a tree. φ(x, a) counts the n ≤ x free of
  the first a primes. With pruning (φ(x, a) = 1 when 1 ≤ x < p_{a+1}) the tree is much smaller.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import { primesUpTo } from '$lib/primes/sieve';
  import { isqrt } from '$lib/primes/arith';

  const P = primesUpTo(100);
  let x = $state(100);
  let prune = $state(true);

  interface N {
    x: number;
    a: number;
    sign: 1 | -1;
    value: number;
    kids: N[];
    leaf: string;
  }
  const a = $derived(primesUpTo(isqrt(x)).length);
  const tree = $derived.by(() => {
    let nodes = 0;
    const build = (y: number, k: number, sign: 1 | -1): N => {
      nodes++;
      if (k === 0) return { x: y, a: k, sign, value: y, kids: [], leaf: `⌊${y}⌋ = ${y}` };
      if (y === 0) return { x: y, a: k, sign, value: 0, kids: [], leaf: '0' };
      if (prune && y < P[k]!) return { x: y, a: k, sign, value: 1, kids: [], leaf: `${y} < ${P[k]}: only 1` };
      const l = build(y, k - 1, 1);
      const r = build(Math.floor(y / P[k - 1]!), k - 1, -1);
      return { x: y, a: k, sign, value: l.value - r.value, kids: [l, r], leaf: '' };
    };
    const root = build(x, a, 1);
    return { root, nodes };
  });
</script>

{#snippet node(n: N)}
  <li>
    <span class="sg" class:neg={n.sign < 0}>{n.sign < 0 ? '−' : '+'}</span>
    <span class="f">φ({n.x}, {n.a})</span>
    {#if n.leaf}<span class="leaf">{n.leaf}</span>{:else}<span class="val">= {n.value}</span>{/if}
    {#if n.kids.length}<ul>{#each n.kids as k, i (i)}{@render node(k)}{/each}</ul>{/if}
  </li>
{/snippet}

<Widget title="Legendre’s recursion" subtitle="φ(x, a) counts the numbers up to x with no prime factor among the first a primes. Each node splits into “without the a-th prime” minus “multiples of it”.">
  {#snippet controls()}
    <Segmented label="x" bind:value={x} options={[30, 100, 200, 500].map((v) => ({ value: v, label: `x = ${v}` }))} size="sm" />
    <Toggle label="prune when x < next prime" bind:checked={prune} />
  {/snippet}
  <p class="top mono">π({x}) = φ({x}, {a}) + {a} − 1 = {tree.root.value} + {a - 1} = <strong>{tree.root.value + a - 1}</strong> <span class="mute">(a = π(√{x}) = {a}; {tree.nodes} nodes)</span></p>
  <ul class="tree mono">{@render node(tree.root)}</ul>
</Widget>

<style>
  .mono {
    font-family: var(--font-mono);
  }
  .top {
    font-size: 0.84rem;
    margin: 0 0 0.5rem;
  }
  .mute {
    color: var(--mute);
  }
  .tree,
  .tree :global(ul) {
    list-style: none;
    margin: 0;
    padding-left: 1.1rem;
    border-left: 1px solid var(--ruling);
  }
  .tree {
    padding-left: 0;
    border-left: 0;
    font-size: 0.74rem;
    max-height: 22rem;
    overflow: auto;
  }
  .tree :global(li) {
    padding: 0.05rem 0;
    white-space: nowrap;
  }
  .tree :global(.sg) {
    display: inline-block;
    width: 1em;
    color: var(--ok);
    font-weight: 700;
  }
  .tree :global(.sg.neg) {
    color: var(--bad);
  }
  .tree :global(.f) {
    color: var(--ink);
  }
  .tree :global(.val) {
    color: var(--ink-3);
    margin-left: 0.4rem;
  }
  .tree :global(.leaf) {
    color: var(--fx-blue);
    margin-left: 0.4rem;
  }
</style>

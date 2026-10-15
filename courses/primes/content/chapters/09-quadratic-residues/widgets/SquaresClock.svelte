<!--
  Squaring modulo p: arrows x → x² mod p on a clock. Exactly two arrows land on each non-zero square, so half
  the non-zero residues are squares. Shows whether −1 and 2 are squares.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { primesUpTo } from '$lib/primes/sieve';
  import { legendre } from '$lib/primes/primality';

  const PRIMES = primesUpTo(97).slice(1);
  let p = $state(13);
  let showArrows = $state(true);

  const squares = $derived(new Set(Array.from({ length: p - 1 }, (_, i) => ((i + 1) * (i + 1)) % p)));
  const R = 120;
  const pos = (k: number) => {
    const t = (2 * Math.PI * k) / p;
    return { x: R * Math.sin(t), y: -R * Math.cos(t) };
  };
  const chord = (x: number) => {
    const a = pos(x);
    const b = pos((x * x) % p);
    if (x === (x * x) % p) return '';
    return `M${a.x},${a.y} Q${(a.x + b.x) * 0.3},${(a.y + b.y) * 0.3} ${b.x},${b.y}`;
  };
  const minusOne = $derived(legendre(p - 1, p) === 1);
  const two = $derived(legendre(2, p) === 1);
</script>

<Widget title="Squares on a clock" subtitle="Each residue x sends an arrow to x² mod p. Red residues are squares (quadratic residues): every one of them receives exactly two arrows, from x and from −x.">
  {#snippet controls()}
    <label class="pick ui">
      p =
      <select bind:value={p}>
        {#each PRIMES as q (q)}<option value={q}>{q}</option>{/each}
      </select>
    </label>
    <label class="opt ui"><input type="checkbox" bind:checked={showArrows} /> arrows</label>
  {/snippet}
  <div class="wrap">
    <svg viewBox="-150 -150 300 300" role="img" aria-label="Residues modulo {p}; the {(p - 1) / 2} non-zero squares are highlighted.">
      {#if showArrows}
        {#each Array.from({ length: p - 1 }, (_, i) => i + 1) as x (x)}
          {#if chord(x)}<path class="arc" d={chord(x)} />{/if}
        {/each}
      {/if}
      {#each Array.from({ length: p }, (_, i) => i) as k (k)}
        {@const q = pos(k)}
        <g transform="translate({q.x},{q.y})">
          <circle r={p > 60 ? 7 : 10} class:sq={squares.has(k)} class:zero={k === 0} />
          {#if p <= 60}<text dy="0.35em" text-anchor="middle">{k}</text>{/if}
        </g>
      {/each}
    </svg>
  </div>
  <p class="out" aria-live="polite">
    Modulo {p}: {(p - 1) / 2} non-zero squares out of {p - 1}.
    −1 ≡ {p - 1} is {minusOne ? 'a square' : 'not a square'} (p ≡ {p % 4} mod 4); 2 is {two ? 'a square' : 'not a square'} (p ≡ {p % 8} mod 8).
  </p>
</Widget>

<style>
  .pick,
  .opt {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  select {
    font-family: var(--font-mono);
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
  }
  .wrap {
    max-width: 400px;
    margin: 0 auto;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .arc {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1;
    opacity: 0.45;
  }
  circle {
    fill: var(--pn);
    stroke: var(--line-strong);
  }
  circle.sq {
    fill: var(--prime);
    stroke: var(--prime);
  }
  circle.zero {
    fill: var(--surface-3);
  }
  text {
    font-family: var(--font-mono);
    font-size: 9px;
    fill: var(--ink);
    pointer-events: none;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>

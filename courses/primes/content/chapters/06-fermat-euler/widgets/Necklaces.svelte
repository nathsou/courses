<!--
  Fermat's little theorem by counting necklaces. Strings of p beads in a colours fall into rotation classes; for
  prime p every non-constant class has exactly p members, so p divides a^p − a. For composite length some classes
  are smaller, and the count fails.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  let len = $state(5);
  let colours = $state(2);

  const PALETTE = ['var(--prime)', 'var(--fx-blue)', 'var(--fx-yellow)'];

  const classes = $derived.by(() => {
    const total = colours ** len;
    const seen = new Set<number>();
    const out: { rep: number[]; size: number }[] = [];
    const digits = (k: number) => Array.from({ length: len }, (_, i) => Math.floor(k / colours ** (len - 1 - i)) % colours);
    const value = (ds: number[]) => ds.reduce((acc, d) => acc * colours + d, 0);
    for (let k = 0; k < total; k++) {
      if (seen.has(k)) continue;
      const ds = digits(k);
      const orbit = new Set<number>();
      for (let r = 0; r < len; r++) orbit.add(value([...ds.slice(r), ...ds.slice(0, r)]));
      orbit.forEach((v) => seen.add(v));
      out.push({ rep: ds, size: orbit.size });
    }
    return out;
  });
  const constant = $derived(classes.filter((c) => c.size === 1).length);
  const sizes = $derived([...new Set(classes.map((c) => c.size))].sort((a, b) => a - b));
  const isPrimeLen = $derived([2, 3, 5, 7].includes(len));
  const R = 22;
</script>

<Widget title="Counting necklaces" subtitle="Strings of beads, where rotations of the same string count as one necklace. Each necklace is drawn once, with the number of different strings it stands for." onreset={() => ((len = 5), (colours = 2))}>
  {#snippet controls()}
    <Segmented label="Beads" bind:value={len} options={[2, 3, 4, 5, 6, 7].map((v) => ({ value: v, label: `${v} beads` }))} size="sm" />
    <Segmented label="Colours" bind:value={colours} options={[2, 3].map((v) => ({ value: v, label: `${v} colours` }))} size="sm" />
  {/snippet}
  <div class="grid">
    {#each classes.slice(0, 60) as c, i (i)}
      <figure class:mono={c.size === 1}>
        <svg viewBox="-30 -30 60 60" width="52" height="52" aria-hidden="true">
          <circle r={R} class="string" />
          {#each c.rep as d, j (j)}
            <circle cx={R * Math.sin((2 * Math.PI * j) / len)} cy={-R * Math.cos((2 * Math.PI * j) / len)} r={len > 5 ? 5.5 : 7} style:fill={PALETTE[d]} />
          {/each}
        </svg>
        <figcaption>×{c.size}</figcaption>
      </figure>
    {/each}
  </div>
  {#if classes.length > 60}<p class="more">… and {classes.length - 60} more necklaces.</p>{/if}
  <p class="out" aria-live="polite">
    {colours}<sup>{len}</sup> = {colours ** len} strings make {classes.length} necklaces. {constant} are one colour (×1).
    {#if isPrimeLen}
      Every other necklace stands for exactly {len} strings, so {len} divides {colours}<sup>{len}</sup> − {colours} = {colours ** len - colours}.
    {:else}
      The others stand for {sizes.filter((s) => s > 1).join(' or ')} strings: {len} is not prime, so some patterns repeat before a full turn, and {len} {(colours ** len - colours) % len === 0 ? 'happens to divide' : 'does not divide'} {colours ** len - colours}.
    {/if}
  </p>
</Widget>

<style>
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.5rem;
  }
  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  figure.mono {
    opacity: 0.55;
  }
  .string {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 1.5;
  }
  figcaption {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--mute);
  }
  .more {
    font-size: 0.8rem;
    color: var(--mute);
  }
  .out {
    margin: 0.6rem 0 0;
  }
</style>

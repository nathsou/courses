<!--
  An `if` chain on a selector, a `match`, and a priority chain on overlapping requests, making a choice among N
  inputs, as synth builds them (measured by `ifmatch.test.ts` with the pinned synth).

    ::if-vs-match{n="29.4" caption="…"}

  Slide the number of choices from 2 to 16 and compare the depth (the longest path of AND gates, after synth's
  optimisation) and the size (iCE40 LUTs) of the three. The source of each is shown.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { highlightWeftHtml } from '$lib/weft/highlight';
  import { MEASURED, SELECTOR_BITS, key, pickSource, type Measure, type Style } from './ifmatch';

  let { n, caption }: { n?: string | number; caption?: string } = $props();

  let k = $state<number>(3);
  const arms = $derived(2 ** k);
  const get = (style: Style, kk: number): Measure => MEASURED[key(style, kk)]!;
  const maxDepth = Math.max(...SELECTOR_BITS.map((b) => get('priority', b).depthOptimised));
  const maxSize = Math.max(...SELECTOR_BITS.map((b) => get('priority', b).luts));

  const rows = $derived([
    { name: 'if … else if on sel', short: 'if on sel', m: get('if', k), colour: 'var(--sig-high)', source: pickSource('if', k) },
    { name: 'match sel', short: 'match', m: get('match', k), colour: 'var(--accent)', source: pickSource('match', k) },
    { name: 'if … else if on req bits', short: 'priority', m: get('priority', k), colour: 'var(--maybe)', source: pickSource('priority', k) },
  ]);
  const summary = $derived(
    `With ${arms} choices of 8 bits: the if chain on sel is ${rows[0]!.m.depthOptimised} AND gates deep in ${rows[0]!.m.luts} LUTs, the match ${rows[1]!.m.depthOptimised} in ${rows[1]!.m.luts}, the priority chain ${rows[2]!.m.depthOptimised} in ${rows[2]!.m.luts}.`,
  );
</script>

<Widget {n} title="A chain, or a tree?" subtitle="The same choice among 2, 4, 8 or 16 inputs of 8 bits, written three ways, as synth builds it" kind="Interactive" {caption} onreset={() => (k = 3)} live={false}>
  {#snippet controls()}
    <Slider label="Number of choices" bind:value={k} min={1} max={4} step={1} format={(v) => `${2 ** v}`} />
  {/snippet}

  <div class="ivm">
    <div class="cols">
      {#each rows as r (r.short)}
        <section aria-label={r.name}>
          <h5 class="ui">{r.name}</h5>
          <div class="src">{@html highlightWeftHtml(r.source)}</div>
        </section>
      {/each}
    </div>

    <div class="bars ui" role="group" aria-label={summary}>
      <div class="metric">
        <h5>Depth: AND gates on the longest path</h5>
        {#each rows as r (r.short)}
          <div class="bar-row">
            <span class="who">{r.short}</span>
            <span class="track"><span class="fill" style:width="{(r.m.depthOptimised / maxDepth) * 100}%" style:background={r.colour}></span></span>
            <b>{r.m.depthOptimised}</b>
          </div>
        {/each}
      </div>
      <div class="metric">
        <h5>Size: iCE40 LUTs</h5>
        {#each rows as r (r.short)}
          <div class="bar-row">
            <span class="who">{r.short}</span>
            <span class="track"><span class="fill" style:width="{(r.m.luts / maxSize) * 100}%" style:background={r.colour}></span></span>
            <b>{r.m.luts}</b>
          </div>
        {/each}
      </div>
    </div>
    <p class="ui note">
      All three elaborate to a chain of {arms - 1} two-way multiplexers: Weft writes every choice in program order. synth
      sees that the comparisons on <code>sel</code> cannot both be true and rebuilds the first two as the same tree; the
      request bits can all be set at once, so the priority chain has to stay a chain.
    </p>
  </div>
</Widget>

<style>
  .ivm {
    display: grid;
    gap: 0.9rem;
    min-width: 0;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
  }
  @media (max-width: 42rem) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  section {
    min-width: 0;
  }
  h5 {
    margin: 0 0 0.3rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink-2);
  }
  .src {
    margin: 0;
    padding: 0.6rem 0.75rem;
    max-height: 15rem;
    overflow: auto;
    background: var(--pn);
    border: 1px solid var(--line);
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    line-height: 1.5;
  }
  .src :global(pre) {
    margin: 0;
    padding: 0;
    background: transparent !important;
    font-size: inherit;
  }
  .bars {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem 1.4rem;
  }
  @media (max-width: 42rem) {
    .bars {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .bar-row {
    display: grid;
    grid-template-columns: 4.6rem minmax(0, 1fr) 2.6rem;
    align-items: center;
    gap: 0.5rem;
    margin: 0.25rem 0;
    font-size: 0.8rem;
  }
  .who {
    color: var(--ink-2);
  }
  .track {
    display: block;
    height: 0.85rem;
    background: var(--line);
    border-radius: 4px;
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    border-radius: 4px;
    transition: width 0.25s ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .fill {
      transition: none;
    }
  }
  b {
    font-family: var(--font-mono);
    text-align: right;
  }
  .note {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
</style>

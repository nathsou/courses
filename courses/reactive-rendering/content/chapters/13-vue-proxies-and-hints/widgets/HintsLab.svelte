<!--
  What the Vue compiler tells the virtual DOM. The same card is rendered and patched with and without the three hints
  (hoisting, patch flags, block tree). The counters are measured by the lab's `hints.ts`.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { makeCard, newStats, patch, type CardState, type PatchStats } from '$lib/rx/hints';

  let { n, title = 'What the compiler tells the diff', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  let rows = $state(40);
  let card = $state<CardState>({ title: 'Release notes', count: 0, hot: false });
  let updates = $state(0);

  const render = $derived(makeCard(rows));

  function measure(hints: boolean): PatchStats {
    const prev = render(card, hints);
    const next = render({ ...card, count: card.count + 1, hot: card.count + 1 > 5 }, hints);
    const stats = newStats();
    patch(prev, next, stats, { hints });
    return stats;
  }
  const plain = $derived(measure(false));
  const hinted = $derived(measure(true));
  const total = $derived(rows + 4);
  function bump() {
    card = { ...card, count: card.count + 1, hot: card.count + 1 > 5 };
    updates++;
  }
  const dynamicNodes = 3;
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="A card with a dynamic title, a dynamic counter, and a number of static paragraphs. Press the button: how much does the diff look at?">
  {#snippet controls()}
    <Slider label="Static paragraphs" bind:value={rows} min={0} max={400} step={10} format={(v) => v.toFixed(0)} />
  {/snippet}

  <div class="top ui">
    <Button variant="primary" onclick={bump}>count++ ({card.count})</Button>
    <span class="tmpl"><code>&lt;p :class="{'{ hot }'}"&gt;Count: &#123;&#123; count &#125;&#125;&lt;/p&gt;</code> is the only paragraph that changes.</span>
  </div>

  <div class="grid ui">
    <div class="col">
      <div class="h">Plain virtual DOM</div>
      <div class="big">{plain.visited}<span> nodes visited</span></div>
      <div class="sub">{plain.comparisons} comparisons · {plain.writes} DOM write{plain.writes === 1 ? '' : 's'}</div>
      <div class="bar"><span style:width="{(plain.visited / total) * 100}%"></span></div>
    </div>
    <div class="col good">
      <div class="h">With compiler hints</div>
      <div class="big">{hinted.visited}<span> nodes visited</span></div>
      <div class="sub">{hinted.comparisons} comparisons · {hinted.writes} DOM write{hinted.writes === 1 ? '' : 's'}</div>
      <div class="bar"><span style:width="{(hinted.visited / total) * 100}%"></span></div>
    </div>
  </div>
  <p class="note ui">The page has {total} vnodes. {dynamicNodes} of them (the block root and the two dynamic nodes) are what the hinted diff has to look at, <b>whatever the page size</b>. Both versions write the same one text node; the difference is entirely in finding it.</p>
</Widget>

<style>
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.7rem;
    margin-bottom: 0.8rem;
  }
  .tmpl {
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.8rem;
  }
  .col {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    background: var(--panel);
  }
  .col.good {
    border-color: var(--signal);
  }
  .h {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
  }
  .big {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
  }
  .big span {
    margin-left: 0.35rem;
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--ink-2);
    font-family: var(--font-ui, inherit);
  }
  .sub {
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .bar {
    height: 8px;
    border-radius: 4px;
    background: var(--line);
    margin-top: 0.5rem;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    min-width: 3px;
    background: var(--computed);
  }
  .good .bar span {
    background: var(--signal);
  }
  .note {
    margin: 0.8rem 0 0;
    font-size: 0.84rem;
    color: var(--ink-2);
  }
</style>

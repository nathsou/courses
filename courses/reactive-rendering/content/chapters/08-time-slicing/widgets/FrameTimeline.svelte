<!--
  Typing into a search box that filters a long list, on a virtual clock. Five keystrokes, sixty milliseconds apart,
  each of which needs the list re-rendered. In sync mode a render runs to the end; in concurrent mode it works in
  slices, lets typing go first, and throws away a half-built list when a newer keystroke makes it stale.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { bigList, simulate, totalCost } from '$lib/rx/scheduler';

  let { n, title = 'The frame timeline', caption, mode: initial = 'sync' }: { n?: string | number; title?: string; caption?: string; mode?: string } = $props();

  let mode = $state<'sync' | 'concurrent'>(initial === 'concurrent' ? 'concurrent' : 'sync');
  let leaves = $state(200);
  let leafCost = $state(0.6);
  let slice = $state(5);

  const list = $derived(bigList(leaves, leafCost));
  const cost = $derived(totalCost(list));
  const keystrokes = ['r', 'e', 'a', 'c', 't'].map((label, i) => ({ at: 10 + i * 60, label }));
  const r = $derived(simulate({ mode, list, keystrokes, sliceMs: slice }));
  const span = $derived(Math.max(r.end, 320));
  const pct = (ms: number) => `${(ms / span) * 100}%`;
  const last = $derived(r.keys.at(-1)!);
  const shownAt = $derived(Math.max(...r.keys.map((k) => k.listAt ?? 0)));
</script>

<Widget {title} {n} {caption} kind="Simulation" subtitle="Five keystrokes into a list that takes {cost.toFixed(0)} ms to render. Virtual time; the timeline is exact.">
  {#snippet controls()}
    <Segmented label="Rendering" bind:value={mode} options={[{ value: 'sync', label: 'Synchronous' }, { value: 'concurrent', label: 'Time-sliced, interruptible' }]} />
    <Slider label="List items" bind:value={leaves} min={20} max={600} step={10} format={(v) => v.toFixed(0)} />
    <Slider label="Cost per item (ms)" bind:value={leafCost} min={0.1} max={1.5} step={0.1} format={(v) => v.toFixed(1)} />
    {#if mode === 'concurrent'}<Slider label="Slice (ms)" bind:value={slice} min={1} max={16} step={1} format={(v) => v.toFixed(0)} />{/if}
  {/snippet}

  <div class="tl" role="img" aria-label="Timeline of the main thread: {r.droppedFrames} dropped frames, worst input latency {r.worstLatency.toFixed(0)} milliseconds">
    <div class="frames">
      {#each r.frames as f, i (i)}<span class="fr" class:drop={f.dropped} style:left={pct(f.start)} style:width={pct(f.end - f.start)}></span>{/each}
    </div>
    <div class="lane">
      {#each r.segments as s, i (i)}
        {#if s.kind === 'discard'}
          <span class="seg discard" style:left={pct(s.start)} title={s.label}></span>
        {:else if s.kind !== 'idle'}
          <span class="seg {s.kind}" style:left={pct(s.start)} style:width="max({pct(s.end - s.start)}, 1px)" title="{s.label} ({(s.end - s.start).toFixed(1)} ms)"></span>
        {/if}
      {/each}
      {#each r.yields as y, i (i)}<span class="yield" style:left={pct(y)}></span>{/each}
    </div>
    <div class="keys">
      {#each keystrokes as k, i (i)}<span class="key ui" style:left={pct(k.at)}>▼<b>{k.label}</b></span>{/each}
    </div>
  </div>
  <ul class="legend ui">
    <li><span class="sw echo"></span>input box</li>
    <li><span class="sw render"></span>rendering the list</li>
    <li><span class="sw commit"></span>commit</li>
    <li><span class="sw discard"></span>thrown-away work</li>
    <li><span class="sw drop"></span>frame with no chance to paint</li>
    <li>│ the browser gets a turn</li>
  </ul>

  <div class="stats ui">
    <div><b class:bad={r.worstLatency > 50}>{r.worstLatency.toFixed(0)} ms</b><span>worst wait before a key shows</span></div>
    <div><b class:bad={r.longestBlock > 50}>{r.longestBlock.toFixed(0)} ms</b><span>longest uninterrupted block</span></div>
    <div><b class:bad={r.droppedFrames > 2}>{r.droppedFrames}</b><span>dropped frames</span></div>
    <div><b>{r.wasted.toFixed(0)} ms</b><span>rendering thrown away</span></div>
    <div><b>{shownAt.toFixed(0)} ms</b><span>until the final list is shown</span></div>
  </div>
  <p class="note ui">
    {#if mode === 'sync'}
      Each keystroke waits behind the render of the one before it, so the delay grows with every key (the last key waited {last.latency.toFixed(0)} ms).
    {:else}
      Each keystroke is handled at the next slice boundary, so it waits at most one slice. The list renders in the background and restarts when a newer key arrives; the old attempt is wasted work, which is the price.
    {/if}
  </p>
</Widget>

<style>
  .tl {
    position: relative;
    margin: 0.4rem 0 0.2rem;
    padding: 1.4rem 0 0;
  }
  .frames, .lane, .keys {
    position: relative;
    height: 2.4rem;
  }
  .frames {
    position: absolute;
    inset: 1.4rem 0 auto 0;
    height: 2.4rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--bg);
    overflow: hidden;
  }
  .fr {
    position: absolute;
    top: 0;
    bottom: 0;
    border-right: 1px solid var(--line);
  }
  .fr.drop {
    background: var(--red-soft);
  }
  .lane {
    z-index: 1;
  }
  .yield {
    position: absolute;
    top: 0.45rem;
    height: 1.5rem;
    width: 1px;
    background: var(--bg);
  }
  .seg {
    position: absolute;
    top: 0.45rem;
    height: 1.5rem;
    border-radius: 2px;
  }
  .seg.echo { background: var(--series-3); }
  .seg.render { background: var(--series-1); }
  .seg.commit { background: var(--series-5); }
  .seg.discard {
    width: 2px;
    top: 0.2rem;
    height: 2rem;
    background: var(--flash);
    box-shadow: 0 0 0 1px var(--flash-soft);
  }
  .keys {
    height: 1.6rem;
  }
  .key {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.6rem;
    color: var(--ink-blue);
    line-height: 1.1;
  }
  .key b {
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1rem;
    list-style: none;
    padding: 0;
    margin: 0.4rem 0 0.8rem;
    font-size: 0.74rem;
    color: var(--ink-2);
  }
  .sw {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    margin-right: 0.3rem;
    vertical-align: -1px;
  }
  .sw.echo { background: var(--series-3); }
  .sw.render { background: var(--series-1); }
  .sw.commit { background: var(--series-5); }
  .sw.discard { background: var(--flash); }
  .sw.drop { background: var(--red-soft); border: 1px solid var(--red); }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.8rem;
  }
  .stats div {
    display: flex;
    flex-direction: column;
  }
  .stats b {
    font-family: var(--font-mono);
    font-size: 1.2rem;
  }
  .stats b.bad { color: var(--red); }
  .stats span {
    font-size: 0.72rem;
    color: var(--mute);
  }
  .note {
    margin: 0.7rem 0 0;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
</style>

<!--
  Distributing a clock: one source at the centre of a 1 mm block, 64 flip-flops (scattered, or in a regular
  array), and three ways of wiring them: the least wire (a spanning tree), a spine with branches, or an H-tree
  whose leaves are all the same distance from the centre. The delay to every flip-flop comes from Elmore's
  formula for the RC tree of wires; the skew is the spread of those delays.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { clockTiming, grid, hTree, scatter, spanningTree, spine, type ClockTree } from '$lib/eda/clock';

  const SIZE = 1000;
  const VDD = 0.8;
  const FREQ = 1e9;
  let topology = $state<'mst' | 'spine' | 'h'>('mst');
  let depth = $state(2);
  let placement = $state<'scatter' | 'grid'>('scatter');
  let seed = $state(1);

  const sinks = $derived(placement === 'grid' ? grid(8, SIZE) : scatter(64, SIZE, seed));
  const source = { x: SIZE / 2, y: SIZE / 2 };
  const tree: ClockTree = $derived(topology === 'mst' ? spanningTree(source, sinks) : topology === 'spine' ? spine(source, sinks) : hTree(SIZE, depth, sinks));
  const timing = $derived(clockTiming(tree));
  const earliest = $derived(Math.min(...timing.arrival));
  const ps = (s: number) => s * 1e12;
  const SCALE = 60e-12; // the spread of arrival times that takes a flip-flop from the first colour to the last
  const colour = (a: number) => `color-mix(in srgb, var(--ac) ${(12 + 88 * Math.min(1, (a - earliest) / SCALE)).toFixed(0)}%, var(--surface))`;
  const wires = $derived(tree.nodes.slice(1).map((n) => ({ n, p: tree.nodes[n.parent]! })));
  const isSink = $derived(new Set(tree.sinkNodes));
  const AXIS = 160e-12;
</script>

<Widget title="Distributing the clock" subtitle="One clock source at the centre, 64 flip-flops around it. Choose how to wire them, and compare when the clock edge arrives at each: each flip-flop's colour deepens with its delay, and the time line shows them all.">
  {#snippet controls()}
    <Segmented
      bind:value={topology}
      label="Clock wiring"
      options={[
        { value: 'mst', label: 'Least wire' },
        { value: 'spine', label: 'Spine' },
        { value: 'h', label: 'H-tree' },
      ]}
    />
    {#if topology === 'h'}
      <Slider bind:value={depth} min={1} max={3} step={1} label="Levels of H" format={(v) => `${v} (${4 ** v} leaves)`} />
    {/if}
    <Segmented
      bind:value={placement}
      label="Flip-flops"
      options={[
        { value: 'scatter', label: 'Scattered' },
        { value: 'grid', label: 'Regular array' },
      ]}
    />
    {#if placement === 'scatter'}<button class="b ui" onclick={() => (seed += 1)}>Move the flip-flops</button>{/if}
  {/snippet}
  <div class="two">
    <svg viewBox="-40 -40 1080 1080" class="map" role="img" aria-label="{topology === 'mst' ? 'Least-wire tree' : topology === 'spine' ? 'Spine' : `H-tree of ${depth} levels`}: skew {ps(timing.skew).toFixed(1)} ps, {(timing.wire / 1000).toFixed(1)} mm of wire">
      <rect x="0" y="0" width={SIZE} height={SIZE} class="block" />
      {#each wires as { n, p }, i (i)}
        <path d="M{p.x} {p.y}H{n.x}V{n.y}" class="wire" class:leaf={isSink.has(i + 1)} />
      {/each}
      {#each tree.sinkNodes as s, i (i)}
        {@const n = tree.nodes[s]!}
        <rect x={n.x - 16} y={n.y - 16} width="32" height="32" rx="4" class="ff" style:fill={colour(timing.arrival[i]!)}>
          <title>Flip-flop {i + 1}: clock arrives after {ps(timing.arrival[i]!).toFixed(1)} ps</title>
        </rect>
      {/each}
      <circle cx={source.x} cy={source.y} r="26" class="src" />
      <text x={source.x} y={source.y + 9} class="srct">CLK</text>
    </svg>
    <div class="side">
      <div class="axis ui" role="img" aria-label="Arrival times from {ps(earliest).toFixed(1)} to {ps(timing.latest).toFixed(1)} ps">
        <div class="track">
          <span class="span" style:left="{(earliest / AXIS) * 100}%" style:width="{Math.max(0.4, (timing.skew / AXIS) * 100)}%"></span>
          {#each timing.arrival as a, i (i)}<span class="dot" style:left="{Math.min(100, (a / AXIS) * 100)}%" style:background={colour(a)}></span>{/each}
        </div>
        <div class="ticks">{#each [0, 40, 80, 120, 160] as t (t)}<span style:left="{(t / 160) * 100}%">{t}</span>{/each}</div>
        <p class="cap">Clock arrival at each flip-flop (ps)</p>
      </div>
      <dl class="nums ui">
        <div><dt>Skew (latest − earliest)</dt><dd class:hi={timing.skew > 20e-12}>{ps(timing.skew).toFixed(1)} ps</dd></div>
        <div><dt>Latest arrival</dt><dd>{ps(timing.latest).toFixed(0)} ps</dd></div>
        <div><dt>Wire</dt><dd>{(timing.wire / 1000).toFixed(1)} mm</dd></div>
        <div><dt>Clock power at 1 GHz, 0.8 V</dt><dd>{(timing.capacitance * VDD * VDD * FREQ * 1e3).toFixed(2)} mW</dd></div>
      </dl>
      <p class="note ui">For scale: the counter's clock period in chapter 12 is about 250 ps. Unbuffered wires, 0.1 Ω and 0.2 fF per µm.</p>
    </div>
  </div>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.2rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .map {
    width: 100%;
    height: auto;
    max-width: 26rem;
    justify-self: center;
  }
  .block {
    fill: var(--surface-2);
    stroke: var(--line-strong);
    stroke-width: 3;
  }
  .wire {
    fill: none;
    stroke: var(--m-metal1);
    stroke-width: 7;
    stroke-linejoin: round;
    opacity: 0.85;
  }
  .wire.leaf {
    stroke-width: 4;
    opacity: 0.6;
  }
  .ff {
    stroke: var(--ink);
    stroke-width: 3;
  }
  .src {
    fill: var(--ink);
  }
  .srct {
    fill: var(--surface);
    font-family: var(--font-mono);
    font-size: 24px;
    font-weight: 700;
    text-anchor: middle;
  }
  .side {
    display: grid;
    gap: 0.8rem;
  }
  .axis .track {
    position: relative;
    height: 1.6rem;
    background: var(--surface-2);
    border-radius: 3px;
  }
  .axis .span {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--ac);
    opacity: 0.18;
  }
  .axis .dot {
    position: absolute;
    top: 50%;
    width: 0.55rem;
    height: 0.55rem;
    margin: -0.275rem 0 0 -0.275rem;
    border-radius: 50%;
    border: 1px solid var(--ink);
  }
  .axis .ticks {
    position: relative;
    height: 1rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--ink-3);
  }
  .axis .ticks span {
    position: absolute;
    transform: translateX(-50%);
  }
  .axis .ticks span:first-child {
    transform: none;
  }
  .axis .ticks span:last-child {
    transform: translateX(-100%);
  }
  .cap {
    margin: 0.2rem 0 0;
    font-size: 0.76rem;
    color: var(--ink-3);
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem 1rem;
    margin: 0;
    font-size: 0.82rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .nums dd.hi {
    color: var(--bad);
  }
  .note {
    font-size: 0.76rem;
    color: var(--ink-3);
    margin: 0;
  }
  .b {
    font: inherit;
    font-size: 0.84rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
</style>

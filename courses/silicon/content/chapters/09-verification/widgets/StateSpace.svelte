<!--
  Model checking, explicitly: every value of the counter's 4-bit register is a state; from each, every input
  combination leads to a next state. Breadth-first search from power-on visits the reachable states layer by
  layer, checking the assertion in each. Step through it for the correct counter and the buggy one.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { design, evaluate, nextState, settle } from '$lib/eda/hdl';
  import { inputSpace } from '$lib/eda/check';
  import { DECADE_COUNTER, DECADE_COUNTER_BUGGY } from '$lib/eda/designs';

  let which = $state<'good' | 'buggy'>('buggy');
  let depth = $state(0);

  const d = $derived(design((which === 'good' ? DECADE_COUNTER : DECADE_COUNTER_BUGGY) + 'assert q <= 9\n'));
  const graph = $derived.by(() => {
    const edges = new Map<number, Set<number>>();
    for (let q = 0; q < 16; q++) {
      const out = new Set<number>();
      for (const inp of inputSpace(d.inputs)) out.add(nextState(d, settle(d, { q, ...inp })).q!);
      edges.set(q, out);
    }
    // Breadth-first layers from power-on.
    const layer = new Map<number, number>([[0, 0]]);
    let frontier = [0];
    for (let k = 1; frontier.length; k++) {
      const next: number[] = [];
      for (const s of frontier) for (const t of edges.get(s)!) if (!layer.has(t)) {
        layer.set(t, k);
        next.push(t);
      }
      frontier = next;
    }
    return { edges, layer, maxDepth: Math.max(...layer.values()) };
  });
  const bad = (q: number) => evaluate(d.asserts[0]!.expr, settle(d, { q, en: 0, rst: 0 })) === 0;
  const visited = $derived([...graph.layer.entries()].filter(([, k]) => k <= depth).map(([q]) => q));
  const failed = $derived(visited.filter(bad));
  const done = $derived(depth >= graph.maxDepth);

  const R = 118;
  const C = 150;
  const pos = (q: number) => {
    const a = -Math.PI / 2 + (q * 2 * Math.PI) / 16;
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
  };
  function edgePath(a: number, b: number) {
    const p = pos(a);
    const q = pos(b);
    if (a === b) return `M${p.x - 6},${p.y - 10} a9,9 0 1 1 12,0`;
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2;
    const k = 0.25;
    return `M${p.x},${p.y} Q${mx + (C - mx) * k},${my + (C - my) * k} ${q.x},${q.y}`;
  }
  $effect(() => {
    void which;
    depth = 0;
  });
</script>

<Widget title="Exploring every state" subtitle="Each circle is a value of the register q. Arrows show where one clock edge can take it, for some input. Search outwards from power-on (q = 0), checking the assertion q ≤ 9 in every state reached.">
  {#snippet controls()}
    <Segmented bind:value={which} label="Design" options={[{ value: 'good', label: 'Correct counter' }, { value: 'buggy', label: 'Buggy counter' }]} />
    <button class="b ui" onclick={() => (depth = Math.min(graph.maxDepth, depth + 1))} disabled={done}>Search one layer deeper</button>
    <button class="b ui" onclick={() => (depth = graph.maxDepth)} disabled={done}>Search to the end</button>
    <button class="b ui" onclick={() => (depth = 0)}>Start again</button>
  {/snippet}
  <svg viewBox="0 0 300 300" class="g" role="img" aria-label="{visited.length} states visited; {failed.length ? `assertion fails in state ${failed[0]}` : 'no failure yet'}">
    {#each [...graph.edges.entries()] as [a, outs] (a)}
      {#each [...outs] as b (b)}
        {@const live = visited.includes(a)}
        <path d={edgePath(a, b)} class="e" class:live />
      {/each}
    {/each}
    {#each Array.from({ length: 16 }) as _, q (q)}
      {@const p = pos(q)}
      {@const seen = visited.includes(q)}
      <circle cx={p.x} cy={p.y} r="13" class="n" class:seen class:bad={seen && bad(q)} class:unreach={!graph.layer.has(q)} />
      <text x={p.x} y={p.y + 4} class="t">{q}</text>
    {/each}
    <text x={C} y={C - 4} class="mid">{done ? 'done' : `layer ${depth}`}</text>
    <text x={C} y={C + 12} class="mid s">{visited.length} of 16 visited</text>
  </svg>
  <p class="ui verdict" class:badtext={failed.length > 0} aria-live="polite">
    {#if failed.length}Assertion fails in state {failed[0]}, reached {graph.layer.get(failed[0]!)} clock edges after power-on: a counterexample.
    {:else if done}Search complete: {visited.length} reachable states, the assertion holds in all of them. States never reached (grey) do not matter.
    {:else}No failure in the states visited so far.{/if}
  </p>
</Widget>

<style>
  .b {
    font: inherit;
    font-size: 0.82rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .b:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .g {
    width: 100%;
    max-width: 24rem;
    height: auto;
    display: block;
    margin: 0 auto;
    font-family: var(--font-ui);
  }
  .e {
    fill: none;
    stroke: var(--line);
    stroke-width: 1;
  }
  .e.live {
    stroke: var(--ink-3);
    stroke-width: 1.4;
  }
  .n {
    fill: var(--surface);
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }
  .n.unreach {
    fill: var(--surface-2);
    stroke: var(--line-strong);
    stroke-dasharray: 2 2;
  }
  .n.seen {
    fill: var(--accent-soft);
    stroke: var(--accent);
    stroke-width: 2.5;
  }
  .n.bad {
    fill: var(--bad-soft);
    stroke: var(--bad);
  }
  .t {
    font-size: 11px;
    font-weight: 700;
    text-anchor: middle;
    fill: var(--ink);
  }
  .mid {
    font-size: 13px;
    font-weight: 700;
    text-anchor: middle;
    fill: var(--ink-2);
  }
  .mid.s {
    font-size: 10px;
    font-weight: 400;
  }
  .verdict {
    font-size: 0.86rem;
    margin: 0.5rem 0 0;
  }
  .badtext {
    color: var(--bad);
  }
</style>

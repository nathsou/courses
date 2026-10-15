<!--
  Build a factor tree your own way: click a composite leaf and choose how to split it. Whatever choices you
  make, the primes at the bottom are the same — that is the fundamental theorem of arithmetic.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import { isPrimeTrial } from '$lib/primes/primality';

  interface Node {
    v: number;
    kids?: [Node, Node];
  }

  let text = $state('360');
  let parsed = $state<bigint | null>(360n);
  let root = $state<Node>({ v: 360 });
  let selected = $state<Node | null>(null);

  $effect(() => {
    if (parsed !== null && parsed >= 2n && parsed <= 1_000_000n) {
      root = { v: Number(parsed) };
      selected = null;
    }
  });

  const splits = (n: number) => {
    const out: [number, number][] = [];
    for (let d = 2; d * d <= n; d++) if (n % d === 0) out.push([d, n / d]);
    return out;
  };

  function leaves(n: Node): number[] {
    return n.kids ? [...leaves(n.kids[0]), ...leaves(n.kids[1])] : [n.v];
  }
  function split(node: Node, a: number, b: number) {
    node.kids = [{ v: a }, { v: b }];
    selected = null;
  }
  function autoSplit(node: Node) {
    if (node.kids || isPrimeTrial(node.v)) return;
    const s = splits(node.v);
    const pick = s[Math.floor(Math.random() * s.length)]!;
    node.kids = [{ v: pick[0] }, { v: pick[1] }];
    autoSplit(node.kids[0]);
    autoSplit(node.kids[1]);
  }

  // Layout: leaves get consecutive x slots; each parent sits above the midpoint of its children.
  const layout = $derived.by(() => {
    const pos = new Map<Node, { x: number; y: number }>();
    let slot = 0;
    const place = (n: Node, depth: number): number => {
      const x = n.kids ? (place(n.kids[0], depth + 1) + place(n.kids[1], depth + 1)) / 2 : slot++;
      pos.set(n, { x, y: depth });
      return x;
    };
    place(root, 0);
    const items = [...pos].map(([node, p]) => ({ node, ...p }));
    const edges = items.flatMap((it) => (it.node.kids ?? []).map((k) => ({ x1: it.x, y1: it.y, x2: pos.get(k)!.x, y2: pos.get(k)!.y })));
    return { items, edges, slots: Math.max(1, slot), depth: Math.max(...items.map((i) => i.y)) };
  });

  const COL = 64;
  const ROW = 56;
  const primeLeaves = $derived(leaves(root).sort((a, b) => a - b));
  const done = $derived(primeLeaves.every(isPrimeTrial));
  const product = $derived.by(() => {
    const counts = new Map<number, number>();
    for (const p of primeLeaves) counts.set(p, (counts.get(p) ?? 0) + 1);
    const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return [...counts].map(([p, e]) => (e > 1 ? `${p}${String(e).replace(/\d/g, (d) => SUP[Number(d)]!)}` : `${p}`)).join(' · ');
  });
</script>

<Widget title="Grow a factor tree" subtitle="Click a composite number (blue) and choose how to split it. Grow the tree a different way and compare the primes at the bottom." onreset={() => ((root = { v: Number(parsed ?? 360n) }), (selected = null))}>
  {#snippet controls()}
    <NumberInput label="n (2 to 1,000,000)" bind:value={text} bind:parsed min={2n} max={1_000_000n} />
    <button class="auto" onclick={() => { root = { v: root.v }; autoSplit(root); selected = null; }}>Random tree</button>
  {/snippet}
  <div class="tree">
    <svg width={layout.slots * COL} height={(layout.depth + 1) * ROW} viewBox="{-COL / 2} {-ROW / 2} {layout.slots * COL} {(layout.depth + 1) * ROW}">
      {#each layout.edges as e, i (i)}
        <line x1={e.x1 * COL} y1={e.y1 * ROW} x2={e.x2 * COL} y2={e.y2 * ROW} />
      {/each}
      {#each layout.items as it, i (i)}
        {@const prime = isPrimeTrial(it.node.v)}
        {@const open = !prime && !it.node.kids}
        <g transform="translate({it.x * COL},{it.y * ROW})" class:prime class:open class:sel={selected === it.node}>
          {#if open}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <rect x="-26" y="-14" width="52" height="28" rx="14" role="button" tabindex="0" aria-label="Split {it.node.v}" onclick={() => (selected = it.node)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selected = it.node)} />
          {:else}
            <rect x="-26" y="-14" width="52" height="28" rx="14" />
          {/if}
          <text dy="0.35em" text-anchor="middle">{it.node.v}</text>
        </g>
      {/each}
    </svg>
  </div>
  {#if selected}
    <div class="choices ui" role="group" aria-label="Ways to split {selected.v}">
      <span>Split {selected.v} as</span>
      {#each splits(selected.v) as [a, b] (a)}
        <button onclick={() => split(selected!, a, b)}>{a} × {b}</button>
      {/each}
    </div>
  {/if}
  <p class="out" aria-live="polite">
    {#if done}
      Done: {root.v} = <strong>{product}</strong>. Try another tree: the bottom row never changes.
    {:else}
      Leaves so far: {primeLeaves.join(' · ')}. Click a blue number to split it.
    {/if}
  </p>
</Widget>

<style>
  .tree {
    overflow-x: auto;
    padding: 0.25rem 0;
  }
  svg {
    display: block;
    margin: 0 auto;
    font-family: var(--font-mono);
    font-size: 13px;
  }
  line {
    stroke: var(--line-strong);
  }
  rect {
    fill: var(--surface);
    stroke: var(--line-strong);
  }
  .open rect {
    fill: color-mix(in srgb, var(--fx-blue) 16%, var(--surface));
    stroke: var(--fx-blue);
    cursor: pointer;
  }
  .open rect:focus-visible {
    outline: none;
    stroke-width: 3;
  }
  .sel rect {
    stroke-width: 3;
  }
  .prime rect {
    fill: var(--prime);
    stroke: var(--prime);
  }
  .prime text {
    fill: var(--on-accent);
    font-weight: 600;
  }
  text {
    fill: var(--ink);
    pointer-events: none;
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.5rem;
    font-size: 0.82rem;
  }
  .choices button,
  .auto {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    cursor: pointer;
  }
  .choices button:hover,
  .auto:hover {
    background: var(--pn);
  }
  .out {
    margin: 0.6rem 0 0;
    font-variant-numeric: tabular-nums;
  }
</style>

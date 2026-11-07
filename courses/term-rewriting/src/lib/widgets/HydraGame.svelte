<script lang="ts">
  /**
   * Kirby and Paris's hydra. Chop a head; if its neck is not attached to the ground, the node two
   * levels down grows n copies of the remaining branch, where n is the number of the move.
   * Every strategy wins, eventually (a descent in ε₀).
   */
  import Widget from '$lib/components/ui/Widget.svelte';

  type H = H[];
  const clone = (h: H): H => h.map(clone);
  let { start = '((())(()))' }: { start?: string } = $props();
  function parse(s: string): H {
    const stack: H[] = [[]];
    for (const ch of s) {
      if (ch === '(') stack.push([]);
      else if (ch === ')') {
        const top = stack.pop()!;
        stack.at(-1)!.push(top);
      }
    }
    return stack[0]!;
  }
  // svelte-ignore state_referenced_locally
  let hydra = $state<H>(parse(start));
  let move = $state(0);
  const heads = (h: H): number => h.reduce((a, c) => a + (c.length ? heads(c) : 1), 0);
  const nodes = (h: H): number => h.reduce((a, c) => a + 1 + nodes(c), 0);

  /** Chop the head at a path of child indices. */
  function chop(path: number[]) {
    const root = clone(hydra);
    move++;
    const parentPath = path.slice(0, -1);
    const parent = parentPath.reduce<H>((h, i) => h[i]!, root);
    parent.splice(path.at(-1)!, 1);
    if (parentPath.length >= 1) {
      const grand = parentPath.slice(0, -1).reduce<H>((h, i) => h[i]!, root);
      for (let k = 0; k < move; k++) grand.push(clone(parent));
    }
    hydra = root;
  }
  // Layout: leaves left to right.
  interface N {
    x: number;
    y: number;
    path: number[];
    head: boolean;
    px?: number;
    py?: number;
  }
  const layout = $derived.by(() => {
    const out: N[] = [];
    let leaf = 0;
    let depthMax = 0;
    const go = (h: H, path: number[], depth: number): number => {
      depthMax = Math.max(depthMax, depth);
      if (h.length === 0) {
        out.push({ x: leaf, y: depth, path, head: path.length > 0 });
        return leaf++;
      }
      const xs = h.map((c, i) => go(c, [...path, i], depth + 1));
      const x = (xs[0]! + xs.at(-1)!) / 2;
      out.push({ x, y: depth, path, head: false });
      return x;
    };
    go(hydra, [], 0);
    const byPath = new Map(out.map((n) => [n.path.join('.'), n]));
    for (const n of out) if (n.path.length) {
      const p = byPath.get(n.path.slice(0, -1).join('.'))!;
      n.px = p.x;
      n.py = p.y;
    }
    return { nodes: out, width: Math.max(1, leaf), depth: depthMax };
  });
  const dx = $derived(Math.max(6, Math.min(36, 640 / layout.width)));
  const W = $derived(layout.width * dx + 40);
  const H_ = $derived(layout.depth * 46 + 50);
  const X = (x: number) => 20 + x * dx + dx / 2;
  const Y = (y: number) => H_ - 22 - y * 46;
</script>

<Widget title="The hydra" subtitle="Click a head to cut it off. The hydra regrows copies of the wounded branch, more each move. Can you win?" onreset={() => ((hydra = parse(start)), (move = 0))}>
  <p class="w-note">Move {move} · {heads(hydra)} head{heads(hydra) === 1 ? '' : 's'} · {nodes(hydra)} segments{heads(hydra) === 0 ? ' · You won!' : ''}</p>
  <div class="w-scroll">
    <svg viewBox="0 0 {W} {H_}" style="max-width: {Math.min(W, 720)}px" role="img" aria-label="The hydra">
      <line x1="0" x2={W} y1={Y(0) + 4} y2={Y(0) + 4} class="ground" />
      {#each layout.nodes as n (n.path.join('.'))}
        {#if n.px !== undefined}<line x1={X(n.px)} y1={Y(n.py!)} x2={X(n.x)} y2={Y(n.y)} class="neck" />{/if}
      {/each}
      {#each layout.nodes as n (n.path.join('.'))}
        {#if n.head}
          <circle cx={X(n.x)} cy={Y(n.y)} r={Math.min(9, dx / 2.2)} class="head" role="button" tabindex="0" aria-label="Cut this head" onclick={() => chop(n.path)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), chop(n.path))} />
        {:else}
          <circle cx={X(n.x)} cy={Y(n.y)} r="3" class="joint" />
        {/if}
      {/each}
    </svg>
  </div>
  {#if nodes(hydra) > 400}<p class="w-note">The hydra is getting big. It still dies eventually, whatever you do; it just takes a very long time.</p>{/if}
</Widget>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
    margin: 0 auto;
  }
  .ground {
    stroke: var(--ink-3);
    stroke-width: 2;
  }
  .neck {
    stroke: var(--nf);
    stroke-width: 2;
  }
  .joint {
    fill: var(--nf);
  }
  .head {
    fill: var(--redex);
    cursor: pointer;
  }
  .head:hover,
  .head:focus-visible {
    fill: var(--bad);
    outline: none;
  }
</style>

<script lang="ts">
  /** An e-graph drawn as e-classes (dashed boxes) holding e-nodes; step equality saturation and extract. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseProgram, parseTerm } from '$lib/trs/parse';
  import { EGraph, saturate, type SaturationReport } from '$lib/trs/egraph';
  import { show } from '$lib/trs/term';

  let { rules, term, title = 'An e-graph' }: { rules: string; term: string; title?: string } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  // svelte-ignore state_referenced_locally
  let tSrc = $state(term);
  let version = $state(0);
  let eg = $state<EGraph | null>(null);
  let root = $state(0);
  let report = $state<SaturationReport['iterations']>([]);
  let stop = $state('');
  let error = $state('');
  function reset() {
    try {
      const prog = parseProgram(src);
      const e = new EGraph();
      root = e.add(parseTerm(tSrc, prog.fixity));
      eg = e;
      report = [];
      stop = '';
      error = '';
      version++;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
  $effect(() => {
    void src;
    void tSrc;
    reset();
  });
  function iterate(n: number) {
    if (!eg) return;
    const prog = parseProgram(src);
    const r = saturate(eg, prog.rules, { iterations: n, nodes: 3000 });
    report = [...report, ...r.iterations];
    stop = r.stop;
    version++;
  }
  const snap = $derived.by(() => {
    void version;
    if (!eg) return null;
    const classes = eg.snapshot();
    let best = '';
    try {
      best = show(eg.extract(root).term, parseProgram(src).fixity);
    } catch {
      best = '—';
    }
    return { classes, best, rootId: eg.find(root) };
  });
  // Layout: classes in rows by "height" (longest path to a leaf class), drawn as boxes of nodes.
  const layout = $derived.by(() => {
    if (!snap || !eg) return null;
    const height = new Map<number, number>();
    const h = (id: number, seen = new Set<number>()): number => {
      if (height.has(id)) return height.get(id)!;
      if (seen.has(id)) return 0;
      seen.add(id);
      const c = snap.classes.find((x) => x.id === id);
      let v = 0;
      for (const n of c?.nodes ?? []) for (const ch of n.children) v = Math.max(v, 1 + h(eg!.find(ch), seen));
      height.set(id, v);
      return v;
    };
    for (const c of snap.classes) h(c.id);
    const rows = new Map<number, typeof snap.classes>();
    for (const c of snap.classes) {
      const r = height.get(c.id)!;
      rows.set(r, [...(rows.get(r) ?? []), c]);
    }
    const maxH = Math.max(0, ...rows.keys());
    const boxes: { id: number; x: number; y: number; w: number; nodes: { label: string; x: number; children: number[] }[] }[] = [];
    let W = 0;
    for (let r = maxH; r >= 0; r--) {
      let x = 10;
      for (const c of rows.get(r) ?? []) {
        const nodes = c.nodes.map((n) => {
          const label = n.op.startsWith('?') ? n.op.slice(1) : n.op;
          const w = Math.max(28, label.length * 8 + 14);
          const nx = x + 8;
          x += w + 6;
          return { label, x: nx + w / 2, w, children: n.children.map((ch) => eg!.find(ch)) };
        });
        const w = nodes.reduce((a, n) => a + n.w + 6, 0) + 10;
        boxes.push({ id: c.id, x: x - w + 2, y: 14 + (maxH - r) * 74, w, nodes });
        x += 18;
      }
      W = Math.max(W, x);
    }
    return { boxes, W, H: (maxH + 1) * 74 + 10 };
  });
  const boxOf = (id: number) => layout?.boxes.find((b) => b.id === id);
</script>

<Widget {title} subtitle="Dashed boxes are e-classes: every node inside one denotes an equal term. Each node's arguments point to classes, not to nodes." onreset={() => ((src = rules), (tSrc = term))}>
  <textarea class="w-input" rows={Math.min(8, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  <div class="w-row">
    <label class="grow">Term <input class="w-input" bind:value={tSrc} spellcheck="false" /></label>
    <button class="w-btn primary" onclick={() => iterate(1)} disabled={stop === 'saturated'}>Apply all rules once</button>
    <button class="w-btn" onclick={() => iterate(10)} disabled={stop === 'saturated'}>Saturate</button>
  </div>
  {#if error}<p class="w-note w-bad">{error}</p>{/if}
  {#if layout && snap}
    <div class="w-scroll">
      <svg viewBox="0 0 {layout.W} {layout.H}" style="max-width: {Math.min(layout.W, 760)}px" role="img" aria-label="The e-graph">
        {#each layout.boxes as b (b.id)}
          {#each b.nodes as n, i (i)}
            {#each n.children as ch, j (j)}
              {@const t = boxOf(ch)}
              {#if t}<line x1={n.x} y1={b.y + 34} x2={t.x + t.w / 2} y2={t.y + 4} class="arg" />{/if}
            {/each}
          {/each}
        {/each}
        {#each layout.boxes as b (b.id)}
          <rect x={b.x} y={b.y} width={b.w} height="40" rx="8" class="cls" class:root={b.id === snap.rootId} />
          <text x={b.x + 4} y={b.y - 3} class="cid">#{b.id}</text>
          {#each b.nodes as n, i (i)}
            <rect x={n.x - (n.label.length * 8 + 14) / 2} y={b.y + 8} width={Math.max(28, n.label.length * 8 + 14)} height="24" rx="5" class="enode" />
            <text x={n.x} y={b.y + 24.5} class="lab">{n.label}</text>
          {/each}
        {/each}
      </svg>
    </div>
    <p class="w-note">{snap.classes.length} e-classes, {snap.classes.reduce((a, c) => a + c.nodes.length, 0)} e-nodes{stop ? ` · ${stop}` : ''} · cheapest term in the root class: <span class="w-code">{snap.best}</span></p>
    {#if report.length}
      <p class="w-note">Iterations: {report.map((r, i) => `${i + 1}: ${r.matches} matches, ${r.unions} merges`).join(' · ')}</p>
    {/if}
  {/if}
</Widget>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .cls {
    fill: none;
    stroke: var(--ink-3);
    stroke-dasharray: 4 3;
  }
  .cls.root {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .cid {
    font-family: var(--font-mono);
    font-size: 9px;
    fill: var(--mute);
  }
  .enode {
    fill: var(--surface);
    stroke: var(--ink-3);
  }
  .lab {
    font-family: var(--font-mono);
    font-size: 12px;
    text-anchor: middle;
    fill: var(--ink);
  }
  .arg {
    stroke: var(--line-strong);
    stroke-width: 1.2;
  }
</style>

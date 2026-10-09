<!--
  One ESLint code path drawn as a graph: a box per segment (with the code evaluated in it), arrows for the
  successors, dashed boxes for unreachable segments, and curved arrows for loop back edges. Layout: segments in
  layers by their longest distance from the initial segment, ignoring back edges.
-->
<script lang="ts">
  import type { CodePathInfo } from '$lib/sa/runtime/inspect';

  let {
    path,
    code,
    picked,
    onpick,
    facts,
    labels,
    changed,
  }: {
    path: CodePathInfo;
    code: string;
    picked?: string | null;
    onpick?: (segmentId: string, range?: [number, number]) => void;
    /** Optional text per segment (e.g. analysis facts), shown under its code. */
    facts?: Record<string, string>;
    /** Optional lines to show instead of a segment's code (for graphs that are not ESLint's). */
    labels?: Record<string, string[]>;
    /** Segments to mark as changed (e.g. by the last step of an analysis). */
    changed?: string | null;
  } = $props();

  const uid = $props.id();
  const W = 210;
  const LINE = 15;
  const GAP_Y = 34;
  const GAP_X = 26;

  const layout = $derived.by(() => {
    const segs = path.segments;
    const ids = new Set(segs.map((s) => s.id));
    const back = new Set(path.loops.map(([a, b]) => `${a}>${b}`));
    // Longest-path layering on the graph without back edges.
    const level = new Map<string, number>();
    const order: string[] = [];
    const indeg = new Map(segs.map((s) => [s.id, 0]));
    for (const s of segs) for (const n of s.next) if (ids.has(n) && !back.has(`${s.id}>${n}`)) indeg.set(n, (indeg.get(n) ?? 0) + 1);
    const queue = segs.filter((s) => (indeg.get(s.id) ?? 0) === 0).map((s) => s.id);
    for (const q of queue) level.set(q, 0);
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      const s = segs.find((x) => x.id === id)!;
      for (const n of s.next) {
        if (!ids.has(n) || back.has(`${id}>${n}`)) continue;
        level.set(n, Math.max(level.get(n) ?? 0, (level.get(id) ?? 0) + 1));
        indeg.set(n, (indeg.get(n) ?? 1) - 1);
        if (indeg.get(n) === 0) queue.push(n);
      }
    }
    for (const s of segs) if (!level.has(s.id)) level.set(s.id, 0);
    const wrap = (t: string, width = 30) => {
      const out: string[] = [];
      let line = '';
      for (const word of t.split(/(?<=[ ,])/)) {
        if (line && (line + word).length > width) {
          out.push(line.trimEnd());
          line = '';
        }
        line += word;
      }
      if (line) out.push(line.trimEnd());
      return out;
    };
    const text = (s: (typeof segs)[number]) => {
      if (labels?.[s.id]) return labels[s.id]!.map((t) => (t.length > 30 ? `${t.slice(0, 29)}…` : t));
      const lines = s.nodes.map((n) => code.slice(n.range[0], n.range[1]).replace(/\s+/g, ' ')).map((t) => (t.length > 30 ? `${t.slice(0, 29)}…` : t));
      return lines.length ? lines.slice(0, 6) : ['(empty)'];
    };
    const rows = new Map<number, string[]>();
    for (const s of segs) rows.set(level.get(s.id)!, [...(rows.get(level.get(s.id)!) ?? []), s.id]);
    const boxes = new Map<string, { x: number; y: number; w: number; h: number; lines: string[]; fact?: string[] }>();
    let y = 10;
    let width = 0;
    for (const lvl of [...rows.keys()].sort((a, b) => a - b)) {
      const row = rows.get(lvl)!;
      let x = 40;
      let rowH = 0;
      for (const id of row) {
        const s = segs.find((q) => q.id === id)!;
        const lines = text(s);
        const fact = facts?.[id] !== undefined ? wrap(facts[id]!) : undefined;
        const h = 22 + lines.length * LINE + (fact ? fact.length * LINE + 6 : 0);
        boxes.set(id, { x, y, w: W, h, lines, fact });
        x += W + GAP_X;
        rowH = Math.max(rowH, h);
      }
      width = Math.max(width, x);
      y += rowH + GAP_Y;
    }
    const edges: { d: string; back: boolean; dead: boolean }[] = [];
    const reachable = new Map(segs.map((q) => [q.id, q.reachable]));
    for (const s of segs) {
      const a = boxes.get(s.id)!;
      for (const n of s.next) {
        const b = boxes.get(n);
        if (!b) continue;
        const isBack = back.has(`${s.id}>${n}`) || b.y <= a.y;
        if (isBack) {
          const x1 = a.x + a.w;
          const y1 = a.y + a.h / 2;
          const x2 = b.x + b.w;
          const y2 = b.y + b.h / 2;
          const bulge = Math.max(x1, x2) + 28;
          edges.push({ d: `M${x1},${y1} C${bulge},${y1} ${bulge},${y2} ${x2 + 4},${y2}`, back: true, dead: !reachable.get(n) });
        } else if (level.get(n)! - level.get(s.id)! > 1) {
          // An edge that skips a layer goes around the left, not behind the boxes in between, then along the gap
          // above the target's row, and into the target from the top.
          const x1 = a.x;
          const y1 = a.y + a.h / 2;
          const bulge = Math.min(a.x, b.x) - 24;
          const gap = b.y - GAP_Y / 2;
          const x2 = b.x + b.w / 2;
          const y2 = b.y - 4;
          edges.push({ d: `M${x1},${y1} C${bulge},${y1} ${bulge},${y1} ${bulge},${y1 + 12} L${bulge},${gap - 8} Q${bulge},${gap} ${bulge + 8},${gap} L${x2 - 8},${gap} Q${x2},${gap} ${x2},${gap + 8} L${x2},${y2}`, back: false, dead: !reachable.get(n) });
        } else {
          const x1 = a.x + a.w / 2;
          const y1 = a.y + a.h;
          const x2 = b.x + b.w / 2;
          const y2 = b.y - 4;
          edges.push({ d: `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`, back: false, dead: !reachable.get(n) });
        }
      }
    }
    return { boxes, edges, width: width + 40, height: y };
  });

  const finals = $derived(new Set(path.final));
  const thrown = $derived(new Set(path.thrown));
</script>

<svg class="cpg" viewBox="0 0 {layout.width} {layout.height}" width={layout.width} height={layout.height} role="img" aria-label="Code path of {path.name}: {path.segments.length} segments">
  <defs>
    <marker id="cpg-arrow-{uid}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L8,4 L0,8 z" class="head" />
    </marker>
  </defs>
  {#each layout.edges as e, i (i)}
    <path d={e.d} class="edge" class:back={e.back} class:dead={e.dead} marker-end="url(#cpg-arrow-{uid})" />
  {/each}
  {#each path.segments as s (s.id)}
    {@const b = layout.boxes.get(s.id)!}
    <g
      class="seg"
      class:unreachable={!s.reachable}
      class:initial={s.id === path.initial}
      class:final={finals.has(s.id)}
      class:picked={picked === s.id}
      class:changed={changed === s.id}
      role="button"
      tabindex="0"
      aria-label="Segment {s.id}{s.reachable ? '' : ' (unreachable)'}"
      onclick={() => onpick?.(s.id, s.nodes[0] ? [s.nodes[0].range[0], s.nodes[s.nodes.length - 1]!.range[1]] : undefined)}
      onkeydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && onpick?.(s.id)}
    >
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="5" />
      <text x={b.x + 8} y={b.y + 15} class="id">{s.id}{s.id === path.initial ? ' · start' : ''}{finals.has(s.id) ? (thrown.has(s.id) ? ' · throws' : ' · end') : ''}{s.reachable ? '' : ' · unreachable'}</text>
      {#each b.lines as l, j (j)}
        <text x={b.x + 8} y={b.y + 32 + j * LINE} class="code">{l}</text>
      {/each}
      {#if b.fact}
        {#each b.fact as f, j (j)}
          <text x={b.x + 8} y={b.y + 32 + (b.lines.length + j) * LINE + 4} class="fact">{f}</text>
        {/each}
      {/if}
    </g>
  {/each}
</svg>

<style>
  .cpg {
    display: block;
    max-width: none;
    font-family: var(--font-mono);
  }
  .edge {
    fill: none;
    stroke: var(--edge);
    stroke-width: 1.4;
  }
  .edge.back {
    stroke: var(--accent);
    stroke-dasharray: 5 3;
  }
  .edge.dead {
    stroke-dasharray: 2 3;
    opacity: 0.6;
  }
  .head {
    fill: var(--edge);
  }
  .seg rect {
    fill: var(--panel);
    stroke: var(--line-strong);
    stroke-width: 1.2;
  }
  .seg {
    cursor: pointer;
    outline: none;
  }
  .seg:focus-visible rect,
  .seg:hover rect {
    stroke: var(--accent);
  }
  .seg.initial rect {
    stroke: var(--ok);
    stroke-width: 2;
  }
  .seg.final rect {
    stroke-width: 2;
  }
  .seg.unreachable rect {
    stroke-dasharray: 4 3;
    fill: var(--surface-3);
  }
  .seg.picked rect {
    fill: var(--amber-soft);
    stroke: var(--amber);
  }
  .seg.changed rect {
    stroke: var(--accent);
    stroke-width: 2.4;
  }
  .id {
    font-size: 10px;
    fill: var(--mute);
    font-weight: 700;
  }
  .code {
    font-size: 11px;
    fill: var(--fg);
  }
  .fact {
    font-size: 10.5px;
    fill: var(--accent-ink);
    font-weight: 600;
  }
</style>

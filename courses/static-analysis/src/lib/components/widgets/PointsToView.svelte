<!--
  Points-to graphs for a JavaScript snippet: variables on the left, objects (allocation sites) on the right, an
  arrow for each "may point to", and labelled arrows between objects for fields. Andersen's and Steensgaard's
  analyses side by side; Steensgaard's classes are coloured. The facts are shown as Datalog.
  `:::points-to-view` with a ```js block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/editor/CodeEditor.svelte';
  import { andersen, extract, steensgaard, toDatalog, PointsToError, type Extracted, type PointsTo } from '$lib/sa/interproc/pointsto';

  let {
    code,
    initial = 'andersen',
    n,
    caption,
    title = 'Points-to graph',
    subtitle = 'Each arrow is a “may point to”. Switch analyses to compare; click an object to find where it is created.',
  }: { code: string; initial?: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  // svelte-ignore state_referenced_locally
  let algorithm = $state<'andersen' | 'steensgaard'>(initial === 'steensgaard' ? 'steensgaard' : 'andersen');
  let temps = $state(false);
  let picked = $state<[number, number] | null>(null);
  let focus = $state<string | null>(null);

  const built = $derived.by((): Partial<Extracted> & { result?: PointsTo; error?: string } => {
    try {
      const x = extract(source);
      const result = algorithm === 'andersen' ? andersen(x.facts) : steensgaard(x.facts, x.sites.map((s) => s.id));
      return { ...x, result };
    } catch (e) {
      return { error: e instanceof PointsToError ? e.message : String(e) };
    }
  });

  const ROW = 30;
  const VX = 20;
  const VW = 92;
  const OX = 250;
  const OW = 130;
  const layout = $derived.by(() => {
    if (!built.result) return undefined;
    const vars = built.vars!.filter((v) => temps || !v.startsWith('$'));
    const sites = built.sites!;
    const rows = Math.max(vars.length, sites.length);
    const vy = new Map(vars.map((v, i) => [v, 24 + i * ROW + ((rows - vars.length) * ROW) / 2]));
    const oy = new Map(sites.map((s, i) => [s.id, 24 + i * ROW + ((rows - sites.length) * ROW) / 2]));
    const edges: { from: string; to: string; d: string }[] = [];
    for (const v of vars) for (const o of built.result.pts.get(v) ?? []) {
      const y1 = vy.get(v)!;
      const y2 = oy.get(o)!;
      edges.push({ from: v, to: o, d: `M${VX + VW},${y1} C${(VX + VW + OX) / 2},${y1} ${(VX + VW + OX) / 2},${y2} ${OX - 4},${y2}` });
    }
    const fields: { from: string; to: string; f: string; d: string; lx: number; ly: number }[] = [];
    let k = 0;
    for (const s of sites) {
      for (const [f, targets] of built.result.heap.get(s.id) ?? []) {
        for (const t of targets) {
          const y1 = oy.get(s.id)!;
          const y2 = oy.get(t)!;
          const bulge = OX + OW + 30 + (k++ % 4) * 16 + Math.abs(y2 - y1) / 4;
          const d = s.id === t ? `M${OX + OW},${y1 - 6} C${OX + OW + 40},${y1 - 26} ${OX + OW + 40},${y1 + 26} ${OX + OW + 4},${y1 + 6}` : `M${OX + OW},${y1} C${bulge},${y1} ${bulge},${y2} ${OX + OW + 4},${y2}`;
          fields.push({ from: s.id, to: t, f, d, lx: s.id === t ? OX + OW + 34 : bulge - 6, ly: (y1 + y2) / 2 + 4 });
        }
      }
    }
    return { vars, vy, oy, edges, fields, height: 24 + rows * ROW, width: OX + OW + 130 };
  });
  const PALETTE = ['#2f6fb0', '#b0592f', '#3f8f4f', '#8a4fb0', '#b0902f', '#2f9fa0', '#b02f6f'];
  const classColour = (o: string) => {
    const c = built.result?.classes?.get(o);
    return c === undefined ? undefined : PALETTE[c % PALETTE.length];
  };
  const touches = (from: string, to: string) => !focus || focus === from || focus === to;
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => { source = code; picked = null; focus = null; algorithm = initial === 'steensgaard' ? 'steensgaard' : 'andersen'; }}>
  <div class="pv">
    <CodeEditor value={source} lang="js" minLines={6} label="Code" onchange={(c) => { source = c; picked = null; focus = null; }} highlight={picked ? { from: picked[0], to: picked[1] } : null} />
    <div class="ui">
      <div class="bar">
        <div class="tabs" role="tablist" aria-label="Analysis">
          <button role="tab" aria-selected={algorithm === 'andersen'} class:on={algorithm === 'andersen'} onclick={() => (algorithm = 'andersen')}>Andersen (inclusion)</button>
          <button role="tab" aria-selected={algorithm === 'steensgaard'} class:on={algorithm === 'steensgaard'} onclick={() => (algorithm = 'steensgaard')}>Steensgaard (unification)</button>
        </div>
        <label><input type="checkbox" bind:checked={temps} /> show temporaries</label>
      </div>
      {#if built.error}
        <p class="err">{built.error}</p>
      {:else if layout && built.sites}
        <div class="scroll">
          <svg viewBox="0 0 {layout.width} {layout.height}" width={layout.width} height={layout.height} role="img" aria-label="Points-to graph">
            <defs><marker id="pt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" class="head" /></marker></defs>
            {#each layout.edges as e (e.from + e.to)}<path d={e.d} class="edge" class:dim={!touches(e.from, e.to)} marker-end="url(#pt-arrow)" />{/each}
            {#each layout.fields as e, i (i)}
              <path d={e.d} class="edge field" class:dim={!touches(e.from, e.to)} marker-end="url(#pt-arrow)" />
              <text x={e.lx} y={e.ly} class="flabel" class:dim={!touches(e.from, e.to)}>.{e.f}</text>
            {/each}
            {#each layout.vars as v (v)}
              {@const y = layout.vy.get(v)!}
              <g class="var" class:on={focus === v} role="button" tabindex="0" aria-label="variable {v}" onclick={() => (focus = focus === v ? null : v)} onkeydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (focus = focus === v ? null : v)}>
                <rect x={VX} y={y - 11} width={VW} height="22" rx="4" />
                <text x={VX + VW / 2} y={y + 4} text-anchor="middle">{v}</text>
              </g>
            {/each}
            {#each built.sites as s (s.id)}
              {@const y = layout.oy.get(s.id)!}
              <g class="obj" class:on={focus === s.id} role="button" tabindex="0" aria-label="object {s.id}, {s.label}, line {s.line}" onclick={() => { focus = focus === s.id ? null : s.id; picked = s.range; }} onkeydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && ((focus = s.id), (picked = s.range))}>
                <rect x={OX} y={y - 11} width={OW} height="22" rx="11" style:stroke={classColour(s.id)} style:stroke-width={classColour(s.id) ? 2.5 : undefined} />
                <text x={OX + OW / 2} y={y + 4} text-anchor="middle">{s.id} {s.label} · {s.line}</text>
              </g>
            {/each}
          </svg>
        </div>
        {#if built.result?.classes}<p class="note">Objects with the same outline colour are in one Steensgaard class: the analysis cannot tell them apart.</p>{/if}
        <details>
          <summary>The facts, as Datalog</summary>
          <pre>{toDatalog(built.facts!)}</pre>
        </details>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .pv {
    display: grid;
    gap: 0.7rem;
  }
  .pv > :global(*) {
    min-width: 0;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    align-items: center;
    font-size: 0.84rem;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .tabs button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .scroll {
    overflow-x: auto;
    margin-top: 0.5rem;
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .edge {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.4;
  }
  .edge.field {
    stroke: var(--maybe);
    stroke-dasharray: 4 3;
  }
  .dim {
    opacity: 0.15;
  }
  .head {
    fill: var(--ink-2);
  }
  .flabel {
    font-family: var(--font-mono, monospace);
    font-size: 10.5px;
    fill: var(--maybe);
  }
  .var rect,
  .obj rect {
    fill: var(--panel);
    stroke: var(--line-strong);
    stroke-width: 1.2;
  }
  .var.on rect,
  .obj.on rect {
    fill: color-mix(in srgb, var(--accent) 15%, var(--panel));
  }
  .var text,
  .obj text {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    fill: var(--fg);
    pointer-events: none;
  }
  .var,
  .obj {
    cursor: pointer;
  }
  .note {
    color: var(--ink-2);
    font-size: 0.8rem;
  }
  pre {
    font-size: 0.78rem;
    max-height: 14rem;
    overflow: auto;
  }
  summary {
    font-size: 0.84rem;
    cursor: pointer;
  }
  .err {
    color: var(--bad);
  }
</style>

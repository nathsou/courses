<!--
  The inverter's layout, with four design-rule errors. Select a shape (click it, or pick it from the list), then
  drag it, or drag one of its edges, to fix the errors; arrow keys move it by 1λ, Shift+arrow pushes that edge
  outwards and Alt+arrow pulls it in. DRC and LVS rerun after every change.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { BUGGY_INVERTER_LAYOUT, RULES, drc, lvsInverter, type Layer, type Layout, type Rect } from '$lib/eda/layout';

  let { start = BUGGY_INVERTER_LAYOUT, id = 'signoff/layout' }: { start?: Layout; id?: string } = $props();
  let rects = $state<Rect[]>(untrack(() => start.rects.map((r) => ({ ...r }))));
  let selected = $state<string | null>(null);
  let mounted = $state(false);
  onMount(() => {
    progress.load();
    const saved = progress.draft<Rect[] | null>(id, null);
    if (saved) rects = saved;
    mounted = true;
  });
  $effect(() => {
    if (mounted) progress.saveDraft(id, $state.snapshot(rects));
  });

  const layout = $derived<Layout>({ ...start, rects });
  const violations = $derived(drc(layout));
  const lvs = $derived(lvsInverter(layout));
  const clean = $derived(violations.length === 0 && lvs.length === 0);
  $effect(() => {
    if (clean && mounted) progress.markSolved(id);
  });

  const S = 10;
  const ORDER: Layer[] = ['nwell', 'active', 'poly', 'metal1', 'contact'];
  const drawn = $derived([...rects].sort((a, b) => ORDER.indexOf(a.layer) - ORDER.indexOf(b.layer)));
  const sel = $derived(rects.find((r) => r.id === selected) ?? null);
  const NAMES: Record<Layer, string> = { nwell: 'n-well', active: 'active', poly: 'poly', contact: 'contact', metal1: 'metal 1' };

  function update(id: string, f: (r: Rect) => Rect) {
    rects = rects.map((r) => (r.id === id ? f(r) : r));
  }
  let drag: { id: string; mode: 'move' | 'x0' | 'x1' | 'y0' | 'y1'; sx: number; sy: number; orig: Rect } | null = null;
  function toLambda(e: PointerEvent, svg: SVGSVGElement) {
    const b = svg.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * start.w, y: ((e.clientY - b.top) / b.height) * start.h };
  }
  function down(e: PointerEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const p = toLambda(e, svg);
    // The smallest shape under the pointer is the one meant (contacts sit on top of everything).
    const hits = rects.filter((r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1).sort((a, b) => (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0));
    const hit = hits.find((r) => r.id === selected) && hits[0]!.layer !== 'contact' ? rects.find((r) => r.id === selected)! : hits[0];
    if (!hit) {
      selected = null;
      return;
    }
    selected = hit.id;
    const edge = 0.8;
    const mode = Math.abs(p.x - hit.x0) < edge ? 'x0' : Math.abs(p.x - hit.x1) < edge ? 'x1' : Math.abs(p.y - hit.y0) < edge ? 'y0' : Math.abs(p.y - hit.y1) < edge ? 'y1' : 'move';
    drag = { id: hit.id, mode, sx: p.x, sy: p.y, orig: { ...hit } };
    svg.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    const p = toLambda(e, e.currentTarget as SVGSVGElement);
    const dx = Math.round(p.x - drag.sx);
    const dy = Math.round(p.y - drag.sy);
    const o = drag.orig;
    const d = drag;
    update(d.id, () => {
      if (d.mode === 'move') return { ...o, x0: o.x0 + dx, x1: o.x1 + dx, y0: o.y0 + dy, y1: o.y1 + dy };
      if (d.mode === 'x0') return { ...o, x0: Math.min(o.x1 - 1, o.x0 + dx) };
      if (d.mode === 'x1') return { ...o, x1: Math.max(o.x0 + 1, o.x1 + dx) };
      if (d.mode === 'y0') return { ...o, y0: Math.min(o.y1 - 1, o.y0 + dy) };
      return { ...o, y1: Math.max(o.y0 + 1, o.y1 + dy) };
    });
  }
  function up() {
    drag = null;
  }
  function key(e: KeyboardEvent) {
    if (!sel) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key] as [number, number] | undefined;
    if (!d) return;
    e.preventDefault();
    const [dx, dy] = d;
    update(sel.id, (r) => {
      if (e.shiftKey) return { ...r, x0: dx < 0 ? r.x0 - 1 : r.x0, x1: dx > 0 ? r.x1 + 1 : r.x1, y0: dy < 0 ? r.y0 - 1 : r.y0, y1: dy > 0 ? r.y1 + 1 : r.y1 };
      if (e.altKey) return { ...r, x0: dx < 0 && r.x1 - r.x0 > 1 ? r.x0 + 1 : r.x0, x1: dx > 0 && r.x1 - r.x0 > 1 ? r.x1 - 1 : r.x1, y0: dy < 0 && r.y1 - r.y0 > 1 ? r.y0 + 1 : r.y0, y1: dy > 0 && r.y1 - r.y0 > 1 ? r.y1 - 1 : r.y1 };
      return { ...r, x0: r.x0 + dx, x1: r.x1 + dx, y0: r.y0 + dy, y1: r.y1 + dy };
    });
  }
  function reset() {
    rects = start.rects.map((r) => ({ ...r }));
    selected = null;
  }
</script>

<Widget title="Fix the layout" subtitle="The inverter, drawn on five layers, with four design-rule errors (marked in red). Select a shape and drag it or its edges; or use the keyboard: arrows move it, Shift+arrow grows that side, Alt+arrow shrinks it." onreset={reset}>
  <div class="two">
    <div class="canvas">
      <!-- The editor takes keyboard focus so that arrow keys move the selected shape. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <svg viewBox="0 0 {start.w} {start.h}" class="lay" role="application" aria-label="Layout editor: arrow keys move the selected shape" tabindex="0" onkeydown={key} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
        <defs>
          <pattern id="hatch-well" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.4" class="hatch" /></pattern>
        </defs>
        {#each Array.from({ length: start.w + 1 }) as _, i (i)}<line x1={i} x2={i} y1="0" y2={start.h} class="gl" />{/each}
        {#each Array.from({ length: start.h + 1 }) as _, i (i)}<line y1={i} y2={i} x1="0" x2={start.w} class="gl" />{/each}
        {#each drawn as r (r.id)}
          <rect x={r.x0} y={r.y0} width={r.x1 - r.x0} height={r.y1 - r.y0} class="sh {r.layer}" class:sel={selected === r.id} />
          {#if r.layer === 'contact'}<path d="M{r.x0},{r.y0} L{r.x1},{r.y1} M{r.x1},{r.y0} L{r.x0},{r.y1}" class="cx" />{/if}
        {/each}
        {#if sel}<rect x={sel.x0} y={sel.y0} width={sel.x1 - sel.x0} height={sel.y1 - sel.y0} class="selbox" />{/if}
        {#each violations as v, i (i)}<rect x={v.at.x0 - 0.4} y={v.at.y0 - 0.4} width={v.at.x1 - v.at.x0 + 0.8} height={v.at.y1 - v.at.y0 + 0.8} class="viol" />{/each}
        {#each start.labels as l (l.name)}<text x={l.x} y={l.y + 0.6} class="lab">{l.name}</text>{/each}
      </svg>
    </div>
    <div class="side ui">
      <div class="legend">
        {#each ORDER as l (l)}<span><i class="sw {l}"></i>{NAMES[l]}</span>{/each}
      </div>
      <p class="h">Design-rule check</p>
      {#if violations.length}
        <ul class="list">
          {#each violations as v, i (i)}<li><button onclick={() => (selected = v.rects[0]!)}>{v.message}</button></li>{/each}
        </ul>
      {:else}<p class="ok">DRC clean.</p>{/if}
      <p class="h">Layout versus schematic</p>
      {#if lvs.length}
        <ul class="list">{#each lvs as m, i (i)}<li>{m}</li>{/each}</ul>
      {:else}<p class="ok">LVS clean: one nMOS from OUT to GND and one pMOS from VDD to OUT, both gated by IN.</p>{/if}
      {#if sel}<p class="selinfo">Selected: {NAMES[sel.layer]} “{sel.id}”, x {sel.x0}–{sel.x1}, y {sel.y0}–{sel.y1} (λ).</p>{/if}
      <p class="verdict" class:ok={clean} aria-live="polite">{clean ? 'Checked: DRC clean and LVS clean. This layout can go to the masks.' : `${violations.length} rule violation${violations.length === 1 ? '' : 's'}, ${lvs.length} LVS difference${lvs.length === 1 ? '' : 's'}.`}</p>
    </div>
  </div>
  <details class="rules ui">
    <summary>The rules</summary>
    <ul>{#each RULES as r (r.id)}<li>{r.text}</li>{/each}</ul>
  </details>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.2rem;
    align-items: start;
  }
  @media (max-width: 680px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .canvas {
    max-width: 22rem;
    border-radius: var(--radius-sm);
  }
  .lay {
    width: 100%;
    height: auto;
    display: block;
    background: var(--page);
    touch-action: none;
    cursor: pointer;
    font-family: var(--font-ui);
  }
  .gl {
    stroke: var(--line);
    stroke-width: 0.04;
  }
  .sh {
    stroke-width: 0.12;
  }
  .sh.nwell {
    fill: url(#hatch-well);
    stroke: var(--m-well);
    stroke-dasharray: 0.5 0.3;
  }
  .hatch {
    stroke: var(--m-well);
    stroke-width: 0.12;
  }
  .sh.active {
    fill: var(--m-active);
    fill-opacity: 0.55;
    stroke: var(--m-active);
  }
  .sh.poly {
    fill: var(--m-poly);
    fill-opacity: 0.75;
    stroke: var(--m-poly);
  }
  .sh.metal1 {
    fill: var(--m-metal1);
    fill-opacity: 0.4;
    stroke: var(--m-metal1);
  }
  .sh.contact {
    fill: var(--m-contact);
    stroke: var(--m-contact);
  }
  .cx {
    stroke: var(--page);
    stroke-width: 0.18;
  }
  .sh.sel {
    stroke-width: 0.3;
  }
  .selbox {
    fill: none;
    stroke: var(--ac);
    stroke-width: 0.35;
    stroke-dasharray: 0.6 0.4;
    pointer-events: none;
  }
  .viol {
    fill: none;
    stroke: var(--bad);
    stroke-width: 0.35;
    pointer-events: none;
  }
  .lab {
    font-size: 1.5px;
    font-weight: 700;
    fill: var(--ink);
    pointer-events: none;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.8rem;
    font-size: 0.78rem;
    margin-bottom: 0.5rem;
  }
  .sw {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    margin-right: 0.3rem;
    vertical-align: -0.1rem;
    border-radius: 2px;
  }
  .sw.nwell {
    border: 1px dashed var(--m-well);
  }
  .sw.active {
    background: var(--m-active);
  }
  .sw.poly {
    background: var(--m-poly);
  }
  .sw.metal1 {
    background: var(--m-metal1);
  }
  .sw.contact {
    background: var(--m-contact);
  }
  .h {
    margin: 0.6rem 0 0.2rem;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .list {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.82rem;
    color: var(--bad);
  }
  .list button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    text-align: left;
    cursor: pointer;
    text-decoration: underline dotted;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
    font-size: 0.84rem;
    margin: 0;
  }
  .selinfo {
    font-size: 0.78rem;
    color: var(--ink-2);
    margin: 0.6rem 0 0;
  }
  .verdict {
    font-size: 0.86rem;
    margin: 0.6rem 0 0;
  }
  .rules {
    margin-top: 0.6rem;
    font-size: 0.82rem;
  }
  .rules summary {
    cursor: pointer;
    color: var(--ink-2);
  }
</style>

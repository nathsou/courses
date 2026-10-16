<!--
  The map of the course: frameworks placed by what they find out before the page runs (left to right) and how much of
  the application the browser runs to become interactive (top to bottom). Slide the year to watch them move. The
  positions are the author's judgement, from the chapters, not measurements; the trajectories are what matters.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { ANSWERS, type AnswerId } from '../../../outline';

  let { n, title = 'The map', caption, year: initial = 2026 }: { n?: string | number; title?: string; caption?: string; year?: number } = $props();

  interface Way { year: number; x: number; y: number; note: string }
  interface Item {
    id: string;
    name: string;
    answers: AnswerId[];
    /** Waypoints, oldest first. x: what it knows before the page runs (0 nothing → 1 everything). y: how much runs in the browser to become interactive (0 almost nothing → 1 everything). */
    path: Way[];
  }

  const ITEMS: Item[] = [
    { id: 'angularjs', name: 'AngularJS → Angular', answers: ['check'], path: [
      { year: 2010, x: 0.03, y: 0.97, note: 'Watchers on every binding, a digest loop until nothing changes.' },
      { year: 2016, x: 0.4, y: 0.95, note: 'Angular 2: templates compiled into change-detection code; zone.js says when.' },
      { year: 2023, x: 0.52, y: 0.92, note: 'Signals arrive; views can be told instead of checked.' },
      { year: 2025, x: 0.6, y: 0.85, note: 'Zoneless change detection; incremental hydration.' },
    ] },
    { id: 'react', name: 'React', answers: ['diff', 'skip'], path: [
      { year: 2013, x: 0.08, y: 0.98, note: 'A function from state to a tree of descriptions; diffed.' },
      { year: 2017, x: 0.12, y: 0.97, note: 'Fiber: the diff becomes interruptible.' },
      { year: 2022, x: 0.35, y: 0.8, note: 'Server components in Next.js: some components never reach the browser.' },
      { year: 2025, x: 0.52, y: 0.75, note: 'React Compiler 1.0 decides memoization at build time.' },
    ] },
    { id: 'vue', name: 'Vue', answers: ['track', 'diff', 'compile'], path: [
      { year: 2014, x: 0.4, y: 0.92, note: 'Early Vue: getters and setters track reads; templates compile to DOM fragments.' },
      { year: 2016, x: 0.35, y: 0.93, note: 'Vue 2: a virtual DOM, with tracking deciding which component.' },
      { year: 2020, x: 0.55, y: 0.9, note: 'Vue 3: Proxy tracking; patch flags and block trees from the compiler.' },
      { year: 2026, x: 0.78, y: 0.86, note: 'Vapor mode: no virtual DOM at all.' },
    ] },
    { id: 'svelte', name: 'Svelte', answers: ['compile', 'track'], path: [
      { year: 2016, x: 0.7, y: 0.82, note: 'A compiler from templates to DOM code.' },
      { year: 2019, x: 0.92, y: 0.78, note: 'Svelte 3: assignments become bits; the compiler decides everything.' },
      { year: 2024, x: 0.82, y: 0.82, note: 'Svelte 5: runes; the compiler writes signals.' },
    ] },
    { id: 'solid', name: 'Solid', answers: ['track', 'compile'], path: [
      { year: 2018, x: 0.75, y: 0.88, note: 'Fine-grained signals under compiled templates.' },
      { year: 2026, x: 0.82, y: 0.78, note: 'Streaming SSR; the 2.0 signals core.' },
    ] },
    { id: 'lit', name: 'Lit', answers: ['check'], path: [
      { year: 2017, x: 0.12, y: 0.78, note: 'Tagged templates: compare each hole’s value.' },
      { year: 2026, x: 0.16, y: 0.72, note: 'SSR and signals through add-ons.' },
    ] },
    { id: 'htmx', name: 'htmx · Turbo · LiveView', answers: ['rebuild', 'skip'], path: [
      { year: 2012, x: 0.02, y: 0.08, note: 'Turbolinks, pjax: swap the page body with the server’s HTML.' },
      { year: 2023, x: 0.1, y: 0.06, note: 'Morphing keeps focus and form state.' },
    ] },
    { id: 'astro', name: 'Astro', answers: ['skip'], path: [
      { year: 2021, x: 0.55, y: 0.35, note: 'Islands: hydrate only the interactive components.' },
      { year: 2026, x: 0.6, y: 0.3, note: 'Server islands; view transitions between pages.' },
    ] },
    { id: 'qwik', name: 'Qwik', answers: ['skip', 'track', 'compile'], path: [
      { year: 2022, x: 0.92, y: 0.12, note: 'Resumable: state and handlers written into the HTML.' },
      { year: 2026, x: 0.94, y: 0.1, note: 'Prefetching from the bundle graph.' },
    ] },
  ];

  let year = $state(Math.min(2026, Math.max(2010, initial)));
  let focus = $state<'all' | AnswerId>('all');
  let picked = $state<string | null>(null);

  function at(item: Item, y: number): { x: number; y: number; note: string; alive: boolean } {
    const p = item.path;
    if (y < p[0]!.year) return { x: p[0]!.x, y: p[0]!.y, note: '', alive: false };
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i]!;
      const b = p[i + 1]!;
      if (y >= a.year && y <= b.year) {
        const t = (y - a.year) / (b.year - a.year);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, note: t < 0.5 ? a.note : b.note, alive: true };
      }
    }
    const last = p.at(-1)!;
    return { x: last.x, y: last.y, note: last.note, alive: true };
  }
  const placed = $derived(ITEMS.map((it) => ({ it, ...at(it, year) })));
  const visible = (it: Item) => focus === 'all' || it.answers.includes(focus);
  const W = 600;
  const H = 360;
  const px = (x: number) => 40 + x * (W - 70);
  const py = (y: number) => 20 + y * (H - 60);
  const sel = $derived(placed.find((p) => p.it.id === picked));
  const glyph = (id: AnswerId) => ANSWERS.find((a) => a.id === id)!.glyph;
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Where each framework sits, and where it has been moving. Slide the year; click a framework.">
  {#snippet controls()}
    <Slider label="Year" bind:value={year} min={2010} max={2026} step={1} format={(v) => String(v)} />
    <Segmented label="Highlight" bind:value={focus} options={[{ value: 'all', label: 'All' }, ...ANSWERS.map((a) => ({ value: a.id, label: `${a.glyph} ${a.label}` }))]} size="sm" />
  {/snippet}

  <svg viewBox="0 0 {W} {H}" class="map" role="group" aria-label="Map of frameworks">
    <rect x="40" y="20" width={W - 70} height={H - 60} class="plot" />
    <text x={W / 2} y={H - 8} class="axis">What the framework learns before the page runs →</text>
    <text x="12" y={H / 2} class="axis" transform="rotate(-90 12 {H / 2})">What the browser must run →</text>
    <text x="46" y="34" class="corner">everything runs in the browser</text>
    <text x="46" y={H - 46} class="corner">almost nothing does</text>
    <!-- trails -->
    {#each ITEMS as it (it.id)}
      {#if visible(it)}
        <polyline class="trail" points={it.path.filter((w) => w.year <= year).map((w) => `${px(w.x)},${py(w.y)}`).join(' ')} />
      {/if}
    {/each}
    {#each placed as p (p.it.id)}
      {#if p.alive}
        <g class="pt" class:dim={!visible(p.it)} class:on={picked === p.it.id} transform="translate({px(p.x)} {py(p.y)})" role="button" tabindex="0" aria-label="{p.it.name}, {year}: {p.note}" onclick={() => (picked = p.it.id)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (picked = p.it.id)}>
          <circle r="5" />
          <text x="8" y="3">{p.it.name} {p.it.answers.map(glyph).join('')}</text>
        </g>
      {/if}
    {/each}
  </svg>

  <p class="out ui" aria-live="polite">
    {#if sel}<b>{sel.it.name}, {year}:</b> {sel.note || 'not born yet.'}{:else}Click a framework to read what it was doing in {year}.{/if}
  </p>
</Widget>

<style>
  .map {
    display: block;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    font-family: var(--font-ui, inherit);
  }
  .plot {
    fill: var(--panel);
    stroke: var(--line-strong);
  }
  .axis {
    text-anchor: middle;
    font-size: 11px;
    fill: var(--ink-2);
  }
  .corner {
    font-size: 9.5px;
    fill: var(--mute);
  }
  .trail {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 1.4;
    stroke-dasharray: 3 3;
  }
  .pt {
    cursor: pointer;
    outline: none;
  }
  .pt circle {
    fill: var(--flash);
    stroke: var(--bg);
    stroke-width: 1.5;
    transition: r 120ms;
  }
  .pt text {
    font-size: 10.5px;
    fill: var(--fg);
    paint-order: stroke;
    stroke: var(--panel);
    stroke-width: 3px;
  }
  .pt.dim {
    opacity: 0.25;
  }
  .pt.on circle,
  .pt:focus-visible circle,
  .pt:hover circle {
    r: 7;
  }
  .pt:focus-visible text {
    text-decoration: underline;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
    color: var(--ink-2);
    min-height: 2.6em;
  }
</style>

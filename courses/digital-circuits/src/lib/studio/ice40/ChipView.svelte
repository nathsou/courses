<!--
  An iCE40 die as synth placed and routed a design: the tiles (the I/O ring, logic tiles, block RAM columns),
  the logic cells and pads in use, and the routed nets drawn along the wires they use, with the critical path
  picked out. Click a cell to select it (and its nets); `positions` overrides where the logic cells are drawn,
  for replaying the annealer.

    <ChipView chip={r.chip} timing={r.timing} bind:selected />
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Chip, ClockTiming } from '$lib/synth/api';
  import { cellRect, centre, netGeometry, pathCells, tileKind, tileRect, type Rect } from './chipdraw';

  let {
    chip,
    timing,
    selected = $bindable<number | undefined>(undefined),
    positions,
    routes = true,
    zoomTo = 'used',
    label = 'The iCE40 die',
  }: {
    chip: Chip;
    timing?: ClockTiming[];
    /** The selected cell, by index into `chip.cells`. */
    selected?: number;
    /** Positions of the logic cells by cell index (a placement snapshot); other cells keep their own. */
    positions?: [number, number][];
    routes?: boolean;
    /** Frame the whole die, or the tiles the design uses (and a margin). */
    zoomTo?: 'die' | 'used';
    label?: string;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let wrap: HTMLDivElement | undefined = $state();
  let width = $state(600);
  let hover = $state<number | undefined>();

  const critical = $derived(timing?.[0] ? pathCells(chip, timing[0].path) : new Set<number>());

  /** Where cell i is drawn (a replay may move logic cells). */
  function rectOf(i: number): Rect {
    const c = chip.cells[i]!;
    const p = positions?.[i];
    if (c.bel === 'lc' && p && p[0] >= 0) return cellRect(chip, { ...c, x: p[0], y: p[1] });
    return cellRect(chip, c);
  }

  /** The window of tiles to draw. */
  const view = $derived.by(() => {
    if (zoomTo === 'die' || chip.cells.length === 0) return { x0: 0, y0: 0, x1: chip.gw, y1: chip.gh };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    chip.cells.forEach((c, i) => {
      if (c.bel === 'gb') return;
      const r = rectOf(i);
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.x + r.w);
      y1 = Math.max(y1, r.y + r.h);
    });
    const m = 1.5;
    return { x0: Math.max(0, Math.floor(x0 - m)), y0: Math.max(0, Math.floor(y0 - m)), x1: Math.min(chip.gw, Math.ceil(x1 + m)), y1: Math.min(chip.gh, Math.ceil(y1 + m)) };
  });
  const scale = $derived(Math.max(4, Math.min(48, width / Math.max(1, view.x1 - view.x0), 520 / Math.max(1, view.y1 - view.y0))));
  const height = $derived(Math.round((view.y1 - view.y0) * scale));

  /**
   * A design token as a colour the canvas understands: the tokens may be `light-dark()` or `color-mix()`
   * expressions, so they are resolved by the browser on a probe element, which reports `rgb(…)`.
   */
  function css(name: string, fallback: string): string {
    if (!canvas || typeof getComputedStyle !== 'function') return fallback;
    const probe = document.createElement('span');
    probe.style.color = `var(${name}, ${fallback})`;
    probe.style.display = 'none';
    canvas.parentElement?.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c || fallback;
  }

  function draw() {
    if (!canvas) return;
    const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr * scale, 0, 0, dpr * scale, -view.x0 * scale * dpr, -view.y0 * scale * dpr);
    const colours = {
      bg: css('--pn', '#eee8dc'),
      line: css('--line', '#ccc'),
      io: css('--surface-2', '#e2dccd'),
      logic: css('--panel', '#f7f3ea'),
      ram: css('--copper-soft', '#e9cfb8'),
      lc: css('--accent', '#a0522d'),
      ff: css('--sig-high', '#d97706'),
      pad: css('--sig-current', '#2563eb'),
      wire: css('--mute', '#888'),
      crit: css('--bad', '#c0392b'),
      sel: css('--focus', '#2563eb'),
      ink: css('--fg', '#222'),
    };
    g.fillStyle = colours.bg;
    g.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
    // Tiles.
    for (let y = 0; y < chip.gh; y++) {
      for (let x = 0; x < chip.gw; x++) {
        const k = tileKind(chip, x, y);
        if (k === 'corner') continue;
        const r = tileRect(chip, x, y);
        if (r.x + 1 < view.x0 || r.x > view.x1 || r.y + 1 < view.y0 || r.y > view.y1) continue;
        g.fillStyle = k === 'io' ? colours.io : k === 'logic' ? colours.logic : colours.ram;
        g.fillRect(r.x + 0.04, r.y + 0.04, 0.92, 0.92);
        g.strokeStyle = colours.line;
        g.lineWidth = 0.02;
        g.strokeRect(r.x + 0.04, r.y + 0.04, 0.92, 0.92);
      }
    }
    // Routes.
    if (routes) {
      const sel = selected;
      chip.nets.forEach((n) => {
        if (n.pips.length === 0) return;
        const touches = sel !== undefined && (n.driver === sel || n.sinks.includes(sel));
        const crit = (n.crit ?? 0) > 0.95;
        const { segments, pips } = netGeometry(chip, n);
        g.strokeStyle = touches ? colours.sel : crit ? colours.crit : colours.wire;
        g.globalAlpha = touches || crit ? 0.95 : sel !== undefined ? 0.25 : 0.6;
        g.lineWidth = touches || crit ? 0.07 : 0.04;
        g.beginPath();
        for (const s of segments) {
          g.moveTo(s.x1, s.y1);
          g.lineTo(s.x2, s.y2);
        }
        g.stroke();
        g.fillStyle = g.strokeStyle;
        for (const p of pips) {
          g.beginPath();
          g.arc(p.x, p.y, touches ? 0.06 : 0.04, 0, Math.PI * 2);
          g.fill();
        }
      });
      g.globalAlpha = 1;
    }
    // Cells.
    chip.cells.forEach((c, i) => {
      if (c.bel === 'gb') return;
      const r = rectOf(i);
      const info = new Map(c.info);
      g.fillStyle = c.bel === 'io' ? colours.pad : info.get('flip-flop') && !info.get('LUT') ? colours.ff : colours.lc;
      g.globalAlpha = selected !== undefined && selected !== i ? 0.55 : 1;
      g.fillRect(r.x, r.y, r.w, r.h);
      if (info.get('flip-flop') && c.bel === 'lc') {
        g.fillStyle = colours.ff;
        g.fillRect(r.x + r.w * 0.72, r.y, r.w * 0.28, r.h);
      }
      g.globalAlpha = 1;
      if (critical.has(i)) {
        g.strokeStyle = colours.crit;
        g.lineWidth = 0.05;
        g.strokeRect(r.x - 0.02, r.y - 0.02, r.w + 0.04, r.h + 0.04);
      }
      if (selected === i || hover === i) {
        g.strokeStyle = colours.sel;
        g.lineWidth = 0.06;
        g.strokeRect(r.x - 0.04, r.y - 0.04, r.w + 0.08, r.h + 0.08);
      }
    });
    // Pin names on the pads, when there is room: drawn in pixels, so the text keeps its size.
    if (scale > 26) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = colours.ink;
      g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.textAlign = 'center';
      for (const c of chip.cells) {
        if (c.bel !== 'io' || !c.pin) continue;
        const r = cellRect(chip, c);
        const p = centre(r);
        g.fillText(c.pin, (p.x - view.x0) * scale, (r.y + r.h - view.y0) * scale + 11);
      }
    }
  }

  $effect(() => {
    void [chip, positions, selected, hover, width, height, routes, critical];
    draw();
  });

  function pick(ev: MouseEvent): number | undefined {
    if (!canvas) return undefined;
    const b = canvas.getBoundingClientRect();
    const x = view.x0 + (ev.clientX - b.left) / scale;
    const y = view.y0 + (ev.clientY - b.top) / scale;
    for (let i = chip.cells.length - 1; i >= 0; i--) {
      if (chip.cells[i]!.bel === 'gb') continue;
      const r = rectOf(i);
      if (x >= r.x - 0.05 && x <= r.x + r.w + 0.05 && y >= r.y - 0.05 && y <= r.y + r.h + 0.05) return i;
    }
    return undefined;
  }

  onMount(() => {
    if (!wrap) return;
    const ro = new ResizeObserver(([e]) => (width = Math.max(240, Math.floor(e?.contentRect.width ?? 600))));
    ro.observe(wrap);
    return () => ro.disconnect();
  });
</script>

<div class="chipview" bind:this={wrap}>
  <canvas
    bind:this={canvas}
    style:width="{width}px"
    style:height="{height}px"
    role="img"
    aria-label="{label}: {chip.usage.lc} of {chip.usage.lc_total} logic cells and {chip.usage.io} of {chip.usage.io_total} pads used, {chip.nets.length} routed nets"
    onmousemove={(e) => (hover = pick(e))}
    onmouseleave={() => (hover = undefined)}
    onclick={(e) => (selected = pick(e))}
  ></canvas>
</div>

<style>
  .chipview {
    width: 100%;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--pn);
  }
  canvas {
    display: block;
    cursor: crosshair;
  }
</style>

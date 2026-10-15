<!--
  Domain colouring of a complex function: the colour of the point s shows f(s). Hue is the argument of f(s)
  (red = positive real, then yellow, green, cyan = negative real, blue, magenta); brightness shows the modulus, dark
  near 0 and pale near ∞, with faint bands where |f| doubles. A zero is a point where every hue meets around a dark
  spot; a pole is the same around a pale spot, with the hues in the opposite order.
  Props: fns (comma-separated: zeta, xi, gamma, eta-factor), view (initial view id).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import { c, sub, scale, powReal, format, type Complex } from '$lib/primes/complex';
  import { zeta, xi } from '$lib/primes/zeta';
  import { gamma } from '$lib/primes/gamma';
  import { theme } from '$lib/state/theme.svelte';
  import { cssVar, setupCanvas } from '$lib/charts/colors';

  let { fns = 'zeta', view: initialView = 'strip' }: { fns?: string; view?: string } = $props();

  interface Fn {
    id: string;
    label: string;
    tex: string;
    f: (s: Complex) => Complex;
    /** Optional positive factor applied before colouring (it changes brightness, never hue or zeros). */
    norm?: (s: Complex) => number;
  }
  const ALL: Fn[] = [
    { id: 'zeta', label: 'ζ(s)', tex: 'ζ(s)', f: (s) => zeta(s) },
    { id: 'xi', label: 'ξ(s)', tex: 'ξ(s)', f: (s) => (s.re >= 0.5 ? xi(s) : xi(sub(c(1), s))), norm: (s) => Math.exp((Math.PI * Math.abs(s.im)) / 4) / (1 + Math.abs(s.im)) ** 1.75 },
    { id: 'gamma', label: 'Γ(s)', tex: 'Γ(s)', f: (s) => gamma(s) },
    { id: 'eta-factor', label: '1 − 2¹⁻ˢ', tex: '1 − 2¹⁻ˢ', f: (s) => sub(c(1), scale(powReal(2, s), 2)) },
  ];
  // svelte-ignore state_referenced_locally
  const available = fns.split(',').map((x) => ALL.find((f) => f.id === x.trim())).filter((f): f is Fn => f !== undefined);
  // svelte-ignore state_referenced_locally
  let fnId = $state(available[0]?.id ?? 'zeta');
  const fn = $derived(ALL.find((f) => f.id === fnId)!);

  interface View {
    id: string;
    label: string;
    x: [number, number];
    y: [number, number];
  }
  const VIEWS: View[] = [
    { id: 'pole', label: 'around s = 1', x: [-4, 5], y: [-3.4, 3.4] },
    { id: 'trivial', label: 'left half-plane', x: [-15, 3], y: [-6.8, 6.8] },
    { id: 'strip', label: 'zeros up to 45', x: [-2.5, 3.5], y: [-1, 45] },
    { id: 'high', label: 'up to 100', x: [-2.5, 3.5], y: [0, 100] },
  ];
  // svelte-ignore state_referenced_locally
  let viewId = $state(VIEWS.some((v) => v.id === initialView) ? initialView : 'strip');
  const v = $derived(VIEWS.find((x) => x.id === viewId)!);
  let showLine = $state(true);
  let canvas: HTMLCanvasElement;
  let width = $state(560);
  let hover = $state<{ s: Complex; f: Complex } | null>(null);
  let progress = $state(1);

  const Wpx = $derived(Math.min(width, 640));
  const Hpx = $derived(Math.round(Wpx * (viewId === 'strip' || viewId === 'high' ? 1.1 : 0.75)));
  // Scale factors: σ per pixel and t per pixel (equal unless the view is tall).
  const sx = $derived((v.x[1] - v.x[0]) / Wpx);
  const sy = $derived((v.y[1] - v.y[0]) / Hpx);
  const toS = (px: number, py: number) => c(v.x[0] + px * sx, v.y[1] - py * sy);

  /** HSL (h in turns) to RGB bytes. */
  function hsl(h: number, s: number, l: number): [number, number, number] {
    const k = (n: number) => (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
  }
  function colour(w: Complex): [number, number, number] {
    const m = Math.hypot(w.re, w.im);
    if (!Number.isFinite(m)) return [250, 250, 250];
    const h = (Math.atan2(w.im, w.re) / (2 * Math.PI) + 1) % 1;
    const base = (2 / Math.PI) * Math.atan(Math.pow(m, 0.3));
    const band = Math.log2(m + 1e-300);
    const ripple = 0.06 * (band - Math.floor(band));
    return hsl(h, 0.85, Math.min(0.95, Math.max(0.04, 0.08 + 0.82 * base - ripple)));
  }

  let job = 0;
  function render() {
    if (!canvas || Wpx < 20) return;
    const id = ++job;
    const W = Wpx;
    const H = Hpx;
    const ctx = setupCanvas(canvas, W, H);
    const cell = 2;
    const cols = Math.ceil(W / cell);
    const rows = Math.ceil(H / cell);
    const img = ctx.createImageData(cols, rows);
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const octx = off.getContext('2d')!;
    let row = 0;
    progress = 0;
    const f = fn.f;
    const norm = fn.norm;
    const step = () => {
      if (id !== job) return;
      const t0 = performance.now();
      while (row < rows && performance.now() - t0 < 24) {
        for (let col = 0; col < cols; col++) {
          const s = toS((col + 0.5) * cell, (row + 0.5) * cell);
          let w: Complex;
          try {
            w = f(s);
          } catch {
            w = c(NaN, NaN);
          }
          if (norm) w = scale(w, norm(s));
          const [r, g, b] = Number.isNaN(w.re) ? [128, 128, 128] : colour(w);
          const i = 4 * (row * cols + col);
          img.data[i] = r;
          img.data[i + 1] = g;
          img.data[i + 2] = b;
          img.data[i + 3] = 255;
        }
        row++;
      }
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(off, 0, 0, cols * cell, rows * cell);
      overlay(ctx, W, H);
      progress = row / rows;
      if (row < rows) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function overlay(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const X = (sigma: number) => (sigma - v.x[0]) / sx;
    const Y = (t: number) => (v.y[1] - t) / sy;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (v.y[0] <= 0 && v.y[1] >= 0) {
      ctx.moveTo(0, Y(0));
      ctx.lineTo(W, Y(0));
    }
    ctx.moveTo(X(0), 0);
    ctx.lineTo(X(0), H);
    ctx.stroke();
    if (showLine) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(X(0.5), 0);
      ctx.lineTo(X(0.5), H);
      ctx.moveTo(X(1), 0);
      ctx.lineTo(X(1), H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.font = `11px ${cssVar('--font-mono') || 'monospace'}`;
    const tickT = v.y[1] - v.y[0] > 40 ? 10 : v.y[1] - v.y[0] > 10 ? 2 : 1;
    for (let t = Math.ceil(v.y[0] / tickT) * tickT; t <= v.y[1]; t += tickT) {
      if (t === 0) continue;
      ctx.strokeText(`${t}i`, X(0) + 4, Y(t) + 4);
      ctx.fillText(`${t}i`, X(0) + 4, Y(t) + 4);
    }
    const tickS = v.x[1] - v.x[0] > 12 ? 2 : v.x[1] - v.x[0] > 4 ? 1 : 0.5;
    const yAxis = v.y[0] <= 0 && v.y[1] >= 0 ? Y(0) : H - 4;
    for (let s = Math.ceil(v.x[0] / tickS) * tickS; s <= v.x[1]; s += tickS) {
      if (s === 0) continue;
      ctx.strokeText(String(s), X(s) - 3, yAxis - 5);
      ctx.fillText(String(s), X(s) - 3, yAxis - 5);
    }
  }

  $effect(() => {
    void [fnId, viewId, showLine, Wpx, Hpx, theme.resolved];
    render();
  });

  function onmove(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const s = toS(((e.clientX - r.left) / r.width) * Wpx, ((e.clientY - r.top) / r.height) * Hpx);
    let w: Complex;
    try {
      w = fn.f(s);
    } catch {
      w = c(NaN, NaN);
    }
    hover = { s, f: w };
  }
</script>

<Widget title="The complex plane, coloured by {fn.label}" subtitle="Each point s is coloured by the value {fn.tex}: the hue is its direction (red = positive real, cyan = negative real), the brightness its size (dark = near 0, pale = large). Zeros are where all the colours meet around a dark spot." onreset={() => ((viewId = initialView), (showLine = true))}>
  {#snippet controls()}
    {#if available.length > 1}
      <Segmented label="Function" bind:value={fnId} options={available.map((f) => ({ value: f.id, label: f.label }))} size="sm" />
    {/if}
    <Segmented label="View" bind:value={viewId} options={VIEWS.map((x) => ({ value: x.id, label: x.label }))} size="sm" />
    <Toggle bind:checked={showLine} label="lines Re s = ½ and 1" />
  {/snippet}
  <div class="wrap" bind:clientWidth={width}>
    <canvas bind:this={canvas} onpointermove={onmove} onpointerleave={() => (hover = null)} aria-label="Domain colouring of {fn.label} for Re s from {v.x[0]} to {v.x[1]} and Im s from {v.y[0]} to {v.y[1]}."></canvas>
    {#if progress < 1}<div class="bar" style:width="{progress * 100}%"></div>{/if}
  </div>
  <div class="legend ui">
    <span class="wheel" aria-hidden="true"></span>
    <span>arg {fn.tex}: red 0, yellow π/3, green 2π/3, cyan π, blue −2π/3, magenta −π/3.</span>
    {#if sy / sx > 1.5}<span class="note">Vertical scale compressed {(sy / sx).toFixed(1)}×.</span>{/if}
    {#if fn.norm}<span class="note">|ξ| shrinks like e^(−π|t|/4), so brightness is rescaled by a positive factor; hues and zeros are unchanged.</span>{/if}
  </div>
  <p class="out" aria-live="polite">
    {#if hover}
      s = {format(hover.s, 3)}: {fn.tex} = {Number.isFinite(hover.f.re) ? format(hover.f, 4) : '∞'}, |{fn.tex}| = {Math.hypot(hover.f.re, hover.f.im).toPrecision(4)}.
    {:else}
      Point at the picture to read off values.
    {/if}
  </p>
</Widget>

<style>
  .wrap {
    width: 100%;
    position: relative;
  }
  canvas {
    display: block;
    margin: 0 auto;
    border: 1px solid var(--line-strong);
    touch-action: none;
    cursor: crosshair;
  }
  .bar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    background: var(--prime);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .wheel {
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 50%;
    background: conic-gradient(from 90deg, hsl(0 85% 50%), hsl(300 85% 50%), hsl(240 85% 50%), hsl(180 85% 50%), hsl(120 85% 50%), hsl(60 85% 50%), hsl(0 85% 50%));
    flex: none;
  }
  .note {
    color: var(--mute);
  }
  .out {
    margin: 0.5rem 0 0;
    font-size: 0.86rem;
  }
</style>

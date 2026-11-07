<!--
  A 3D view of a machine model. It renders only on demand (a state change, a camera move, or while the
  widget's `animate` callback reports motion), holds a WebGL context only while it is near the viewport
  (see pool.ts), caps the pixel ratio at 2 and lowers it if frames run long.

  Input: drag (mouse: orbit; touch: turn about the vertical axis, so vertical swipes still scroll the
  page), Ctrl/⌘ + wheel or the ± buttons to zoom, arrow keys when focused, tap a part to name it.
-->
<script lang="ts" generics="S">
  import { onMount, untrack } from 'svelte';
  import type { ModelDef } from './model';
  import { Renderer, cssColor, type Palette } from './renderer';
  import { acquire, release, touch, type PoolClient } from './pool';
  import { pick, rayFromNdc } from './pick';
  import { prebuild } from './cache';
  import { look } from '$lib/state/look.svelte';
  import { theme } from '$lib/state/theme.svelte';
  import { clamp } from './math';

  let {
    model,
    data,
    animate,
    highlight = {},
    height = '22rem',
    label,
    onpick,
    readout,
  }: {
    model: ModelDef<S>;
    /** The machine's state, passed to the model's pose function. */
    data: S;
    /** Advance the machine by dt ms; return true while anything is still moving. */
    animate?: (dt: number) => boolean;
    /** Node name → [r, g, b, strength] tint. */
    highlight?: Record<string, [number, number, number, number]>;
    height?: string;
    /** Accessible description of the view. */
    label: string;
    onpick?: (name: string | null) => void;
    /** Text summary of the machine's state, kept beside the view (and the fallback without WebGL). */
    readout?: import('svelte').Snippet;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let host: HTMLDivElement | undefined = $state();
  let failed = $state(false);
  let picked: { label: string; info?: string } | null = $state(null);

  let renderer: Renderer | null = null;
  const viewId = `${untrack(() => model.key)}-${Math.random().toString(36).slice(2, 7)}`;
  // Per-view buffers, sized once.
  const nodes = untrack(() => model.nodes.length);
  const matrices = new Float32Array(nodes * 16);
  const tints = new Float32Array(nodes * 4);
  const cam0 = untrack(() => model.camera);
  let yaw = cam0.yaw, pitch = cam0.pitch, dist = cam0.distance;
  const target = [...cam0.target];
  const eye = new Float32Array(3);
  let pal: Palette = { bg: [0.94, 0.91, 0.85], paper: [0.96, 0.93, 0.87], line: [0.1, 0.12, 0.18] };
  let scale = 1;
  let raf = 0;
  let last = 0;
  let slow = 0;
  let visible = false;
  let gen = $state(0);
  const PICKED: [number, number, number, number] = [0.9, 0.6, 0.1, 0.5];

  function readPalette() {
    if (!host) return;
    const cs = getComputedStyle(host);
    const bg = cssColor(cs.getPropertyValue('--scene-bg'), pal.bg);
    const line = cssColor(cs.getPropertyValue('--scene-line'), pal.line);
    const paper: [number, number, number] = theme.resolved === 'dark' ? [bg[0] * 1.25 + 0.02, bg[1] * 1.2 + 0.03, bg[2] * 1.15 + 0.04] : [Math.min(1, bg[0] + 0.03), Math.min(1, bg[1] + 0.03), Math.min(1, bg[2] + 0.03)];
    pal = { bg, paper, line };
  }

  const client: PoolClient = { evict: () => drop() };

  function create() {
    if (renderer || !canvas) return;
    acquire(client);
    try {
      renderer = new Renderer(canvas);
      renderer.setModel(model);
      failed = false;
    } catch {
      release(client);
      renderer = null;
      failed = true;
      return;
    }
    resize();
    wake();
  }

  function drop() {
    if (!renderer) return;
    cancelAnimationFrame(raf);
    raf = 0;
    renderer.dispose();
    renderer = null;
    release(client);
    // A lost context cannot be reused: the {#key} block below gives the next one a fresh canvas.
    gen++;
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2) * scale;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  /** Ask for a frame (after a state change). Exported for widgets. */
  export function wake() {
    if (!raf && renderer && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    raf = 0;
    if (!renderer) return;
    const dt = last ? Math.min(now - last, 50) : 16;
    const moving = animate?.(dt) ?? false;
    draw();
    if (moving) {
      // Adaptive resolution: if frames keep running long while animating, render fewer pixels.
      if (last && now - last > 24) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow > 20 && scale > 0.5) {
        scale -= 0.25;
        slow = 0;
        resize();
      }
      last = now;
      raf = requestAnimationFrame(frame);
    } else last = 0;
  }

  function draw() {
    if (!renderer) return;
    model.pose(matrices, data);
    tints.fill(0);
    const ns = model.nodes;
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i]!;
      const t = highlight[n.name] ?? (picked && n.label === picked.label ? PICKED : undefined);
      if (t) tints.set(t, i * 4);
    }
    // On narrow screens, step back so that a wide machine still fits.
    const aspect = canvas ? canvas.clientWidth / Math.max(1, canvas.clientHeight) : 1.6;
    const d = dist * Math.max(1, (model.camera.aspect ?? 1.6) / aspect);
    const cp = Math.cos(pitch);
    eye[0] = target[0]! + d * cp * Math.sin(yaw);
    eye[1] = target[1]! + d * Math.sin(pitch);
    eye[2] = target[2]! + d * cp * Math.cos(yaw);
    renderer.render(matrices, tints, eye, target, model.camera.fov ?? 0.6, look.look, pal, viewId, scale);
    touch(client);
  }

  // Redraw when inputs that the widget does not announce change.
  $effect(() => {
    void look.look;
    void theme.resolved;
    void highlight;
    readPalette();
    wake();
  });

  // ── Input ──
  let down: { x: number; y: number; yaw: number; pitch: number; id: number; touch: boolean; moved: boolean } | null = null;

  /** Svelte action: wire up a (possibly re-created) canvas. */
  function setup(c: HTMLCanvasElement) {
    canvas = c;
    attach(c);
    if (visible) queueMicrotask(create);
  }

  function attach(c: HTMLCanvasElement) {
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', () => (down = null));
    c.addEventListener('wheel', onWheel, { passive: false });
    c.addEventListener('keydown', onKey);
    c.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      renderer = null;
      release(client);
    });
    c.addEventListener('webglcontextrestored', () => visible && create());
  }

  function onDown(e: PointerEvent) {
    down = { x: e.clientX, y: e.clientY, yaw, pitch, id: e.pointerId, touch: e.pointerType === 'touch', moved: false };
    if (!down.touch) canvas?.setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent) {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 4) down.moved = true;
    yaw = down.yaw - dx * 0.008;
    if (!down.touch) pitch = clamp(down.pitch + dy * 0.008, -1.45, 1.45);
    wake();
  }
  function onUp(e: PointerEvent) {
    if (!down) return;
    const wasTap = !down.moved;
    down = null;
    if (wasTap && renderer && canvas) {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      const ray = rayFromNdc(renderer.lastViewProj, x, y);
      if (!ray) return;
      const i = pick(model, matrices, ray.o, ray.d);
      const n = i >= 0 ? model.nodes[i] : undefined;
      picked = n?.label ? { label: n.label, info: n.info } : null;
      onpick?.(n?.name ?? null);
      wake();
    }
  }
  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return; // plain wheel scrolls the page
    e.preventDefault();
    zoom(e.deltaY > 0 ? 1.08 : 1 / 1.08);
  }
  function onKey(e: KeyboardEvent) {
    const k = e.key;
    if (k === 'ArrowLeft') yaw += 0.12;
    else if (k === 'ArrowRight') yaw -= 0.12;
    else if (k === 'ArrowUp') pitch = clamp(pitch + 0.1, -1.45, 1.45);
    else if (k === 'ArrowDown') pitch = clamp(pitch - 0.1, -1.45, 1.45);
    else if (k === '+' || k === '=') return zoom(1 / 1.15);
    else if (k === '-') return zoom(1.15);
    else return;
    e.preventDefault();
    wake();
  }
  function zoom(f: number) {
    dist = clamp(dist * f, model.camera.distance * 0.3, model.camera.distance * 3);
    wake();
  }
  function resetView() {
    yaw = model.camera.yaw;
    pitch = model.camera.pitch;
    dist = model.camera.distance;
    picked = null;
    onpick?.(null);
    wake();
  }

  onMount(() => {
    look.load();
    readPalette();
    if (!host) return;
    if (typeof WebGL2RenderingContext === 'undefined') {
      failed = true;
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = !!entry?.isIntersecting;
        if (visible) create();
        else drop();
      },
      { rootMargin: '250px 0px' },
    );
    io.observe(host);
    // Well before the view is visible, build its meshes in idle time.
    const early = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        early.disconnect();
        prebuild(model.key, model.meshes);
      },
      { rootMargin: '1500px 0px' },
    );
    early.observe(host);
    const ro = new ResizeObserver(() => {
      resize();
      wake();
    });
    ro.observe(host);
    const onVis = () => !document.hidden && wake();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      early.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      drop();
    };
  });
</script>

<div class="machine" bind:this={host}>
  <div class="stage" style:height>
    {#key gen}
      <canvas use:setup tabindex="0" aria-label="{label} (3D view: drag to turn, arrow keys to orbit, + and − to zoom, tap a part to name it)"></canvas>
    {/key}
    {#if failed}
      <p class="fallback ui">This browser cannot show the 3D model (WebGL2 is unavailable). The readout follows the machine all the same.</p>
    {/if}
    <div class="tools ui">
      <div class="seg" role="group" aria-label="How to draw the machine">
        <button class:on={look.look === 'brass'} aria-pressed={look.look === 'brass'} onclick={() => look.set('brass')}>Brass</button>
        <button class:on={look.look === 'drawing'} aria-pressed={look.look === 'drawing'} onclick={() => look.set('drawing')}>Drawing</button>
      </div>
      <button class="icon" onclick={() => zoom(1 / 1.2)} aria-label="Zoom in">+</button>
      <button class="icon" onclick={() => zoom(1.2)} aria-label="Zoom out">−</button>
      <button class="icon" onclick={resetView} aria-label="Reset the view">⟲</button>
    </div>
    {#if picked}
      <div class="picked ui" role="status">
        <strong>{picked.label}</strong>{#if picked.info}<span>{picked.info}</span>{/if}
      </div>
    {/if}
  </div>
  {#if readout}<div class="readout ui" aria-live="polite">{@render readout()}</div>{/if}
</div>

<style>
  .machine {
    margin: 0 -1.15rem;
  }
  .stage {
    position: relative;
    background: var(--scene-bg);
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: pan-y;
    cursor: grab;
    outline-offset: -3px;
  }
  canvas:active {
    cursor: grabbing;
  }
  .fallback {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    padding: 1rem;
    text-align: center;
    color: var(--ink-2);
    font-size: 0.88rem;
  }
  .tools {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }
  .tools button {
    font-size: 0.76rem;
    border: 1px solid var(--line-strong);
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    color: var(--ink);
    padding: 0.2rem 0.5rem;
    cursor: pointer;
    min-height: 1.9rem;
  }
  .seg {
    display: inline-flex;
  }
  .seg button:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }
  .seg button:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    border-left: 0;
  }
  .seg button.on {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
  .icon {
    border-radius: var(--radius-sm);
    min-width: 1.9rem;
    font-size: 0.95rem !important;
  }
  .picked {
    position: absolute;
    left: 0.5rem;
    bottom: 0.5rem;
    max-width: min(24rem, calc(100% - 1rem));
    background: color-mix(in srgb, var(--surface) 94%, transparent);
    border: 1px solid var(--line-strong);
    border-left: 3px solid var(--brass);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.6rem;
    font-size: 0.8rem;
    line-height: 1.4;
    display: flex;
    flex-direction: column;
  }
  .picked span {
    color: var(--ink-2);
  }
  .readout {
    padding: 0.6rem 1.15rem 0;
    font-size: 0.88rem;
  }
  @media (max-width: 560px) {
    .tools {
      top: auto;
      bottom: 0.5rem;
    }
    .picked {
      bottom: 2.9rem;
    }
  }
</style>

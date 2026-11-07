<!--
  A polar planimeter tracing a shape. The pole stays put; the tracer follows the outline; the measuring wheel
  on the tracer arm rolls only sideways to the arm. When the tracer is back where it started, arm length ×
  roll is the area.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { onDestroy } from 'svelte';
  import { densify, planimeter, polygonArea, type Point } from '$lib/mech/integrators';

  const SHAPES: Record<string, { label: string; poly: Point[] }> = {
    square: { label: 'a square, 1 × 1', poly: [{ x: 0, y: -0.5 }, { x: 1, y: -0.5 }, { x: 1, y: 0.5 }, { x: 0, y: 0.5 }] },
    field: { label: 'an irregular field', poly: [{ x: -0.3, y: -0.6 }, { x: 0.9, y: -0.75 }, { x: 1.35, y: 0.1 }, { x: 0.7, y: 0.25 }, { x: 0.95, y: 0.8 }, { x: -0.2, y: 0.6 }, { x: 0.15, y: 0.05 }] },
    circle: { label: 'a circle, radius 0.6', poly: Array.from({ length: 72 }, (_, k) => ({ x: 0.5 + 0.6 * Math.cos((k / 72) * 2 * Math.PI), y: 0.6 * Math.sin((k / 72) * 2 * Math.PI) })) },
  };
  const pole = { x: -2.6, y: -0.2 }, R = 2.4, L = 2.2, Wd = 0.6;
  let which = $state('field');
  let t = $state(0);
  let raf = 0;
  const data = $derived.by(() => {
    const path = densify(SHAPES[which]!.poly, 0.01);
    return { path, ...planimeter(pole, path, R, L, Wd), area: polygonArea(SHAPES[which]!.poly) };
  });
  const i = $derived(Math.min(data.path.length - 1, Math.floor(t * (data.path.length - 1))));
  const p = $derived(data.path[i]!);
  const e = $derived(data.elbows[i]!);
  const roll = $derived(data.roll[i]!);
  function trace() {
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const step = (now: number) => {
      t = Math.min(1, (now - t0) / 6000);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  onDestroy(() => typeof cancelAnimationFrame !== 'undefined' && cancelAnimationFrame(raf));
  // View box in shape units.
  const S = 120, ox = 330, oy = 130;
  const X = (x: number) => ox + x * S, Y = (y: number) => oy - y * S;
  const wheel = $derived({ x: e.x + ((p.x - e.x) / L) * Wd, y: e.y + ((p.y - e.y) / L) * Wd });
  const ang = $derived((Math.atan2(-(p.y - e.y), p.x - e.x) * 180) / Math.PI);
</script>

<Widget title="A polar planimeter" subtitle="Run the tracer once round the outline. The wheel rolls only across its arm; at the end, arm length × total roll equals the area enclosed, whatever the shape." onreset={() => { cancelAnimationFrame(raf); t = 0; }}>
  {#snippet controls()}
    <label>Shape <select bind:value={which} onchange={() => (t = 0)}>{#each Object.entries(SHAPES) as [k, v] (k)}<option value={k}>{v.label}</option>{/each}</select></label>
    <button class="go" onclick={trace}>Trace it</button>
    <label>or step <input type="range" min="0" max="1" step="0.001" bind:value={t} aria-label="Position of the tracer round the outline" /></label>
  {/snippet}
  <svg viewBox="0 0 520 260" class="pl" role="img" aria-label="Pole, pole arm, tracer arm and measuring wheel, with the outline being traced">
    <polygon points={SHAPES[which]!.poly.map((q) => `${X(q.x)},${Y(q.y)}`).join(' ')} class="shape" />
    <polyline points={data.path.slice(0, i + 1).map((q) => `${X(q.x)},${Y(q.y)}`).join(' ')} class="done" />
    <line x1={X(pole.x)} y1={Y(pole.y)} x2={X(e.x)} y2={Y(e.y)} class="arm" />
    <line x1={X(e.x)} y1={Y(e.y)} x2={X(p.x)} y2={Y(p.y)} class="arm" />
    <circle cx={X(pole.x)} cy={Y(pole.y)} r="6" class="pole" />
    <circle cx={X(e.x)} cy={Y(e.y)} r="4" class="hinge" />
    <g transform="translate({X(wheel.x)} {Y(wheel.y)}) rotate({ang})">
      <rect x="-3" y="-12" width="6" height="24" rx="2" class="wheel" />
    </g>
    <circle cx={X(p.x)} cy={Y(p.y)} r="4" class="tracer" />
    <text x={X(pole.x)} y={Y(pole.y) + 18} text-anchor="middle" class="lab">pole</text>
  </svg>
  <p class="ro ui">Wheel roll: <strong class="num">{roll.toFixed(4)}</strong> · arm length × roll: <strong class="num">{(L * roll).toFixed(4)}</strong> · true area: <strong class="num">{data.area.toFixed(4)}</strong>{#if t >= 1} · <span class="ok">back at the start: they agree</span>{/if}</p>
</Widget>

<style>
  label {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.86rem;
  }
  select,
  button {
    font: inherit;
    font-size: 0.86rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.28rem 0.65rem;
    min-height: 2rem;
    color: var(--ink);
    cursor: pointer;
  }
  .go {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .pl {
    width: 100%;
    background: var(--scene-bg);
    border-radius: var(--radius-sm);
  }
  .shape {
    fill: var(--brass-soft);
    stroke: var(--line-strong);
    stroke-dasharray: 4 3;
  }
  .done {
    fill: none;
    stroke: var(--fx-red);
    stroke-width: 2;
  }
  .arm {
    stroke: var(--ink-2);
    stroke-width: 4;
    stroke-linecap: round;
  }
  .pole {
    fill: var(--ink);
  }
  .hinge {
    fill: var(--page);
    stroke: var(--ink);
  }
  .wheel {
    fill: var(--brass);
    stroke: var(--ink);
  }
  .tracer {
    fill: var(--fx-red);
  }
  .lab {
    font-size: 10px;
    fill: var(--ink-3);
  }
  .ro {
    font-size: 0.86rem;
    margin: 0.4rem 0 0;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
</style>

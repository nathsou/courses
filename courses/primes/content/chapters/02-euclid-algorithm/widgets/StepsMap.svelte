<!--
  How many division steps does Euclid's algorithm take on (a, b)? A heat map over 1 ≤ a, b ≤ N, with the
  consecutive Fibonacci pairs (the worst cases, by Lamé's theorem) marked.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import { theme } from '$lib/state/theme.svelte';
  import { cssVar, hexToRgb, mix, setupCanvas } from '$lib/charts/colors';

  const N = 144;
  let canvas: HTMLCanvasElement;
  let width = $state(400);
  let hover = $state<{ a: number; b: number; s: number } | null>(null);

  const steps = (a: number, b: number) => {
    let s = 0;
    while (b) {
      [a, b] = [b, a % b];
      s++;
    }
    return s;
  };
  // Steps of the algorithm run on (larger, smaller), so the map is symmetric.
  const table = Array.from({ length: N + 1 }, (_, a) => Array.from({ length: N + 1 }, (_, b) => (a && b ? steps(Math.max(a, b), Math.min(a, b)) : 0)));
  const maxSteps = Math.max(...table.flat());
  const FIB: [number, number][] = [];
  for (let [x, y] = [1, 2]; y <= N; [x, y] = [y, x + y]) FIB.push([y, x]);

  function draw() {
    if (!canvas) return;
    void theme.resolved;
    const size = Math.min(width, 520);
    const ctx = setupCanvas(canvas, size, size);
    const cell = size / N;
    const lo = hexToRgb(cssVar('--pn'));
    const hi = hexToRgb(cssVar('--fx-blue'));
    for (let a = 1; a <= N; a++)
      for (let b = 1; b <= N; b++) {
        const t = table[a]![b]! / maxSteps;
        const [r, g, bl] = mix(lo, hi, Math.pow(t, 0.8));
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${bl | 0})`;
        ctx.fillRect((b - 1) * cell, (N - a) * cell, cell + 0.5, cell + 0.5);
      }
    ctx.fillStyle = cssVar('--prime');
    for (const [p, q] of FIB) {
      for (const [a, b] of [
        [p, q],
        [q, p],
      ] as const) {
        ctx.beginPath();
        ctx.arc((b - 0.5) * cell, (N - a + 0.5) * cell, Math.max(2.5, cell * 1.2), 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
  onMount(draw);
  $effect(() => {
    void width;
    void theme.resolved;
    draw();
  });

  function move(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const b = Math.floor(((e.clientX - r.left) / r.width) * N) + 1;
    const a = N - Math.floor(((e.clientY - r.top) / r.height) * N);
    hover = a >= 1 && a <= N && b >= 1 && b <= N ? { a, b, s: table[a]![b]! } : null;
  }
</script>

<Widget title="How long does Euclid take?" subtitle="Each pixel is a pair (a, b) with 1 ≤ a, b ≤ 144, coloured more strongly when the algorithm needs more division steps. Dots mark pairs of consecutive Fibonacci numbers.">
  <div class="layout" bind:clientWidth={width}>
    <canvas bind:this={canvas} onpointermove={move} onpointerleave={() => (hover = null)} aria-label="Heat map of the number of steps of Euclid's algorithm for pairs up to 144. The darkest points lie on lines of slope near the golden ratio, and the slowest pairs are consecutive Fibonacci numbers."></canvas>
  </div>
  <p class="readout" aria-live="polite">
    {#if hover}
      gcd({hover.a}, {hover.b}): <strong>{hover.s}</strong> {hover.s === 1 ? 'step' : 'steps'}
    {:else}
      Point at the map. The slowest pair below 144 is (144, 89): {table[144]![89]} steps. Axes: b across, a up.
    {/if}
  </p>
</Widget>

<style>
  .layout {
    width: 100%;
  }
  canvas {
    display: block;
    margin: 0 auto;
    border: 1px solid var(--line-strong);
    cursor: crosshair;
    touch-action: none;
  }
  .readout {
    margin: 0.6rem 0 0;
    font-size: 0.85rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
</style>

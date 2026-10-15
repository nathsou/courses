<!--
  Euclid's orchard. A tree stands at every lattice point (a, b) with 1 ≤ a, b ≤ N; standing at the origin you see
  exactly the trees with gcd(a, b) = 1. The visible fraction tends to 1/ζ(2) = 6/π² ≈ 0.6079.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { gcd } from '$lib/primes/arith';
  import { theme } from '$lib/state/theme.svelte';
  import { cssVar, setupCanvas } from '$lib/charts/colors';

  let N = $state(40);
  let canvas: HTMLCanvasElement;
  let width = $state(480);
  let hover = $state<{ a: number; b: number } | null>(null);

  const count = $derived.by(() => {
    let c = 0;
    for (let a = 1; a <= N; a++) for (let b = 1; b <= N; b++) if (gcd(a, b) === 1) c++;
    return c;
  });
  const size = $derived(Math.min(width, 480));

  function draw() {
    if (!canvas) return;
    void theme.resolved;
    const ctx = setupCanvas(canvas, size, size);
    ctx.fillStyle = cssVar('--chart-surface');
    ctx.fillRect(0, 0, size, size);
    const cell = size / N;
    const seen = cssVar('--prime');
    const hidden = cssVar('--ruling');
    for (let a = 1; a <= N; a++) {
      for (let b = 1; b <= N; b++) {
        const vis = gcd(a, b) === 1;
        ctx.fillStyle = vis ? seen : hidden;
        const r = Math.max(0.6, cell * (vis ? 0.34 : 0.22));
        ctx.beginPath();
        ctx.arc((a - 0.5) * cell, size - (b - 0.5) * cell, r, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    if (hover) {
      const g = gcd(hover.a, hover.b);
      const pa = hover.a / g;
      const pb = hover.b / g;
      ctx.strokeStyle = cssVar('--fx-blue');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-cell / 2, size + cell / 2);
      ctx.lineTo((hover.a - 0.5) * cell, size - (hover.b - 0.5) * cell);
      ctx.stroke();
      ctx.fillStyle = cssVar('--fx-blue');
      ctx.beginPath();
      ctx.arc((pa - 0.5) * cell, size - (pb - 0.5) * cell, Math.max(2, cell * 0.4), 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  onMount(draw);
  $effect(() => {
    void [N, size, hover, theme.resolved];
    draw();
  });

  function onmove(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const a = Math.ceil(((e.clientX - rect.left) / rect.width) * N);
    const b = Math.ceil(((rect.bottom - e.clientY) / rect.height) * N);
    hover = a >= 1 && a <= N && b >= 1 && b <= N ? { a, b } : null;
  }
</script>

<Widget title="Euclid’s orchard" subtitle="A tree at every point (a, b) with 1 ≤ a, b ≤ N. From the corner (0, 0) you see only the trees with gcd(a, b) = 1 (red); the others hide behind them. Point at a tree to see what blocks it." onreset={() => ((N = 40), (hover = null))}>
  {#snippet controls()}
    <Slider label="N" bind:value={N} min={5} max={240} step={1} format={(v) => String(v)} />
  {/snippet}
  <div class="wrap" bind:clientWidth={width}>
    <canvas bind:this={canvas} onpointermove={onmove} onpointerleave={() => (hover = null)} aria-label="Lattice points up to {N}, with the coprime pairs highlighted."></canvas>
  </div>
  <p class="out" aria-live="polite">
    {count.toLocaleString('en-GB')} of {(N * N).toLocaleString('en-GB')} trees are visible: a fraction of <strong>{(count / (N * N)).toFixed(4)}</strong>. The limit is 6/π² = 0.6079.
    {#if hover}
      {@const g = gcd(hover.a, hover.b)}
      Tree ({hover.a}, {hover.b}): {g === 1 ? 'visible, since gcd = 1.' : `gcd = ${g}, so it hides behind (${hover.a / g}, ${hover.b / g}).`}
    {/if}
  </p>
</Widget>

<style>
  .wrap {
    width: 100%;
  }
  canvas {
    display: block;
    margin: 0 auto;
    border: 1px solid var(--line-strong);
    touch-action: none;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>

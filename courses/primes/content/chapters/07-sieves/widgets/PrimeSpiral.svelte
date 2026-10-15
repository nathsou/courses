<!--
  Prime spirals. Ulam (1963): write 1, 2, 3, … in a square spiral and mark the primes; they crowd onto diagonals.
  Sacks (1994): put n at radius √n and angle 2π√n, so the perfect squares line up on one ray. Either way the
  lines are values of quadratic polynomials such as Euler's n² + n + 41.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { sieve } from '$lib/primes/sieve';
  import { theme } from '$lib/state/theme.svelte';
  import { cssVar, setupCanvas } from '$lib/charts/colors';

  let mode = $state<'ulam' | 'sacks'>('ulam');
  let side = $state(151);
  let showEuler = $state(false);
  let canvas: HTMLCanvasElement;
  let width = $state(480);

  const MAX = 301 * 301 + 10;
  const flags = sieve(MAX);
  const eulerValues = new Set(Array.from({ length: 400 }, (_, n) => n * n + n + 41));

  /** Coordinates of k (k ≥ 1) in the Ulam spiral, with 1 at the origin. */
  function ulam(k: number): [number, number] {
    if (k === 1) return [0, 0];
    const r = Math.ceil((Math.sqrt(k) - 1) / 2); // ring
    const t = 2 * r;
    const maxK = (2 * r + 1) ** 2;
    const d = maxK - k; // distance back from the ring's end (bottom-right corner)
    if (d < t) return [r - d, -r]; // bottom edge, right to left… (y up)
    if (d < 2 * t) return [-r, -r + (d - t)]; // left edge, upwards
    if (d < 3 * t) return [-r + (d - 2 * t), r]; // top edge, left to right
    return [r, r - (d - 3 * t)]; // right edge, downwards
  }

  function draw() {
    if (!canvas) return;
    void theme.resolved;
    const size = Math.min(width, 560);
    const ctx = setupCanvas(canvas, size, size);
    ctx.fillStyle = cssVar('--chart-surface');
    ctx.fillRect(0, 0, size, size);
    const prime = cssVar('--prime');
    const blue = cssVar('--fx-blue');
    const n = side * side;
    if (mode === 'ulam') {
      const cell = size / side;
      const half = (side - 1) / 2;
      for (let k = 1; k <= n; k++) {
        if (!flags[k]) continue;
        const [x, y] = ulam(k);
        ctx.fillStyle = showEuler && eulerValues.has(k) ? blue : prime;
        const s = Math.max(1, cell * (showEuler && eulerValues.has(k) ? 1 : 0.85));
        ctx.fillRect((x + half) * cell, (half - y) * cell, s, s);
      }
    } else {
      const R = size / 2 - 4;
      const scale = R / Math.sqrt(n);
      const dot = Math.max(1, Math.min(3, 2.4 * scale));
      for (let k = 2; k <= n; k++) {
        if (!flags[k]) continue;
        const r = Math.sqrt(k);
        const t = 2 * Math.PI * r;
        ctx.fillStyle = showEuler && eulerValues.has(k) ? blue : prime;
        ctx.fillRect(size / 2 + r * scale * Math.cos(t), size / 2 - r * scale * Math.sin(t), dot, dot);
      }
    }
  }
  onMount(draw);
  $effect(() => {
    void [mode, side, showEuler, width, theme.resolved];
    draw();
  });
</script>

<Widget title="Prime spirals" subtitle="Write the numbers in a spiral and mark the primes. Diagonal streaks appear: some quadratic polynomials hit primes far more often than chance would suggest.">
  {#snippet controls()}
    <Segmented label="Spiral" bind:value={mode} options={[{ value: 'ulam', label: 'Ulam (square)' }, { value: 'sacks', label: 'Sacks (√n)' }]} size="sm" />
    <Segmented label="Size" bind:value={side} options={[{ value: 41, label: '41²' }, { value: 151, label: '151²' }, { value: 301, label: '301²' }]} size="sm" />
    <label class="opt ui"><input type="checkbox" bind:checked={showEuler} /> highlight n² + n + 41</label>
  {/snippet}
  <div class="wrap" bind:clientWidth={width}>
    <canvas bind:this={canvas} aria-label="{mode === 'ulam' ? 'Ulam' : 'Sacks'} spiral of the primes up to {side * side}."></canvas>
  </div>
  <p class="out">
    {side * side} numbers.
    {#if showEuler}Blue: primes of the form n² + n + 41 (prime for every n from 0 to 39). In the Ulam spiral started at 41 they would form an unbroken diagonal; here they fall on a few streaks.{:else}In the Sacks spiral the perfect squares lie on the horizontal ray to the right; curves of primes are values of n² + an + b.{/if}
  </p>
</Widget>

<style>
  .opt {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .wrap {
    width: 100%;
  }
  canvas {
    display: block;
    margin: 0 auto;
    border: 1px solid var(--line-strong);
    image-rendering: pixelated;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.84rem;
    color: var(--ink-2);
  }
</style>

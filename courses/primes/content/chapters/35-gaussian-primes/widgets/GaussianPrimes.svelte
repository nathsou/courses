<!--
  The Gaussian primes a + bi with a² + b² ≤ R², coloured by type: the ramified prime 1 + i and its associates (gold),
  inert rational primes q ≡ 3 (mod 4) on the axes (blue), and split primes with prime norm p ≡ 1 (mod 4) (red).
  The moat mode starts at 1 + i and colours every Gaussian prime reachable in steps of length at most d.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { sieve } from '$lib/primes/sieve';
  import { theme } from '$lib/state/theme.svelte';
  import { cssVar, setupCanvas } from '$lib/charts/colors';

  const RMAX = 220;
  const flags = sieve(2 * RMAX * RMAX + 10);
  const isGP = (a: number, b: number) => {
    a = Math.abs(a);
    b = Math.abs(b);
    if (a === 0) return b % 4 === 3 && flags[b] === 1;
    if (b === 0) return a % 4 === 3 && flags[a] === 1;
    return flags[a * a + b * b] === 1;
  };
  let R = $state(40);
  let mode = $state<'types' | 'moat'>('types');
  let step2 = $state(4); // squared step length
  let canvas: HTMLCanvasElement;
  let width = $state(480);
  let hover = $state<{ a: number; b: number } | null>(null);
  const size = $derived(Math.min(width, 520));

  const reach = $derived.by(() => {
    if (mode !== 'moat') return null;
    const key = (a: number, b: number) => (a + RMAX) * (2 * RMAX + 1) + (b + RMAX);
    const seen = new Set<number>([key(1, 1)]);
    const queue: [number, number][] = [[1, 1]];
    const d = Math.floor(Math.sqrt(step2));
    const offsets: [number, number][] = [];
    for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) if ((i || j) && i * i + j * j <= step2) offsets.push([i, j]);
    let far = 0;
    while (queue.length) {
      const [a, b] = queue.pop()!;
      far = Math.max(far, Math.hypot(a, b));
      for (const [i, j] of offsets) {
        const x = a + i;
        const y = b + j;
        if (x * x + y * y > R * R) continue;
        const k = key(x, y);
        if (!seen.has(k) && isGP(x, y)) {
          seen.add(k);
          queue.push([x, y]);
        }
      }
    }
    return { seen, key, far };
  });

  $effect(() => {
    void [R, mode, step2, size, reach, theme.resolved];
    if (!canvas || size < 20) return;
    const ctx = setupCanvas(canvas, size, size);
    ctx.fillStyle = cssVar('--chart-surface');
    ctx.fillRect(0, 0, size, size);
    const cell = size / (2 * R + 1);
    const col = { ram: cssVar('--series-3'), inert: cssVar('--fx-blue'), split: cssVar('--prime'), dim: cssVar('--ruling'), reach: cssVar('--series-4') };
    ctx.strokeStyle = cssVar('--ruling');
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    for (let a = -R; a <= R; a++) {
      for (let b = -R; b <= R; b++) {
        if (a * a + b * b > R * R || !isGP(a, b)) continue;
        let c: string;
        if (mode === 'moat') c = reach && reach.seen.has(reach.key(a, b)) ? col.reach : col.dim;
        else c = Math.abs(a) === 1 && Math.abs(b) === 1 ? col.ram : a === 0 || b === 0 ? col.inert : col.split;
        ctx.fillStyle = c;
        const s = Math.max(1, cell * 0.9);
        ctx.fillRect(size / 2 + (a - 0.45) * cell, size / 2 - (b + 0.45) * cell, s, s);
      }
    }
  });
  function onmove(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const cell = r.width / (2 * R + 1);
    const a = Math.round((e.clientX - r.left - r.width / 2) / cell);
    const b = Math.round((r.height / 2 - (e.clientY - r.top)) / cell);
    hover = { a, b };
  }
  const describe = (a: number, b: number) => {
    const n = a * a + b * b;
    if (!isGP(a, b)) return `${a} ${b < 0 ? '−' : '+'} ${Math.abs(b)}i is not a Gaussian prime (norm ${n}).`;
    if (n === 2) return `${a} ${b < 0 ? '−' : '+'} ${Math.abs(b)}i: an associate of 1 + i, the prime above 2 (norm 2).`;
    if (a === 0 || b === 0) return `${a + b}${a === 0 ? 'i' : ''}: a rational prime ≡ 3 (mod 4), still prime in ℤ[i] (norm ${n}).`;
    return `${a} ${b < 0 ? '−' : '+'} ${Math.abs(b)}i: norm ${n} = ${a}² + ${b}², a prime ≡ 1 (mod 4).`;
  };
</script>

<Widget title="Gaussian primes" subtitle="The primes of ℤ[i] near the origin. They have the symmetry of a square (multiplying by i rotates by 90°) and of reflection (complex conjugation)." onreset={() => ((R = 40), (mode = 'types'), (step2 = 4))}>
  {#snippet controls()}
    <Slider label="radius" bind:value={R} min={8} max={RMAX} step={1} format={(v) => String(v)} />
    <Segmented label="Colour by" bind:value={mode} options={[{ value: 'types', label: 'type' }, { value: 'moat', label: 'reachable from 1 + i' }]} size="sm" />
    {#if mode === 'moat'}<Segmented label="Step at most" bind:value={step2} options={[{ value: 2, label: '√2' }, { value: 4, label: '2' }, { value: 8, label: '√8' }, { value: 10, label: '√10' }, { value: 18, label: '√18' }]} size="sm" />{/if}
  {/snippet}
  <div class="wrap" bind:clientWidth={width}>
    <canvas bind:this={canvas} onpointermove={onmove} onpointerleave={() => (hover = null)} aria-label="Gaussian primes of norm at most {R * R}."></canvas>
  </div>
  {#if mode === 'types'}
    <div class="legend ui"><span class="k ram">1 + i and associates</span><span class="k inert">q ≡ 3 (mod 4), inert</span><span class="k split">a + bi with a² + b² = p ≡ 1 (mod 4)</span></div>
  {/if}
  <p class="out" aria-live="polite">
    {#if hover}{describe(hover.a, hover.b)}{:else if mode === 'moat' && reach}With steps of length at most √{step2}, the walk from 1 + i reaches {reach.seen.size.toLocaleString('en-GB')} Gaussian primes, as far as distance {reach.far.toFixed(1)} from 0{reach.far < R - 3 ? ': a moat stops it.' : ' (the edge of the picture).'}{:else}Point at a dot to identify it.{/if}
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
    image-rendering: pixelated;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin-top: 0.5rem;
  }
  .k::before {
    content: '';
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    margin-right: 0.35rem;
    vertical-align: -1px;
  }
  .k.ram::before {
    background: var(--series-3);
  }
  .k.inert::before {
    background: var(--fx-blue);
  }
  .k.split::before {
    background: var(--prime);
  }
  .out {
    margin: 0.5rem 0 0;
    font-size: 0.86rem;
  }
</style>

<!--
  Optical proximity correction, in two dimensions. A small FFT imager (scalar Fourier optics, a partially
  coherent source of thirteen points) computes the light that a mask lets through and the shape the resist
  takes. Features near the resolution limit print with rounded corners and shortened line ends; model-based OPC
  repeatedly simulates the print and moves the mask's edges to cancel the error.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { maskImage, type Optics } from '$lib/fab/litho';

  const N = 128;
  const PX = 8; // nm per pixel: a field of 1 024 nm
  const TH = 0.3;
  type R = [number, number, number, number]; // x0, y0, x1, y1 in nm, centre at 0
  const PATTERNS: Record<string, { name: string; rects: R[] }> = {
    ends: { name: 'Line ends', rects: [[-480, -32, -48, 32], [48, -32, 480, 32], [-480, 160, 480, 224]] },
    elbow: { name: 'An elbow', rects: [[-320, -32, 32, 32], [-32, -320, 32, 32], [96, 96, 160, 400]] },
    dense: { name: 'Dense and isolated', rects: [[-224, -300, -160, 300], [-64, -300, 0, 300], [96, -300, 160, 300], [352, -300, 416, 300]] },
  };
  const TOOLS: Record<string, Optics & { name: string }> = {
    arfi: { name: '193 nm immersion, NA 1.35', lambda: 193, NA: 1.35, sigma: 0.7 },
    euv: { name: 'EUV 13.5 nm, NA 0.33', lambda: 13.5, NA: 0.33, sigma: 0.7 },
  };
  let pattern = $state('ends');
  let tool = $state('arfi');
  let view = $state<'light' | 'mask'>('light');
  let mask = $state<Float64Array>(new Float64Array(N * N));
  /** The mask as a continuous quantity that accumulates corrections; the real mask is it, thresholded. */
  let cont = new Float64Array(N * N);
  let iteration = $state(0);
  let running = $state(false);
  let canvas: HTMLCanvasElement | undefined = $state();
  let mounted = $state(false);

  function raster(rects: R[]): Float64Array {
    const m = new Float64Array(N * N);
    for (const [x0, y0, x1, y1] of rects)
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const x = (i + 0.5) * PX - (N * PX) / 2;
          const y = (j + 0.5) * PX - (N * PX) / 2;
          if (x >= x0 && x < x1 && y >= y0 && y < y1) m[j * N + i] = 1;
        }
    return m;
  }
  const target = $derived(raster(PATTERNS[pattern]!.rects));
  $effect(() => {
    mask = Float64Array.from(target);
    cont = Float64Array.from(target, (v) => (v ? 0.75 : 0.25));
    iteration = 0;
  });
  const image = $derived(maskImage(mask, N, PX, TOOLS[tool]!));
  const printed = $derived(image.map((v) => (v > TH ? 1 : 0)));
  const error = $derived.by(() => {
    let wrong = 0;
    for (let i = 0; i < N * N; i++) if (printed[i] !== target[i]) wrong++;
    return wrong * PX * PX;
  });
  const targetArea = $derived(target.reduce((s, v) => s + v, 0) * PX * PX);

  /**
   * One step of model-based OPC: add the (locally averaged) print error to the continuous mask near the target's
   * edges, so that pixels where the print falls short grow and pixels where it overshoots shrink.
   */
  function opcStep() {
    const R = 3;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        // Only pixels within R of an edge of the target may change.
        let nearEdge = false;
        let sum = 0;
        let cnt = 0;
        for (let dj = -R; dj <= R; dj++)
          for (let di = -R; di <= R; di++) {
            const a = i + di;
            const b = j + dj;
            if (a < 0 || b < 0 || a >= N || b >= N) continue;
            if (target[b * N + a] !== target[j * N + i]) nearEdge = true;
            const wgt = 1 / (1 + di * di + dj * dj);
            sum += wgt * (target[b * N + a]! - printed[b * N + a]!);
            cnt += wgt;
          }
        if (nearEdge) cont[j * N + i] = Math.min(1, Math.max(0, cont[j * N + i]! + 0.6 * (sum / cnt)));
      }
    mask = cont.map((v) => (v >= 0.5 ? 1 : 0));
    iteration++;
  }
  let raf = 0;
  function runOpc() {
    if (running) return;
    running = true;
    let k = 0;
    const startError = error;
    let best = { err: error, mask: Float64Array.from(mask) };
    const tick = () => {
      opcStep();
      k++;
      if (error < best.err) best = { err: error, mask: Float64Array.from(mask) };
      if (k < 14) raf = requestAnimationFrame(tick);
      else {
        mask = best.mask;
        running = false;
        if (best.err < 0.6 * startError) progress.markSolved('lithography/opc');
      }
    };
    tick();
  }
  function reset() {
    cancelAnimationFrame(raf);
    running = false;
    mask = Float64Array.from(target);
    cont = Float64Array.from(target, (v) => (v ? 0.75 : 0.25));
    iteration = 0;
  }
  onMount(() => {
    progress.load();
    mounted = true;
    return () => cancelAnimationFrame(raf);
  });

  $effect(() => {
    if (!canvas || !mounted) return;
    const ctx = canvas.getContext('2d')!;
    const css = getComputedStyle(canvas);
    const hex = (name: string) => {
      const probe = document.createElement('span');
      probe.style.color = css.getPropertyValue(name);
      canvas!.parentElement!.appendChild(probe);
      const rgb = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g)!.map(Number);
      probe.remove();
      return rgb;
    };
    const bg = hex('--m-si');
    const hot = hex('--m-resist');
    const ink = hex('--ink');
    const data = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      let c: number[];
      if (view === 'mask') c = mask[i] ? hot : bg;
      else {
        const v = Math.min(1, image[i]! / 1.2);
        c = bg.map((b, k) => b + (hot[k]! - b) * v);
      }
      if (printed[i] && view === 'light') {
        // Mark the printed shape's boundary.
        const x = i % N;
        const y = (i / N) | 0;
        const edge = [i - 1, i + 1, i - N, i + N].some((k, n) => (n < 2 ? (n === 0 ? x > 0 : x < N - 1) : n === 2 ? y > 0 : y < N - 1) && !printed[k]);
        if (edge) c = ink;
      }
      data.data.set([c[0]!, c[1]!, c[2]!, 255], i * 4);
    }
    ctx.putImageData(data, 0, 0);
  });
  const outline = $derived(PATTERNS[pattern]!.rects.map(([x0, y0, x1, y1]) => ({ x: x0 / PX + N / 2, y: y0 / PX + N / 2, w: (x1 - x0) / PX, h: (y1 - y0) / PX })));
</script>

<Widget title="Correcting for the optics" subtitle="Dashed: the shapes the designer drew. Colour: the light reaching the wafer. Solid outline: what the resist prints. Run OPC and watch the mask change to make the print match the drawing." onreset={reset}>
  {#snippet controls()}
    <Segmented bind:value={pattern} label="Pattern" size="sm" options={Object.entries(PATTERNS).map(([k, v]) => ({ value: k, label: v.name }))} />
    <Segmented bind:value={tool} label="Exposure" size="sm" options={Object.entries(TOOLS).map(([k, v]) => ({ value: k, label: v.name }))} />
    <Segmented bind:value={view} label="Show" size="sm" options={[{ value: 'light', label: 'Light and print' }, { value: 'mask', label: 'The mask' }]} />
    <button class="b go ui" onclick={runOpc} disabled={running}>{running ? 'Correcting…' : 'Run OPC'}</button>
    <button class="b ui" onclick={reset}>Uncorrected mask</button>
  {/snippet}
  <div class="frame">
    <canvas bind:this={canvas} width={N} height={N} aria-hidden="true"></canvas>
    <svg viewBox="0 0 {N} {N}" class="over" role="img" aria-label="Target outlines over the simulated print; {Math.round(error)} nm² printed in the wrong place">
      {#each outline as r, i (i)}<rect x={r.x} y={r.y} width={r.w} height={r.h} class="tgt" />{/each}
    </svg>
  </div>
  <dl class="nums ui">
    <div><dt>Printed in the wrong place</dt><dd>{Math.round(error).toLocaleString('en-GB')} nm² ({((error / targetArea) * 100).toFixed(0)} % of the drawn area)</dd></div>
    <div><dt>OPC iterations</dt><dd>{iteration}</dd></div>
    <div><dt>Field</dt><dd>1 024 nm across; lines 64 nm wide</dd></div>
  </dl>
</Widget>

<style>
  .b {
    font: inherit;
    font-size: 0.84rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .b.go {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
  }
  .b:disabled {
    opacity: 0.6;
  }
  .frame {
    position: relative;
    width: 100%;
    max-width: 26rem;
    aspect-ratio: 1;
    margin: 0 auto;
  }
  canvas,
  .over {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
  .tgt {
    fill: none;
    stroke: var(--ink);
    stroke-width: 0.6;
    stroke-dasharray: 1.6 1.2;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.6rem 0 0;
    font-size: 0.82rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
</style>

<!--
  The argument principle. The plane is coloured by f(z) = (z − a)(z − b)(z − c)/(z − p), with the zeros a, b, c and
  the pole p draggable. Drag the dashed circle (centre) or its handle (radius): as z goes once round the circle, f(z)
  winds round 0 a number of times equal to (zeros inside) − (poles inside).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { theme } from '$lib/state/theme.svelte';
  import { setupCanvas } from '$lib/charts/colors';

  type P = { x: number; y: number };
  const init = () => ({
    zeros: [{ x: -1.2, y: 0.6 }, { x: 0.8, y: 0.9 }, { x: 0.3, y: -1.1 }] as P[],
    pole: { x: 1.7, y: -0.4 } as P,
    centre: { x: 0.2, y: 0.3 } as P,
    radius: 1.3,
  });
  let st = $state(init());
  let width = $state(480);
  let canvas: HTMLCanvasElement;
  const R = 3; // view: [−R, R]²
  const size = $derived(Math.min(width, 460));
  const toPx = (p: P) => ({ x: ((p.x + R) / (2 * R)) * size, y: ((R - p.y) / (2 * R)) * size });
  const fromPx = (x: number, y: number): P => ({ x: (x / size) * 2 * R - R, y: R - (y / size) * 2 * R });

  function f(x: number, y: number): [number, number] {
    let re = 1;
    let im = 0;
    for (const z of st.zeros) {
      const a = x - z.x;
      const b = y - z.y;
      [re, im] = [re * a - im * b, re * b + im * a];
    }
    const a = x - st.pole.x;
    const b = y - st.pole.y;
    const d = a * a + b * b;
    return [(re * a + im * b) / d, (im * a - re * b) / d];
  }
  function hsl(h: number, s: number, l: number): [number, number, number] {
    const k = (n: number) => (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const g = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [255 * g(0), 255 * g(8), 255 * g(4)];
  }

  const winding = $derived.by(() => {
    const n = 720;
    let total = 0;
    const [r0, i0] = f(st.centre.x + st.radius, st.centre.y);
    let prev = Math.atan2(i0, r0);
    for (let i = 1; i <= n; i++) {
      const t = (2 * Math.PI * i) / n;
      const [re, im] = f(st.centre.x + st.radius * Math.cos(t), st.centre.y + st.radius * Math.sin(t));
      const a = Math.atan2(im, re);
      let d = a - prev;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      total += d;
      prev = a;
    }
    return Math.round(total / (2 * Math.PI));
  });
  const inside = (p: P) => Math.hypot(p.x - st.centre.x, p.y - st.centre.y) < st.radius;
  const zerosIn = $derived(st.zeros.filter(inside).length);
  const polesIn = $derived(inside(st.pole) ? 1 : 0);

  $effect(() => {
    void [st.zeros.map((z) => z.x + z.y), st.pole.x, st.pole.y, size, theme.resolved];
    if (!canvas || size < 20) return;
    const ctx = setupCanvas(canvas, size, size);
    const cell = 3;
    const n = Math.ceil(size / cell);
    const img = ctx.createImageData(n, n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const p = fromPx((i + 0.5) * cell, (j + 0.5) * cell);
        const [re, im] = f(p.x, p.y);
        const m = Math.hypot(re, im);
        const h = (Math.atan2(im, re) / (2 * Math.PI) + 1) % 1;
        const l = 0.12 + 0.76 * (2 / Math.PI) * Math.atan(Math.pow(m, 0.4));
        const [r, g, b] = hsl(h, 0.8, l);
        const k = 4 * (j * n + i);
        img.data[k] = r;
        img.data[k + 1] = g;
        img.data[k + 2] = b;
        img.data[k + 3] = 255;
      }
    }
    const off = document.createElement('canvas');
    off.width = n;
    off.height = n;
    off.getContext('2d')!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, n * cell, n * cell);
  });

  let drag: { kind: 'zero' | 'pole' | 'centre' | 'radius'; i: number } | null = null;
  function pick(e: PointerEvent) {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * size;
    const py = ((e.clientY - r.top) / r.height) * size;
    const near = (p: P) => Math.hypot(toPx(p).x - px, toPx(p).y - py) < 14;
    const handle = { x: st.centre.x + st.radius, y: st.centre.y };
    const zi = st.zeros.findIndex(near);
    if (near(handle)) drag = { kind: 'radius', i: 0 };
    else if (zi >= 0) drag = { kind: 'zero', i: zi };
    else if (near(st.pole)) drag = { kind: 'pole', i: 0 };
    else drag = { kind: 'centre', i: 0 };
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    move(e);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const p = fromPx(((e.clientX - r.left) / r.width) * size, ((e.clientY - r.top) / r.height) * size);
    const c = { x: Math.max(-R, Math.min(R, p.x)), y: Math.max(-R, Math.min(R, p.y)) };
    if (drag.kind === 'zero') st.zeros[drag.i] = c;
    else if (drag.kind === 'pole') st.pole = c;
    else if (drag.kind === 'centre') st.centre = c;
    else st.radius = Math.max(0.15, Math.hypot(c.x - st.centre.x, c.y - st.centre.y));
  }
</script>

<Widget title="Counting zeros by winding" subtitle="The plane coloured by f(z) = (z − a)(z − b)(z − c)/(z − p): three zeros (dark) and one pole (pale). Drag the zeros, the pole, the circle, or the circle’s handle." onreset={() => (st = init())}>
  <div class="wrap" bind:clientWidth={width}>
    <div class="stage" style:width="{size}px" style:height="{size}px">
      <canvas bind:this={canvas}></canvas>
      <svg viewBox="0 0 {size} {size}" role="application" aria-label="Draggable zeros, pole and circle." onpointerdown={pick} onpointermove={move} onpointerup={() => (drag = null)}>
        {#if size > 20}
          {@const c = toPx(st.centre)}
          {@const h = toPx({ x: st.centre.x + st.radius, y: st.centre.y })}
          <circle class="contour" cx={c.x} cy={c.y} r={(st.radius / (2 * R)) * size} />
          <circle class="handle" cx={h.x} cy={h.y} r="6" />
          {#each st.zeros as z, i (i)}
            {@const q = toPx(z)}
            <circle class="zero" cx={q.x} cy={q.y} r="7" />
          {/each}
          {@const pp = toPx(st.pole)}
          <rect class="pole" x={pp.x - 6} y={pp.y - 6} width="12" height="12" />
        {/if}
      </svg>
    </div>
  </div>
  <p class="out" aria-live="polite">
    Inside the circle: {zerosIn} zero{zerosIn === 1 ? '' : 's'} and {polesIn} pole{polesIn === 1 ? '' : 's'}. Going once round the circle, f(z) winds round 0 <strong>{winding}</strong> time{Math.abs(winding) === 1 ? '' : 's'} = {zerosIn} − {polesIn}.
  </p>
</Widget>

<style>
  .wrap {
    width: 100%;
  }
  .stage {
    position: relative;
    margin: 0 auto;
    border: 1px solid var(--line-strong);
  }
  canvas,
  svg {
    position: absolute;
    inset: 0;
    display: block;
  }
  svg {
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: grab;
  }
  .contour {
    fill: none;
    stroke: #fff;
    stroke-width: 2;
    stroke-dasharray: 6 4;
  }
  .handle {
    fill: #fff;
    stroke: #000;
    stroke-width: 1.5;
    cursor: ew-resize;
  }
  .zero {
    fill: none;
    stroke: #fff;
    stroke-width: 2.5;
  }
  .pole {
    fill: none;
    stroke: #000;
    stroke-width: 2.5;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>

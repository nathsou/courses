<!--
  Two inverters in a loop, drawn in the plane of their two node voltages: each inverter's curve, the two stable
  states where they cross at the corners, and the balance point in the middle. Set a starting point (click, or
  the sliders) and watch the pair fall to one of the stable states. Starting near the middle takes longer.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { latchSettle, tanhInverter } from '$lib/physics/circuits';

  let gain = $state(5);
  let x0 = $state(0.6);
  let y0 = $state(0.45);

  const f = $derived(tanhInverter(gain));
  const run = $derived(latchSettle(gain, x0, y0));
  const S = 260;
  const P = 30;
  const px = (v: number) => P + v * S;
  const py = (v: number) => P + (1 - v) * S;
  const curveA = $derived(Array.from({ length: 101 }, (_, i) => `${i ? 'L' : 'M'}${px(i / 100)},${py(f(i / 100))}`).join(''));
  const curveB = $derived(Array.from({ length: 101 }, (_, i) => `${i ? 'L' : 'M'}${px(f(i / 100))},${py(i / 100)}`).join(''));
  const traj = $derived(run.path.map(([a, b], i) => `${i ? 'L' : 'M'}${px(a)},${py(b)}`).join(''));
  const end = $derived(run.path.at(-1)!);
  const offsets = [0.3, 0.1, 0.03, 0.01, 3e-3, 1e-3, 3e-4, 1e-4, 3e-5, 1e-5];
  const settleCurve = $derived(offsets.map((d) => [d, latchSettle(gain, 0.5 + d, 0.5 - d).settle] as [number, number]));
  const offset = $derived(Math.abs(x0 - y0) / 2);

  function pick(e: PointerEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * (S + 2 * P);
    const sy = ((e.clientY - r.top) / r.height) * (S + 2 * P);
    x0 = Math.max(0, Math.min(1, (sx - P) / S));
    y0 = Math.max(0, Math.min(1, 1 - (sy - P) / S));
  }
</script>

<Widget title="Two inverters in a loop" subtitle="Node X drives inverter 2, whose output Y drives inverter 1, whose output is X. Click inside the square (or use the sliders) to start the pair from any voltages.">
  {#snippet controls()}
    <Slider bind:value={x0} min={0} max={1} step={0.0001} label="Start X" format={(v) => `${v.toFixed(4)} V`} />
    <Slider bind:value={y0} min={0} max={1} step={0.0001} label="Start Y" format={(v) => `${v.toFixed(4)} V`} />
    <Slider bind:value={gain} min={1.5} max={12} step={0.5} label="Inverter gain" format={(v) => v.toFixed(1)} />
  {/snippet}
  <div class="two">
    <svg viewBox="0 0 {S + 2 * P} {S + 2 * P}" class="plane" role="img" aria-label="Phase plane: from X = {x0.toFixed(3)}, Y = {y0.toFixed(3)} the pair settles to X = {end[0].toFixed(2)}, Y = {end[1].toFixed(2)} in {run.settle.toFixed(2)} τ" onpointerdown={pick}>
      <rect x={P} y={P} width={S} height={S} class="frame" />
      <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} class="diag" />
      <path d={curveA} class="ca" />
      <path d={curveB} class="cb" />
      <path d={traj} class="traj" />
      <circle cx={px(x0)} cy={py(y0)} r="5" class="start" />
      <circle cx={px(end[0])} cy={py(end[1])} r="5" class="end" />
      <circle cx={px(0.5)} cy={py(0.5)} r="4" class="meta" />
      <text x={px(0.5) + 8} y={py(0.5) - 6} class="lbl">balance point</text>
      <text x={px(0)} y={P - 8} class="lbl">X = 0, Y = 1</text>
      <text x={px(1)} y={P + S + 14} class="lbl r">X = 1, Y = 0</text>
      <text x={P + S / 2} y={S + 2 * P - 4} class="axis">X (V)</text>
      <text transform="translate(12 {P + S / 2}) rotate(-90)" class="axis">Y (V)</text>
    </svg>
    <div>
      <Plot
        label="Settling time against starting distance from the balance point"
        x={{ min: 1e-5, max: 0.3, log: true, label: 'start distance from the middle (V)' }}
        y={{ min: 0, max: Math.max(...settleCurve.map((p) => p[1])) * 1.15, label: 'time to settle (τ)' }}
        height={230}
        series={[{ points: settleCurve, color: 'var(--series-1)', width: 2.5 }]}
        markers={offset > 0 ? [{ x: Math.max(1e-5, offset), y: run.settle, color: 'var(--ac)' }] : []}
      />
    </div>
  </div>
  <dl class="nums ui">
    <div><dt>Settled to</dt><dd>X = {end[0] > 0.5 ? 1 : 0}, Y = {end[1] > 0.5 ? 1 : 0}</dd></div>
    <div><dt>Time to settle</dt><dd>{run.settle.toFixed(2)} τ</dd></div>
    <div><dt>Each factor of 10 closer adds</dt><dd>{(Math.LN10 / (gain - 1)).toFixed(2)} τ</dd></div>
  </dl>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.2fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .plane {
    width: 100%;
    height: auto;
    touch-action: none;
    cursor: crosshair;
    font-family: var(--font-ui);
  }
  .frame {
    fill: var(--page);
    stroke: var(--line-strong);
  }
  .diag {
    stroke: var(--line-strong);
    stroke-dasharray: 3 3;
  }
  .ca {
    fill: none;
    stroke: var(--series-1);
    stroke-width: 2;
  }
  .cb {
    fill: none;
    stroke: var(--series-2);
    stroke-width: 2;
  }
  .traj {
    fill: none;
    stroke: var(--ac);
    stroke-width: 2.5;
  }
  .start {
    fill: var(--surface);
    stroke: var(--ac);
    stroke-width: 2;
  }
  .end {
    fill: var(--ac);
  }
  .meta {
    fill: var(--ink-2);
  }
  .lbl {
    font-size: 11px;
    fill: var(--ink-2);
  }
  .lbl.r {
    text-anchor: end;
  }
  .axis {
    font-size: 12px;
    font-weight: 600;
    fill: var(--ink-2);
    text-anchor: middle;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
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

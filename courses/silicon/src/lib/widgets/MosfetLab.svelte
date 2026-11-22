<!--
  An n-channel MOSFET: gate and drain voltages, a cross-section whose channel thins towards the drain and
  pinches off in saturation, the output characteristics (I_D against V_DS for several V_GS) and the transfer
  characteristic on a log scale (subthreshold exponential, then square law). The model: src/lib/physics/devices.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { NFET, drainCurrent, swing, vdsat, type Fet } from '$lib/physics/devices';

  let { title = 'An n-channel MOSFET', vgs0 = 1.0, vds0 = 0.3 }: { title?: string; vgs0?: number; vds0?: number } = $props();
  let vgs = $state(untrack(() => vgs0));
  let vds = $state(untrack(() => vds0));
  let view = $state<'output' | 'transfer'>('output');
  let kind = $state<'planar' | 'finfet'>('planar');

  // The FinFET-like device has a steeper subthreshold slope; its threshold is set for the same off-current.
  const fet = $derived<Fet>(kind === 'planar' ? NFET : { ...NFET, n: 1.08, vt: 0.33 });
  const id = $derived(drainCurrent(fet, vgs, vds));
  const sat = $derived(vdsat(fet, vgs));
  const region = $derived(vgs < fet.vt ? 'subthreshold (off)' : vds < sat ? 'linear (a resistor)' : 'saturation (a current source)');
  const VGS_SET = [0.4, 0.6, 0.8, 1.0, 1.2];
  const output = $derived(
    VGS_SET.map((g, k) => ({
      label: `V_GS = ${g.toFixed(1)} V`,
      color: `var(--series-${(k % 5) + 1})`,
      width: Math.abs(g - vgs) < 1e-6 ? 3 : 1.5,
      points: Array.from({ length: 81 }, (_, i) => [(1.2 * i) / 80, drainCurrent(fet, g, (1.2 * i) / 80) * 1e6] as [number, number]),
    })),
  );
  const transfer = $derived(Array.from({ length: 121 }, (_, i) => [(1.2 * i) / 120, drainCurrent(fet, (1.2 * i) / 120, Math.max(vds, 0.05))] as [number, number]));
  const ion = $derived(drainCurrent(fet, 1, 1));
  const ioff = $derived(drainCurrent(fet, 0, 1));
  const fmtI = (a: number) => {
    const m = Math.abs(a);
    const [d, u] = m >= 1e-3 ? [1e-3, 'mA'] : m >= 1e-6 ? [1e-6, 'µA'] : m >= 1e-9 ? [1e-9, 'nA'] : m >= 1e-12 ? [1e-12, 'pA'] : [1e-15, 'fA'];
    return `${(m / d).toPrecision(3)} ${u}`;
  };

  // Cross-section: channel thickness along x from source (0) to drain (1) ∝ local gate overdrive.
  const chan = $derived.by(() => {
    const over = (vgs - fet.vt) / fet.n;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const local = over - Math.min(vds, Math.max(sat, 0)) * u;
      pts.push([u, Math.max(0, local)]);
    }
    return pts;
  });
  const thick = (o: number) => (vgs <= fet.vt ? 0 : 2 + Math.min(12, o * 14));
  const chanPath = $derived(`M90,96 ${chan.map(([u, o]) => `L${90 + u * 180},${96 + thick(o)}`).join(' ')} L270,96 Z`);
  const pinched = $derived(vgs > fet.vt && vds >= sat);
</script>

<Widget {title} subtitle="Source on the left, drain on the right, the gate above the channel between them. The gate voltage V_GS opens the channel; the drain voltage V_DS drives current through it.">
  {#snippet controls()}
    <Slider bind:value={vgs} min={0} max={1.2} step={0.01} label="Gate voltage V_GS" format={(x) => `${x.toFixed(2)} V`} />
    <Slider bind:value={vds} min={0} max={1.2} step={0.01} label="Drain voltage V_DS" format={(x) => `${x.toFixed(2)} V`} />
    <Segmented bind:value={view} label="Plot" size="sm" options={[{ value: 'output', label: 'I_D against V_DS' }, { value: 'transfer', label: 'I_D against V_GS (log)' }]} />
    <Segmented bind:value={kind} label="Transistor" size="sm" options={[{ value: 'planar', label: 'Planar' }, { value: 'finfet', label: 'FinFET-like gate' }]} />
  {/snippet}
  <div class="two">
    <svg viewBox="0 0 360 200" class="xs" role="img" aria-label="Cross-section: {region}; drain current {fmtI(id)}">
      <rect x="0" y="80" width="360" height="120" class="psi" />
      <path d="M20,80 L90,80 L90,96 Q90,128 60,128 L20,128 Z" class="nplus" />
      <path d="M340,80 L270,80 L270,96 Q270,128 300,128 L340,128 Z" class="nplus" />
      <rect x="86" y="70" width="188" height="10" class="ox" />
      <rect x="86" y="40" width="188" height="30" class="gate" />
      <path d={chanPath} class="chan" />
      {#if pinched}<text x="268" y="122" class="t r small">pinched off</text>{/if}
      <text x="55" y="110" class="t">n⁺ source</text>
      <text x="305" y="110" class="t">n⁺ drain</text>
      <text x="180" y="60" class="t on">gate</text>
      <text x="180" y="185" class="t dim">p-type body</text>
      <line x1="55" y1="80" x2="55" y2="22" class="wire" /><text x="55" y="16" class="t small">0 V</text>
      <line x1="180" y1="40" x2="180" y2="22" class="wire" /><text x="180" y="16" class="t small">{vgs.toFixed(2)} V</text>
      <line x1="305" y1="80" x2="305" y2="22" class="wire" /><text x="305" y="16" class="t small">{vds.toFixed(2)} V</text>
      {#if id > 1e-9}
        <path d="M120,150 L240,150" class="arrow" style:stroke-width={1 + Math.min(4, Math.log10(id / 1e-9))} />
        <text x="180" y="168" class="t small">electrons flow →</text>
      {/if}
    </svg>
    <div>
      {#if view === 'output'}
        <Plot
          label="Output characteristics"
          x={{ min: 0, max: 1.2, label: 'drain voltage V_DS (V)' }}
          y={{ min: 0, max: Math.max(...output.flatMap((s) => s.points.map((p) => p[1]))) * 1.08, label: 'drain current (µA)' }}
          series={output}
          markers={[{ x: vds, y: id * 1e6, color: 'var(--ac)' }]}
          height={230}
        >
          {#snippet overlay({ sx, sy })}
            <path d={Array.from({ length: 30 }, (_, i) => { const g = fet.vt + (0.85 * i) / 29; const v = vdsat(fet, g); return `${i ? 'L' : 'M'}${sx(v)},${sy(drainCurrent(fet, g, v) * 1e6)}`; }).join('')} fill="none" stroke="var(--ink-3)" stroke-dasharray="3 3" />
          {/snippet}
        </Plot>
      {:else}
        <Plot
          label="Transfer characteristic on a log scale"
          x={{ min: 0, max: 1.2, label: 'gate voltage V_GS (V)' }}
          y={{ min: 1e-13, max: 1e-3, log: true, label: 'drain current (A)' }}
          series={[{ points: transfer, color: 'var(--electron)', width: 2.5 }]}
          markers={[{ x: vgs, y: Math.max(1e-13, id), color: 'var(--ac)' }]}
          vlines={[{ at: fet.vt, label: 'V_T', color: 'var(--ac)' }]}
          height={230}
        />
      {/if}
    </div>
  </div>
  <dl class="nums ui">
    <div><dt>Drain current</dt><dd>{fmtI(id)}</dd></div>
    <div><dt>Region</dt><dd>{region}</dd></div>
    <div><dt>V<sub>DS,sat</sub> = (V<sub>GS</sub> − V<sub>T</sub>)/n</dt><dd>{sat.toFixed(2)} V</dd></div>
    <div><dt>Subthreshold swing</dt><dd>{swing(fet).toFixed(0)} mV per decade</dd></div>
    <div><dt>On/off at 1 V: I<sub>on</sub> / I<sub>off</sub></dt><dd>{fmtI(ion)} / {fmtI(ioff)}</dd></div>
  </dl>
  {#if view === 'output'}<p class="note ui">The dashed line marks where each curve enters saturation, V<sub>DS</sub> = V<sub>DS,sat</sub>.</p>{/if}
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 700px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .xs {
    width: 100%;
    height: auto;
    font-family: var(--font-ui);
  }
  .psi {
    fill: var(--m-p);
  }
  .nplus {
    fill: var(--m-nplus);
  }
  .ox {
    fill: var(--m-oxide);
    stroke: var(--m-oxide-edge);
  }
  .gate {
    fill: var(--m-poly);
  }
  .chan {
    fill: var(--electron);
    opacity: 0.85;
  }
  .wire {
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }
  .arrow {
    stroke: var(--electron);
    fill: none;
    marker-end: none;
    stroke-linecap: round;
  }
  .t {
    font-size: 11px;
    fill: var(--ink);
    text-anchor: middle;
    font-weight: 600;
  }
  .t.small {
    font-size: 10px;
    font-weight: 500;
  }
  .t.r {
    text-anchor: end;
  }
  .t.on {
    fill: #fff;
  }
  .t.dim {
    fill: var(--ink-2);
    font-weight: 400;
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
  .note {
    margin: 0.4rem 0 0;
    font-size: 0.78rem;
    color: var(--ink-3);
  }
</style>

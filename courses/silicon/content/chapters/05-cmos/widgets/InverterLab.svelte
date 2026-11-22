<!--
  The CMOS inverter: a pMOS from V_DD to the output and an nMOS from the output to ground, gates tied to the
  input. The schematic shows which transistor conducts; the transfer curve (V_out against V_in) is solved from
  the transistor model; the current through both transistors is drawn beneath it.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { NFET, PFET } from '$lib/physics/devices';
  import { currents, noiseMargins, scaled, vout, vtc, type Inverter } from '$lib/physics/circuits';

  let vin = $state(0.3);
  let vdd = $state(1.0);
  let ratio = $state(2.5);

  const inv = $derived<Inverter>({ vdd, n: NFET, p: scaled(PFET, ratio) });
  $effect(() => {
    if (vin > vdd) vin = vdd;
  });
  const curve = $derived(vtc(inv, 160));
  const nm = $derived(noiseMargins(inv));
  const out = $derived(vout(inv, vin));
  const i = $derived(currents(inv, vin, out).down);
  const icurve = $derived(curve.map(([x, y]) => [x, currents(inv, x, y).down * 1e6] as [number, number]));
  const fmtA = (a: number) => (a >= 1e-6 ? `${(a * 1e6).toFixed(1)} µA` : a >= 1e-9 ? `${(a * 1e9).toFixed(1)} nA` : `${(a * 1e12).toFixed(1)} pA`);
  // Conduction strength for the schematic, 0 (off) to 1 (fully on): from gate overdrive.
  const nOn = $derived(Math.max(0, Math.min(1, (vin - NFET.vt) / (vdd - NFET.vt))));
  const pOn = $derived(Math.max(0, Math.min(1, (vdd - vin - PFET.vt) / (vdd - PFET.vt))));
</script>

<Widget title="The CMOS inverter" subtitle="Drag the input voltage across its range. One transistor or the other conducts; only near the middle do both, briefly.">
  {#snippet controls()}
    <Slider bind:value={vin} min={0} max={vdd} step={0.005} label="Input V_in" format={(x) => `${x.toFixed(3)} V`} />
    <Slider bind:value={vdd} min={0.4} max={1.2} step={0.01} label="Supply V_DD" format={(x) => `${x.toFixed(2)} V`} />
    <Slider bind:value={ratio} min={0.5} max={8} step={0.1} label="pMOS width ÷ nMOS width" format={(x) => `${x.toFixed(1)}×`} />
  {/snippet}
  <div class="two">
    <svg viewBox="0 0 220 260" class="sch" role="img" aria-label="Schematic: input {vin.toFixed(2)} V, output {out.toFixed(2)} V; pMOS {pOn > 0 ? 'on' : 'off'}, nMOS {nOn > 0 ? 'on' : 'off'}">
      <line x1="40" x2="200" y1="24" y2="24" class="rail" /><text x="200" y="14" class="t r">V_DD = {vdd.toFixed(2)} V</text>
      <line x1="40" x2="200" y1="240" y2="240" class="rail" /><text x="200" y="256" class="t r">0 V (ground)</text>
      <!-- pMOS -->
      <line x1="120" x2="120" y1="24" y2="70" class="w" />
      <rect x="112" y="70" width="16" height="44" class="fet p" style:--on={pOn} />
      <line x1="120" x2="120" y1="114" y2="130" class="w" />
      <line x1="100" x2="100" y1="74" y2="110" class="gate" /><circle cx="105" cy="92" r="4" class="bubble" />
      <text x="134" y="96" class="t">pMOS {pOn > 0.02 ? 'on' : 'off'}</text>
      <!-- nMOS -->
      <line x1="120" x2="120" y1="130" y2="146" class="w" />
      <rect x="112" y="146" width="16" height="44" class="fet n" style:--on={nOn} />
      <line x1="120" x2="120" y1="190" y2="240" class="w" />
      <line x1="100" x2="100" y1="150" y2="186" class="gate" />
      <text x="134" y="172" class="t">nMOS {nOn > 0.02 ? 'on' : 'off'}</text>
      <!-- input and output -->
      <path d="M100,92 L80,92 L80,168 L100,168 M80,130 L30,130" class="w in" />
      <text x="30" y="122" class="t">in {vin.toFixed(2)} V</text>
      <line x1="120" x2="190" y1="130" y2="130" class="w" />
      <circle cx="120" cy="130" r="3.5" class="node" />
      <text x="190" y="122" class="t r">out {out.toFixed(2)} V</text>
    </svg>
    <div>
      <Plot
        label="Voltage transfer curve"
        x={{ min: 0, max: vdd, label: 'input V_in (V)' }}
        y={{ min: 0, max: vdd, label: 'output V_out (V)' }}
        height={200}
        series={[
          { points: [[0, 0], [vdd, vdd]], color: 'var(--ink-3)', width: 1, dash: '3 3' },
          { points: curve, color: 'var(--series-1)', width: 2.5 },
        ]}
        markers={[{ x: vin, y: out, color: 'var(--ac)' }, { x: nm.vm, y: nm.vm, color: 'var(--ink-2)', r: 3.5, label: 'V_M' }]}
        vlines={[{ at: nm.vil, label: 'V_IL', color: 'var(--series-4)' }, { at: nm.vih, label: 'V_IH', color: 'var(--series-4)' }]}
      />
      <Plot
        label="Current through both transistors against input"
        x={{ min: 0, max: vdd, label: 'input V_in (V)' }}
        y={{ min: 0, max: Math.max(1, ...icurve.map((p) => p[1])) * 1.1, label: 'current (µA)' }}
        height={120}
        series={[{ points: icurve, color: 'var(--series-2)', width: 2, fillTo: 0 }]}
        markers={[{ x: vin, y: i * 1e6, color: 'var(--ac)' }]}
      />
    </div>
  </div>
  <dl class="nums ui">
    <div><dt>Output</dt><dd>{out.toFixed(3)} V</dd></div>
    <div><dt>Current from V<sub>DD</sub> to ground</dt><dd>{fmtA(i)}</dd></div>
    <div><dt>Switching threshold V<sub>M</sub></dt><dd>{nm.vm.toFixed(3)} V</dd></div>
    <div><dt>Noise margin, low (V<sub>IL</sub> − V<sub>OL</sub>)</dt><dd>{nm.nml.toFixed(3)} V</dd></div>
    <div><dt>Noise margin, high (V<sub>OH</sub> − V<sub>IH</sub>)</dt><dd>{nm.nmh.toFixed(3)} V</dd></div>
  </dl>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.4fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
    .sch {
      max-width: 15rem;
      margin: 0 auto;
    }
  }
  .sch {
    width: 100%;
    height: auto;
    font-family: var(--font-ui);
  }
  .rail {
    stroke: var(--ink);
    stroke-width: 3;
  }
  .w {
    stroke: var(--ink-2);
    stroke-width: 2;
    fill: none;
  }
  .w.in {
    stroke: var(--ac);
  }
  .gate {
    stroke: var(--ink);
    stroke-width: 3;
  }
  .bubble {
    fill: var(--surface);
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .fet {
    stroke: var(--ink);
    stroke-width: 1.5;
    fill: color-mix(in srgb, var(--ok) calc(var(--on) * 85%), var(--surface));
  }
  .node {
    fill: var(--ink);
  }
  .t {
    font-size: 11px;
    fill: var(--ink);
  }
  .t.r {
    text-anchor: end;
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

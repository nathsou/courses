<!--
  Shockley's diode equation for a junction 100 µm × 100 µm, its saturation current computed from the doping
  (minority-carrier diffusion with a 1 µs lifetime). Linear and logarithmic views; temperature.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { NI_SI, intrinsic, kT, material, sci } from '$lib/physics/semiconductor';
  import { diodeCurrent, saturationCurrent } from '$lib/physics/devices';

  let v = $state(0.6);
  let T = $state(300);
  let view = $state<'lin' | 'log'>('log');

  // The saturation current scales with n_i², which grows steeply with temperature.
  const is = $derived(saturationCurrent(1e16, 1e16) * (intrinsic(material('si'), T) / NI_SI) ** 2);
  const i = $derived(diodeCurrent(is, v, T));
  const pts = $derived(Array.from({ length: 201 }, (_, k) => {
    const x = -0.4 + (1.2 * k) / 200;
    return [x, diodeCurrent(is, x, T)] as [number, number];
  }));
  const fmtI = (a: number) => {
    const m = Math.abs(a);
    const [d, u] = m >= 1 ? [1, 'A'] : m >= 1e-3 ? [1e-3, 'mA'] : m >= 1e-6 ? [1e-6, 'µA'] : m >= 1e-9 ? [1e-9, 'nA'] : m >= 1e-12 ? [1e-12, 'pA'] : [1e-15, 'fA'];
    return `${a < 0 ? '−' : ''}${(m / d).toPrecision(3)} ${u}`;
  };
  const perDecade = $derived(kT(T) * Math.LN10 * 1000);
</script>

<Widget title="The diode’s current" subtitle="A silicon junction 100 µm on a side, both sides doped 10¹⁶ per cm³. Drag the voltage; switch to the logarithmic view to see the exponential as a straight line.">
  {#snippet controls()}
    <Slider bind:value={v} min={-0.4} max={0.8} step={0.005} label="Voltage" format={(x) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(3)} V`} />
    <Slider bind:value={T} min={250} max={400} step={5} label="Temperature" format={(x) => `${x.toFixed(0)} K`} />
    <Segmented bind:value={view} label="Scale" options={[{ value: 'lin', label: 'Linear' }, { value: 'log', label: 'Logarithmic' }]} />
  {/snippet}
  {#if view === 'lin'}
    <Plot
      label="Diode current against voltage, linear scale"
      x={{ min: -0.4, max: 0.8, label: 'voltage (V)' }}
      y={{ min: -1e-3, max: 10e-3, label: 'current (mA)', format: (y) => (y * 1000).toFixed(0) }}
      series={[{ points: pts, color: 'var(--series-1)', width: 2.5 }]}
      markers={[{ x: v, y: Math.min(i, 10e-3), color: 'var(--ac)' }]}
      hlines={[{ at: 0, dash: '0' }]}
    />
  {:else}
    <Plot
      label="Diode current against voltage, logarithmic scale"
      x={{ min: -0.4, max: 0.8, label: 'voltage (V)' }}
      y={{ min: 1e-17, max: 1, log: true, label: '|current| (A)' }}
      series={[{ points: pts.map(([x, y]) => [x, Math.abs(y)] as [number, number]), color: 'var(--series-1)', width: 2.5 }]}
      markers={[{ x: v, y: Math.max(1e-17, Math.abs(i)), color: 'var(--ac)' }]}
      hlines={[{ at: is, label: 'saturation current I_s', color: 'var(--hole)' }]}
    />
  {/if}
  <dl class="nums ui">
    <div><dt>Current at {v.toFixed(3)} V</dt><dd>{fmtI(i)}</dd></div>
    <div><dt>Saturation current I<sub>s</sub></dt><dd>{sci(is)} A</dd></div>
    <div><dt>Forward: ×10 every</dt><dd>{perDecade.toFixed(1)} mV</dd></div>
  </dl>
</Widget>

<style>
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

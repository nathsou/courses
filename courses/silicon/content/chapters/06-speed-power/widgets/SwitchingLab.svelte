<!--
  One inverter switching: its input rises in 10 ps and its output falls, discharging the load of `fan-out` copies
  of itself plus its own parasitic capacitance. Simulated with the transistor model (C dV/dt = I). Below: delay
  and energy per transition against the supply voltage.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { C_PARASITIC, C_UNIT, INVERTER, fallingTransient, inverterDelay } from '$lib/physics/circuits';

  let fanout = $state(4);
  let vdd = $state(1.0);

  const c = $derived(C_PARASITIC + fanout * C_UNIT);
  const tr = $derived(fallingTransient({ ...INVERTER, vdd }, c, 10e-12));
  const window_ = $derived(Math.min(tr.t.at(-1)!, 10e-12 + 4 * tr.tpd + 20e-12));
  const shown = $derived(tr.t.map((t, i) => i).filter((i) => tr.t[i]! <= window_));
  const energy = $derived(c * vdd * vdd);
  const sweep = $derived(
    Array.from({ length: 15 }, (_, i) => {
      const v = 0.5 + (0.7 * i) / 14;
      return { v, d: inverterDelay(fanout, v) * 1e12, e: c * v * v * 1e15 };
    }),
  );
</script>

<Widget title="A gate switching" subtitle="An inverter’s input rises in 10 ps; its output falls as the nMOS discharges the load: the inputs of the gates it drives (fan-out) plus its own parasitic capacitance.">
  {#snippet controls()}
    <Slider bind:value={fanout} min={1} max={16} step={1} label="Fan-out" format={(x) => `${x} gate${x === 1 ? '' : 's'} (${Math.round((C_PARASITIC + x * C_UNIT) * 1e15)} fF)`} />
    <Slider bind:value={vdd} min={0.5} max={1.2} step={0.01} label="Supply V_DD" format={(x) => `${x.toFixed(2)} V`} />
  {/snippet}
  <Plot
    label="Input and output voltages against time"
    x={{ min: 0, max: window_ * 1e12, label: 'time (ps)' }}
    y={{ min: 0, max: 1.2, label: 'voltage (V)' }}
    height={200}
    series={[
      { points: shown.map((i) => [tr.t[i]! * 1e12, tr.vin[i]!] as [number, number]), color: 'var(--ink-3)', width: 2, label: 'input' },
      { points: shown.map((i) => [tr.t[i]! * 1e12, tr.vout[i]!] as [number, number]), color: 'var(--series-1)', width: 2.5, label: 'output' },
    ]}
    hlines={[{ at: vdd / 2, label: '50 %' }]}
    vlines={[{ at: 5, color: 'var(--ink-3)' }, { at: 5 + tr.tpd * 1e12, label: `t_pd = ${(tr.tpd * 1e12).toFixed(1)} ps`, color: 'var(--ac)' }]}
  />
  <div class="two">
    <Plot
      label="Delay against supply voltage"
      x={{ min: 0.5, max: 1.2, label: 'supply V_DD (V)' }}
      y={{ min: 1, max: 1000, log: true, label: 'delay (ps)' }}
      height={170}
      series={[{ points: sweep.map((s) => [s.v, s.d] as [number, number]), color: 'var(--series-1)', width: 2.5 }]}
      markers={[{ x: vdd, y: tr.tpd * 1e12, color: 'var(--ac)' }]}
    />
    <Plot
      label="Energy per transition against supply voltage"
      x={{ min: 0.5, max: 1.2, label: 'supply V_DD (V)' }}
      y={{ min: 0, max: Math.max(...sweep.map((s) => s.e)) * 1.1, label: 'energy, C·V² (fJ)' }}
      height={170}
      series={[{ points: sweep.map((s) => [s.v, s.e] as [number, number]), color: 'var(--series-2)', width: 2.5 }]}
      markers={[{ x: vdd, y: energy * 1e15, color: 'var(--ac)' }]}
    />
  </div>
  <dl class="nums ui">
    <div><dt>Propagation delay</dt><dd>{(tr.tpd * 1e12).toFixed(1)} ps</dd></div>
    <div><dt>Load capacitance</dt><dd>{(c * 1e15).toFixed(0)} fF</dd></div>
    <div><dt>Energy per 0→1→0 cycle, C·V²</dt><dd>{(energy * 1e15).toFixed(2)} fJ</dd></div>
    <div><dt>Energy × delay</dt><dd>{(energy * 1e15 * tr.tpd * 1e12).toFixed(0)} fJ·ps</dd></div>
  </dl>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
    gap: 0.75rem;
    margin-top: 0.5rem;
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

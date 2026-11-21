<!--
  The one-transistor DRAM cell: a capacitor charged to V_DD (a 1) or 0 V (a 0) that slowly leaks. To read it,
  the bitline is precharged to V_DD/2 and the cell's charge is shared with it: the bitline moves by
  (V_cell − V_DD/2)·C_s/(C_s + C_BL), which a sense amplifier must detect. Illustrative values.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';

  const VDD = 1.1;
  const SENSE = 0.03;
  const TAU = 1.5; // s, time constant of the worst cells' leakage (illustrative)
  let cs = $state(10);
  let cbl = $state(80);
  let ms = $state(64);

  // A stored 1 leaks away towards ground.
  const vcell = (t: number) => VDD * Math.exp(-t / TAU);
  const signal = (t: number) => (vcell(t) - VDD / 2) * (cs / (cs + cbl));
  const now = $derived(signal(ms / 1000));
  const curve = $derived(Array.from({ length: 101 }, (_, i) => [i * 10, signal((i * 10) / 1000) * 1000] as [number, number]));
  const limit = $derived.by(() => {
    // Longest time since refresh that still reads correctly.
    const need = VDD / 2 + SENSE / (cs / (cs + cbl));
    return need >= VDD ? 0 : TAU * Math.log(VDD / need) * 1000;
  });
</script>

<Widget title="A DRAM cell, read and leaking" subtitle="A stored 1 is charge on a tiny capacitor. Reading shares that charge with a much larger bitline precharged to half the supply; the bitline moves by a few tens of millivolts. Meanwhile the charge leaks away.">
  {#snippet controls()}
    <Slider bind:value={cs} min={4} max={30} step={1} label="Cell capacitance" format={(v) => `${v} fF`} />
    <Slider bind:value={cbl} min={20} max={200} step={5} label="Bitline capacitance" format={(v) => `${v} fF`} />
    <Slider bind:value={ms} min={0} max={1000} step={1} label="Time since last refresh" format={(v) => `${v} ms`} />
  {/snippet}
  <Plot
    label="Read signal on the bitline against time since refresh"
    x={{ min: 0, max: 1000, label: 'time since refresh (ms)' }}
    y={{ min: Math.min(0, ...curve.map((p) => p[1])), max: Math.max(60, curve[0]![1] * 1.1), label: 'bitline signal (mV)' }}
    height={200}
    series={[{ points: curve, color: 'var(--series-1)', width: 2.5, fillTo: 0 }]}
    hlines={[{ at: SENSE * 1000, label: 'sense amplifier needs 30 mV', color: 'var(--bad)' }]}
    vlines={[{ at: 64, label: 'refresh every 64 ms' }]}
    markers={[{ x: ms, y: now * 1000, color: now >= SENSE ? 'var(--ok)' : 'var(--bad)' }]}
  />
  <dl class="nums ui">
    <div><dt>Signal now</dt><dd>{(now * 1000).toFixed(1)} mV {now >= SENSE ? '(reads as 1)' : '(lost)'}</dd></div>
    <div><dt>Charge-sharing ratio C<sub>s</sub>/(C<sub>s</sub>+C<sub>BL</sub>)</dt><dd>{(cs / (cs + cbl)).toFixed(3)}</dd></div>
    <div><dt>Longest safe time between refreshes</dt><dd>{limit > 0 ? `${limit.toFixed(0)} ms` : 'never readable'}</dd></div>
  </dl>
</Widget>

<style>
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

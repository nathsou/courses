<!--
  Dennard scaling and its end. Each generation shrinks every length by 0.7. Under Dennard's rules the voltage
  shrinks too, and power per area stays constant; once the voltage is stuck, power per area grows with every
  generation unless the clock stops rising. Below: why the voltage stuck: lowering the threshold raises leakage
  tenfold per subthreshold swing.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';

  let gens = $state(4);
  let rule = $state<'dennard' | 'stuck' | 'flat'>('dennard');
  let vt = $state(0.4);
  let swingMv = $state(80);

  const K = 1 / 0.7;
  function row(g: number, r: typeof rule) {
    const k = K ** g;
    const v = r === 'dennard' ? 1 / k : 1;
    const freq = r === 'flat' ? 1 : k;
    const cap = 1 / k;
    const p = cap * v * v * freq;
    const density = k * k;
    return { length: 1 / k, density, v, cap, freq, p, pd: p * density };
  }
  const now = $derived(row(gens, rule));
  const series = $derived(
    (['dennard', 'stuck', 'flat'] as const).map((r, i) => ({
      label: r === 'dennard' ? 'Dennard: voltage scales' : r === 'stuck' ? 'voltage fixed, clock keeps rising' : 'voltage and clock fixed',
      color: `var(--series-${i + 1})`,
      width: r === rule ? 3 : 1.5,
      points: Array.from({ length: 9 }, (_, g) => [g, row(g, r).pd] as [number, number]),
    })),
  );
  const leak = $derived(10 ** ((0.4 - vt) / (swingMv / 1000)));
  const fmt = (x: number) => (x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(2) : x.toFixed(3));
</script>

<Widget title="Scaling, and the power wall" subtitle="Every generation shrinks every dimension by 0.7, doubling the transistors per area. What happens to power depends on what happens to the voltage.">
  {#snippet controls()}
    <Slider bind:value={gens} min={0} max={8} step={1} label="Generations of scaling" format={(x) => `${x} (lengths × ${(0.7 ** x).toFixed(3)})`} />
    <Segmented bind:value={rule} label="Rule" size="sm" options={[{ value: 'dennard', label: 'Dennard' }, { value: 'stuck', label: 'V fixed' }, { value: 'flat', label: 'V and clock fixed' }]} />
  {/snippet}
  <div class="two">
    <table class="tbl ui">
      <thead><tr><th>Quantity, relative to the start</th><th>After {gens}</th></tr></thead>
      <tbody>
        <tr><td>Transistor length, width, oxide</td><td>{fmt(now.length)}</td></tr>
        <tr><td>Transistors per mm²</td><td>{fmt(now.density)}</td></tr>
        <tr><td>Supply voltage</td><td>{fmt(now.v)}</td></tr>
        <tr><td>Capacitance per transistor</td><td>{fmt(now.cap)}</td></tr>
        <tr><td>Clock frequency</td><td>{fmt(now.freq)}</td></tr>
        <tr><td>Power per transistor, C·V²·f</td><td>{fmt(now.p)}</td></tr>
        <tr class="hl"><td>Power per mm²</td><td>{fmt(now.pd)}</td></tr>
      </tbody>
    </table>
    <Plot
      label="Power per area against generations"
      x={{ min: 0, max: 8, label: 'generations' }}
      y={{ min: 0.5, max: 400, log: true, label: 'power per mm² (relative)' }}
      height={220}
      series={series}
      markers={[{ x: gens, y: now.pd, color: 'var(--ac)' }]}
    />
  </div>
  <h5 class="ui">Why the voltage stuck</h5>
  <div class="leak ui">
    <Slider bind:value={vt} min={0.1} max={0.5} step={0.01} label="Threshold voltage" format={(x) => `${x.toFixed(2)} V`} />
    <Slider bind:value={swingMv} min={60} max={100} step={1} label="Subthreshold swing" format={(x) => `${x} mV/decade`} />
    <p>Leakage per transistor, relative to a 0.40 V threshold: <strong class="num">× {leak >= 100 ? leak.toExponential(1).replace('e+', ' × 10^') : leak.toFixed(2)}</strong>.
      To keep a gate fast at a lower supply, its threshold must fall with it, and every {swingMv} mV less multiplies the off-current by ten.</p>
  </div>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .tbl {
    border-collapse: collapse;
    font-size: 0.82rem;
    width: 100%;
  }
  .tbl th,
  .tbl td {
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid var(--line);
    text-align: left;
  }
  .tbl td:last-child,
  .tbl th:last-child {
    text-align: right;
    font-family: var(--font-mono);
  }
  .tbl tr.hl td {
    font-weight: 700;
    background: var(--accent-soft);
  }
  h5 {
    margin: 1rem 0 0.4rem;
    font-size: 0.9rem;
  }
  .leak {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.5rem;
    align-items: flex-end;
    font-size: 0.84rem;
  }
  .leak p {
    flex: 1 1 18rem;
    margin: 0;
    color: var(--ink-2);
  }
</style>

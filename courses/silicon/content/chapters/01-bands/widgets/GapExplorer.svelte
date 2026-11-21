<!--
  The band gap and the Fermi–Dirac distribution: for each material and temperature, the probability that a
  state at energy E holds an electron (log scale, so the tail into the conduction band is visible), and the
  intrinsic carrier concentration n_i against temperature for every material.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { MATERIALS, Q, bandGap, intrinsic, kT, material, sci } from '$lib/physics/semiconductor';

  let id = $state('si');
  let T = $state(300);

  const MOB: Record<string, [number, number]> = { ge: [3900, 1900], si: [1414, 471], gaas: [8500, 400] };
  const COLORS: Record<string, string> = { ge: 'var(--series-4)', si: 'var(--series-1)', gaas: 'var(--series-5)', sio2: 'var(--series-3)' };

  const m = $derived(material(id));
  const eg = $derived(bandGap(m, T));
  const kt = $derived(kT(T));
  const ni = $derived(intrinsic(m, T));
  const edge = $derived(Math.exp(-eg / (2 * kt)));
  const rho = $derived(MOB[id] ? 1 / (Q * ni * (MOB[id]![0] + MOB[id]![1])) : Infinity);

  const fMin = $derived(Math.min(1e-12, edge / 1e4));
  const occupancy = $derived.by(() => {
    const pts: [number, number][] = [];
    const top = eg / 2 + 0.25 * Math.max(1, eg);
    for (let i = 0; i <= 240; i++) {
      const e = -top + (2 * top * i) / 240;
      const f = 1 / (1 + Math.exp(e / kt));
      pts.push([Math.max(f, fMin * 0.5), e]);
    }
    return pts;
  });
  const yr = $derived(eg / 2 + 0.25 * Math.max(1, eg));

  const curves = $derived(
    MATERIALS.map((mm) => ({
      label: mm.name.replace(' (an insulator)', ''),
      color: COLORS[mm.id]!,
      width: mm.id === id ? 3 : 1.5,
      points: Array.from({ length: 61 }, (_, i) => {
        const t = 100 + i * 10;
        return [t, intrinsic(mm, t)] as [number, number];
      }),
    })),
  );
</script>

<Widget title="The gap, and who crosses it" subtitle="Left: the chance that a state at energy E is occupied, on a logarithmic scale; the bands are shaded. Right: free electrons per cm³ in each pure material, against temperature.">
  {#snippet controls()}
    <Segmented bind:value={id} label="Material" options={MATERIALS.map((mm) => ({ value: mm.id, label: mm.name.split(' (')[0]! }))} />
    <Slider bind:value={T} min={100} max={700} step={5} label="Temperature" format={(v) => `${v.toFixed(0)} K`} />
  {/snippet}
  <div class="two">
    <div>
      <Plot
        label="Fermi–Dirac occupancy against energy for {m.name} at {T} K"
        x={{ min: fMin, max: 1.5, log: true, label: 'probability a state is occupied' }}
        y={{ min: -yr, max: yr, label: 'energy from mid-gap (eV)' }}
        series={[{ points: occupancy, color: 'var(--electron)', width: 2.5 }]}
        hlines={[{ at: eg / 2, label: 'conduction band edge', color: 'var(--electron)' }, { at: -eg / 2, label: 'valence band edge', color: 'var(--hole)' }]}
        markers={[{ x: Math.max(edge, fMin), y: eg / 2, color: 'var(--electron)' }]}
        height={260}
      >
        {#snippet overlay({ sy, w })}
          <rect x="54" y={sy(yr)} width={w} height={Math.max(0, sy(eg / 2) - sy(yr))} fill="var(--electron)" opacity="0.08" />
          <rect x="54" y={sy(-eg / 2)} width={w} height={Math.max(0, sy(-yr) - sy(-eg / 2))} fill="var(--hole)" opacity="0.08" />
        {/snippet}
      </Plot>
    </div>
    <div>
      <Plot
        label="Intrinsic carrier concentration against temperature"
        x={{ min: 100, max: 700, label: 'temperature (K)' }}
        y={{ min: 1e-60, max: 1e20, log: true, label: 'free electrons per cm³', ticks: [1e-60, 1e-50, 1e-40, 1e-30, 1e-20, 1e-10, 1, 1e10, 1e20] }}
        series={curves}
        markers={[{ x: T, y: ni, color: COLORS[id]! }]}
        vlines={[{ at: 300, label: 'room temperature' }]}
        height={260}
      />
    </div>
  </div>
  <dl class="nums ui">
    <div><dt>Band gap</dt><dd>{eg.toFixed(3)} eV</dd></div>
    <div><dt>kT</dt><dd>{(kt * 1000).toFixed(1)} meV</dd></div>
    <div><dt>Gap in units of kT</dt><dd>{(eg / kt).toFixed(1)}</dd></div>
    <div><dt>Occupancy at the band edge, e<sup>−E<sub>g</sub>/2kT</sup></dt><dd>{sci(edge)}</dd></div>
    <div><dt>Free electrons, n<sub>i</sub></dt><dd>{sci(ni)} per cm³</dd></div>
    <div><dt>Resistivity when pure</dt><dd>{Number.isFinite(rho) ? `${sci(rho)} Ω·cm` : 'an insulator'}</dd></div>
  </dl>
  <p class="note ui">{m.note}</p>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
    gap: 1rem;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.8rem 0 0;
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
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
</style>

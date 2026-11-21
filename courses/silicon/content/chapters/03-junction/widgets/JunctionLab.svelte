<!--
  An abrupt p–n junction in the depletion approximation: fixed charge, electric field and the energy bands
  across it, for chosen doping on each side and an applied voltage (forward positive, p side positive).
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { EPS_SI, NI_SI, kT, sci } from '$lib/physics/semiconductor';
  import { depletion, junctionAt } from '$lib/physics/devices';

  let { na0 = 1e16, nd0 = 1e16, v0 = 0 }: { na0?: number; nd0?: number; v0?: number } = $props();
  let na = $state(untrack(() => na0));
  let nd = $state(untrack(() => nd0));
  let v = $state(untrack(() => v0));

  const d = $derived(depletion(na, nd, v));
  const vmax = $derived(Math.floor((d.vbi - 0.05) * 100) / 100);
  $effect(() => {
    if (v > vmax) v = vmax;
  });
  // A fixed window: wide enough for the zero-bias region at the widest setting shown.
  const half = $derived(Math.max(d.xp, d.xn, depletion(na, nd, 0).xp, depletion(na, nd, 0).xn) * 1.6);
  const xs = $derived(Array.from({ length: 241 }, (_, i) => -half + (2 * half * i) / 240));
  const um = (cm: number) => cm * 1e4;
  const prof = $derived(xs.map((x) => ({ x: um(x), ...junctionAt(na, nd, v, x) })));

  const ut = kT(300);
  // Energies (eV) relative to the p side's Fermi level.
  const ecP = $derived(ut * Math.log(na / NI_SI) + 0.56);
  const bands = $derived(prof.map((p) => ({ x: p.x, ec: ecP - p.phi, ev: ecP - p.phi - 1.12 })));
  const rhoMax = $derived(Math.max(na, nd));
</script>

<Widget title="Inside a p–n junction" subtitle="p-type silicon on the left, n-type on the right, joined at x = 0. Top: the fixed charge of uncovered ions (− acceptors, + donors); middle: the field; bottom: the bands. Set the doping of each side and the voltage across the junction (positive: forward bias).">
  {#snippet controls()}
    <Slider bind:value={na} min={1e14} max={1e19} log label="Acceptors (p side), per cm³" format={(x) => sci(x)} />
    <Slider bind:value={nd} min={1e14} max={1e19} log label="Donors (n side), per cm³" format={(x) => sci(x)} />
    <Slider bind:value={v} min={-5} max={vmax} step={0.01} label="Applied voltage" format={(x) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2)} V`} />
  {/snippet}
  <div class="stack">
    <Plot
      label="Fixed charge density across the junction"
      height={130}
      x={{ min: um(-half), max: um(half), label: '' }}
      y={{ min: -rhoMax * 1.15, max: rhoMax * 1.15, label: 'charge', ticks: [-rhoMax, 0, rhoMax], format: (y) => (y === 0 ? '0' : `${y < 0 ? '−' : '+'}${sci(Math.abs(y), 1)}`) }}
      left={66}
      series={[{ points: prof.map((p) => [p.x, p.rho] as [number, number]), color: 'var(--ac)', fillTo: 0, opacity: 0.3 }]}
      hlines={[{ at: 0, dash: '0' }]}
      vlines={[{ at: 0, label: 'junction' }]}
    >
      {#snippet overlay({ sx, sy })}
        <text x={sx(um(-d.xp / 2))} y={sy(-na / 2) + 5} text-anchor="middle" class="sign">−</text>
        <text x={sx(um(d.xn / 2))} y={sy(nd / 2) + 5} text-anchor="middle" class="sign">+</text>
      {/snippet}
    </Plot>
    <Plot
      label="Electric field across the junction"
      height={130}
      x={{ min: um(-half), max: um(half), label: '' }}
      y={{ min: 0, max: d.emax * 1.15 || 1, label: 'field', ticks: [0, d.emax], format: (y) => (y === 0 ? '0' : sci(y, 2)) }}
      left={66}
      series={[{ points: prof.map((p) => [p.x, p.e] as [number, number]), color: 'var(--series-5)', fillTo: 0 }]}
      vlines={[{ at: 0 }]}
    />
    <Plot
      label="Energy bands across the junction"
      height={190}
      left={66}
      x={{ min: um(-half), max: um(half), label: 'position (µm); p side left, n side right' }}
      y={{ min: Math.min(...bands.map((b) => b.ev)) - 0.2, max: Math.max(...bands.map((b) => b.ec)) + 0.2, label: 'energy (eV)' }}
      series={[
        { points: bands.map((b) => [b.x, b.ec] as [number, number]), color: 'var(--electron)', label: 'conduction band edge' },
        { points: bands.map((b) => [b.x, b.ev] as [number, number]), color: 'var(--hole)', label: 'valence band edge' },
        { points: [[um(-half), 0], [um(-d.xp), 0]], color: 'var(--ac)', dash: '6 4', label: 'Fermi level (each side)' },
        { points: [[um(d.xn), v], [um(half), v]], color: 'var(--ac)', dash: '6 4' },
      ]}
      vlines={[{ at: 0 }]}
    />
  </div>
  <dl class="nums ui">
    <div><dt>Built-in potential V<sub>bi</sub></dt><dd>{d.vbi.toFixed(3)} V</dd></div>
    <div><dt>Barrier, V<sub>bi</sub> − V</dt><dd>{(d.vbi - v).toFixed(3)} V</dd></div>
    <div><dt>Depletion width</dt><dd>{um(d.w) < 0.1 ? `${(um(d.w) * 1000).toFixed(1)} nm` : `${um(d.w).toFixed(3)} µm`}</dd></div>
    <div><dt>…on the p side / n side</dt><dd>{((d.xp / d.w) * 100).toFixed(0)} % / {((d.xn / d.w) * 100).toFixed(0)} %</dd></div>
    <div><dt>Peak field</dt><dd>{sci(d.emax)} V/cm</dd></div>
    <div><dt>Capacitance per µm²</dt><dd>{((EPS_SI / d.w) * 1e-8 * 1e15).toFixed(2)} fF</dd></div>
  </dl>
</Widget>

<style>
  .stack {
    display: grid;
    gap: 0.3rem;
  }
  .sign {
    font-size: 16px;
    font-weight: 700;
    fill: var(--ink);
    font-family: var(--font-ui);
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

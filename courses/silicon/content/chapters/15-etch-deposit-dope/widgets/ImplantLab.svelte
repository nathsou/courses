<!--
  Ion implantation: a beam of dopant ions of chosen energy and dose stops at a spread of depths around the
  projected range (approximately Gaussian, from LSS-theory tables). An anneal repairs the crystal, activates the
  dopant and lets it diffuse. Where the implanted dopant falls to the background doping is the junction.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { implantProfile, implantRange, junctionDepth } from '$lib/fab/fab';
  import { sci } from '$lib/physics/semiconductor';

  let ion = $state<'B' | 'P' | 'As'>('As');
  let keV = $state(30);
  let dose = $state(3e15);
  let background = $state(1e17);
  let doAnneal = $state(false);
  let tC = $state(1000);
  let seconds = $state(10);

  const range = $derived(implantRange(ion, keV));
  const asImplanted = $derived(implantProfile(ion, keV, dose));
  const annealed = $derived(implantProfile(ion, keV, dose, { tC, seconds }));
  const maxDepth = $derived(Math.max(100, (range.rp + 5 * range.drp) * (doAnneal ? 1.8 : 1.3)));
  const pts = (f: (x: number) => number) => Array.from({ length: 301 }, (_, i) => [(i / 300) * maxDepth, Math.max(1e14, f((i / 300) * maxDepth))] as [number, number]);
  const xj0 = $derived(junctionDepth(asImplanted, background, 3000));
  const xj1 = $derived(junctionDepth(annealed, background, 3000));
</script>

<Widget title="Implanting dopants" subtitle="Ions accelerated to a chosen energy hit the wafer and stop at a spread of depths. The peak sits at the projected range; lighter ions go deeper. The silicon below was doped the other way: the junction is where the two meet.">
  {#snippet controls()}
    <Segmented bind:value={ion} label="Ion" options={[{ value: 'B', label: 'Boron (p)' }, { value: 'P', label: 'Phosphorus (n)' }, { value: 'As', label: 'Arsenic (n)' }]} />
    <Slider bind:value={keV} min={10} max={100} step={1} label="Energy" format={(v) => `${v} keV`} />
    <Slider bind:value={dose} min={1e12} max={1e16} log label="Dose" format={(v) => `${sci(v)} per cm²`} />
    <Slider bind:value={background} min={1e15} max={1e18} log label="Background doping" format={(v) => `${sci(v)} per cm³`} />
    <Toggle bind:checked={doAnneal} label="Anneal" />
    {#if doAnneal}
      <Slider bind:value={tC} min={800} max={1100} step={10} label="Anneal temperature" format={(v) => `${v} °C`} />
      <Slider bind:value={seconds} min={1} max={3600} log label="Anneal time" format={(v) => (v < 120 ? `${v.toFixed(0)} s` : `${(v / 60).toFixed(0)} min`)} />
    {/if}
  {/snippet}
  <Plot
    label="Dopant concentration against depth"
    x={{ min: 0, max: maxDepth, label: 'depth below the surface (nm)' }}
    y={{ min: 1e14, max: 1e22, log: true, label: 'concentration (per cm³)' }}
    height={250}
    series={[
      { points: pts(asImplanted), color: 'var(--series-1)', width: 2.5, label: 'as implanted', dash: doAnneal ? '5 4' : undefined },
      ...(doAnneal ? [{ points: pts(annealed), color: 'var(--series-2)', width: 2.5, label: 'after the anneal' }] : []),
    ]}
    hlines={[{ at: background, label: 'background doping', color: 'var(--ink-2)' }]}
    vlines={[{ at: range.rp, label: 'R_p', color: 'var(--ac)' }]}
  />
  <dl class="nums ui">
    <div><dt>Projected range R<sub>p</sub></dt><dd>{range.rp.toFixed(1)} nm</dd></div>
    <div><dt>Straggle ΔR<sub>p</sub></dt><dd>{range.drp.toFixed(1)} nm</dd></div>
    <div><dt>Peak concentration</dt><dd>{sci(asImplanted(range.rp))} per cm³</dd></div>
    <div><dt>Junction depth{doAnneal ? ' (annealed)' : ''}</dt><dd>{(doAnneal ? xj1 : xj0) !== null ? `${(doAnneal ? xj1 : xj0)!.toFixed(0)} nm` : 'none: the implant never exceeds the background'}</dd></div>
  </dl>
</Widget>

<style>
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.4rem 0 0;
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

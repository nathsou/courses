<!--
  The MOS capacitor on p-type silicon: gate voltage, substrate doping, oxide thickness and gate material.
  Left: a cross-section with accumulated holes, the depletion region and the inversion layer of electrons.
  Right: electrons per cm² at the surface against gate voltage (log scale), solved exactly from Poisson's
  equation: exponential below threshold, linear above.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { Q, sci } from '$lib/physics/semiconductor';
  import { GATES, mosState, mosStatic, type GateMaterial } from '$lib/physics/devices';

  let vg = $state(0.5);
  let na = $state(3e17);
  let toxNm = $state(3);
  let gate = $state<GateMaterial>('midgap');

  const p = $derived({ na, tox: toxNm * 1e-7, gate });
  const s = $derived(mosStatic(p));
  const st = $derived(mosState(p, vg));
  const lo = $derived(Math.min(-1.5, s.vfb - 0.5));
  const hi = $derived(Math.max(2.5, s.vt + 1.2));
  $effect(() => {
    if (vg < lo) vg = lo;
    if (vg > hi) vg = hi;
  });
  const curve = $derived(
    Array.from({ length: 161 }, (_, i) => {
      const v = lo + ((hi - lo) * i) / 160;
      return [v, Math.max(1, -mosState(p, v).qinv / Q)] as [number, number];
    }),
  );
  const ninv = $derived(-st.qinv / Q);
  const holes = $derived(st.psi < 0 ? st.qs / Q : 0);

  // Cross-section geometry: depletion depth drawn on a scale where 0.3 µm fills the silicon.
  const SI_H = 150;
  const depPx = $derived(Math.min(SI_H - 6, (st.w / 0.3e-4) * SI_H));
  const invAlpha = $derived(Math.min(1, Math.log10(Math.max(1, ninv)) / 13));
  const accAlpha = $derived(Math.min(1, Math.log10(Math.max(1, holes)) / 13));
</script>

<Widget title="The MOS capacitor" subtitle="A gate, a thin layer of oxide and p-type silicon. Drag the gate voltage from negative to positive and watch the charge in the silicon change character.">
  {#snippet controls()}
    <Slider bind:value={vg} min={lo} max={hi} step={0.01} label="Gate voltage" format={(x) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2)} V`} />
    <Slider bind:value={na} min={1e15} max={3e18} log label="Substrate acceptors, per cm³" format={(x) => sci(x)} />
    <Slider bind:value={toxNm} min={1} max={20} step={0.1} label="Oxide thickness" format={(x) => `${x.toFixed(1)} nm`} />
    <Segmented bind:value={gate} label="Gate material" size="sm" options={[{ value: 'n+poly', label: 'n⁺ poly' }, { value: 'midgap', label: 'mid-gap metal' }, { value: 'p+poly', label: 'p⁺ poly' }]} />
  {/snippet}
  <div class="two">
    <svg viewBox="0 0 220 230" class="xs" role="img" aria-label="Cross-section: {st.regime}; depletion width {(st.w * 1e7).toFixed(0)} nm; {sci(ninv)} electrons per square centimetre at the surface">
      <rect x="20" y="10" width="180" height="34" class="gate" />
      <text x="110" y="32" class="lbl">gate ({vg >= 0 ? '+' : '−'}{Math.abs(vg).toFixed(2)} V)</text>
      <rect x="20" y="44" width="180" height={6 + toxNm * 1.2} class="ox" />
      <g transform="translate(0 {50 + toxNm * 1.2})">
        <rect x="20" y="0" width="180" height={SI_H} class="psi" />
        {#if depPx > 0}<rect x="20" y="0" width="180" height={depPx} class="dep" />{/if}
        {#if holes > 1}<rect x="20" y="0" width="180" height="7" class="acc" style:opacity={accAlpha} />{/if}
        {#if ninv > 1}<rect x="20" y="0" width="180" height="5" class="inv" style:opacity={invAlpha} />{/if}
        {#each Array.from({ length: 48 }) as _, i (i)}
          {@const y = 10 + Math.floor(i / 6) * 14}
          {#if y + 3 < depPx}<text x={34 + (i % 6) * 29 + (Math.floor(i / 6) % 2) * 14} y={y + 4} class="ion">−</text>{/if}
        {/each}
        <text x="196" y={SI_H - 6} class="lbl r">p-type silicon</text>
        {#if depPx > 8 && depPx + 14 < SI_H - 20}<text x="196" y={depPx + 13} class="lbl r dim">↑ depletion region</text>{/if}
      </g>
    </svg>
    <div>
      <Plot
        label="Electrons per square centimetre at the surface against gate voltage"
        x={{ min: lo, max: hi, label: 'gate voltage (V)' }}
        y={{ min: 1, max: 1e14, log: true, label: 'electrons per cm² (inversion)' }}
        series={[{ points: curve, color: 'var(--electron)', width: 2.5 }]}
        markers={[{ x: vg, y: Math.max(1, ninv), color: 'var(--ac)' }]}
        vlines={[{ at: s.vt, label: 'V_T', color: 'var(--ac)' }, { at: s.vfb, label: 'flat band' }]}
        height={230}
      />
    </div>
  </div>
  <p class="regime ui"><strong>{st.regime[0]!.toUpperCase() + st.regime.slice(1)}.</strong>
    {#if st.regime === 'accumulation'}The gate is negative: it pulls extra holes to the surface.
    {:else if st.regime === 'depletion'}The gate pushes holes away from the surface, leaving fixed negative acceptor ions.
    {:else if st.regime === 'weak inversion'}Electrons are gathering at the surface, but fewer than the ions: their number grows exponentially with the gate voltage.
    {:else}A layer of electrons, an n-type channel, lines the surface; each extra volt on the gate adds C<sub>ox</sub> × 1 V of electrons to it.{/if}
  </p>
  <dl class="nums ui">
    <div><dt>C<sub>ox</sub></dt><dd>{((s.cox * 1e15) / 1e8).toFixed(1)} fF/µm²</dd></div>
    <div><dt>Flat-band voltage</dt><dd>{s.vfb.toFixed(2)} V</dd></div>
    <div><dt>Threshold voltage V<sub>T</sub></dt><dd>{s.vt.toFixed(2)} V</dd></div>
    <div><dt>Band bending ψ<sub>s</sub> (2φ<sub>F</sub> = {(2 * s.phiF).toFixed(2)})</dt><dd>{st.psi.toFixed(3)} V</dd></div>
    <div><dt>Depletion width</dt><dd>{(st.w * 1e7).toFixed(0)} nm</dd></div>
    <div><dt>Inversion electrons</dt><dd>{sci(ninv)} per cm²</dd></div>
  </dl>
  <p class="note ui">Gate: {GATES[gate]}. An ideal oxide with no trapped charge.</p>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.4fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 620px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
    .xs {
      max-width: 16rem;
      margin: 0 auto;
    }
  }
  .xs {
    width: 100%;
    height: auto;
    font-family: var(--font-ui);
  }
  .gate {
    fill: var(--m-metal);
  }
  .ox {
    fill: var(--m-oxide);
    stroke: var(--m-oxide-edge);
  }
  .psi {
    fill: var(--m-p);
  }
  .dep {
    fill: var(--surface);
    opacity: 0.7;
    stroke: var(--ink-3);
    stroke-dasharray: 3 2;
  }
  .acc {
    fill: var(--hole);
  }
  .inv {
    fill: var(--electron);
  }
  .ion {
    font-size: 11px;
    fill: var(--ink-2);
    font-weight: 700;
  }
  .lbl {
    font-size: 10px;
    fill: var(--ink);
    text-anchor: middle;
    font-weight: 600;
  }
  .lbl.r {
    text-anchor: end;
  }
  .lbl.dim {
    fill: var(--ink-2);
    font-weight: 400;
  }
  .regime {
    margin: 0.5rem 0 0;
    font-size: 0.86rem;
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

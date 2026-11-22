<!--
  Dope a piece of silicon: donor and acceptor concentrations (log sliders) and temperature give the electron
  and hole concentrations (charge neutrality and the mass-action law), the Fermi level's place in the gap, and
  the resistivity (with doping-dependent mobilities).
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { SI_ATOMS, Q, bandGap, carriers, intrinsic, kT, material, mobility, sci } from '$lib/physics/semiconductor';

  let { donors = 1e16, acceptors = 1e10, temperature = 300 }: { donors?: number; acceptors?: number; temperature?: number } = $props();
  let nd = $state(untrack(() => donors));
  let na = $state(untrack(() => acceptors));
  let T = $state(untrack(() => temperature));

  const si = material('si');
  const ni = $derived(intrinsic(si, T));
  const c = $derived(carriers(nd, na, T, ni));
  const eg = $derived(bandGap(si, T));
  const ef = $derived(kT(T) * Math.log(c.n / ni));
  const mun = $derived(mobility('n', nd + na));
  const mup = $derived(mobility('p', nd + na));
  const sigma = $derived(Q * (c.n * mun + c.p * mup));
  const rho = $derived(1 / sigma);
  const type = $derived(c.n > 10 * c.p ? 'n-type' : c.p > 10 * c.n ? 'p-type' : 'nearly intrinsic');
  const net = $derived(Math.abs(nd - na));

  // Bars on a log scale from 1 to 10²¹ per cm³.
  const pos = (v: number) => Math.max(0, Math.min(100, (Math.log10(Math.max(v, 1)) / 21) * 100));
  // Band diagram: energy from Ev (bottom) to Ec (top).
  const H = 150;
  const ey = (e: number) => 14 + ((eg / 2 - Math.max(-eg / 2 + 0.01, Math.min(eg / 2 - 0.01, e))) / eg) * (H - 28);
  const degenerate = $derived(Math.abs(ef) > eg / 2 - 3 * kT(T));
  const fmtN = (v: number) => (v <= 1e10 + 1 ? 'none' : sci(v));
</script>

<Widget title="Doping silicon" subtitle="Add donors (phosphorus) and acceptors (boron). The sliders are logarithmic: each notch to the right is ten times more.">
  {#snippet controls()}
    <Slider bind:value={nd} min={1e10} max={1e20} log label="Donors, per cm³" format={fmtN} />
    <Slider bind:value={na} min={1e10} max={1e20} log label="Acceptors, per cm³" format={fmtN} />
    <Slider bind:value={T} min={200} max={700} step={5} label="Temperature" format={(v) => `${v.toFixed(0)} K`} />
  {/snippet}
  <div class="grid">
    <div class="bars ui" role="img" aria-label="Electrons {sci(c.n)}, holes {sci(c.p)} per cubic centimetre">
      {#each [{ k: 'Electrons, n', v: c.n, cls: 'e' }, { k: 'Holes, p', v: c.p, cls: 'h' }, { k: 'n_i (pure silicon)', v: ni, cls: 'i' }] as b (b.k)}
        <div class="row">
          <span class="k">{b.k}</span>
          <span class="track">
            {#each [0, 5, 10, 15, 20] as g (g)}<span class="g" style:left="{(g / 21) * 100}%"></span>{/each}
            <span class="bar {b.cls}" style:width="{pos(b.v)}%"></span>
          </span>
          <span class="v num">{sci(b.v)}</span>
        </div>
      {/each}
      <div class="scale"><span>1</span><span>10⁵</span><span>10¹⁰</span><span>10¹⁵</span><span>10²⁰ per cm³</span></div>
      <p class="np">n × p = {sci(c.n * c.p)} = n<sub>i</sub>² {Math.abs(c.n * c.p / (ni * ni) - 1) < 1e-6 ? '✓' : ''}</p>
    </div>
    <svg class="band" viewBox="0 0 200 {H}" role="img" aria-label="Band diagram: the Fermi level is {ef >= 0 ? `${ef.toFixed(2)} eV above` : `${(-ef).toFixed(2)} eV below`} mid-gap">
      <rect class="cb" x="20" y="0" width="170" height="14" />
      <rect class="vb" x="20" y={H - 14} width="170" height="14" />
      <line class="edge" x1="20" x2="190" y1="14" y2="14" />
      <line class="edge" x1="20" x2="190" y1={H - 14} y2={H - 14} />
      <line class="ei" x1="20" x2="190" y1={ey(0)} y2={ey(0)} />
      <line class="ef" x1="20" x2="190" y1={ey(ef)} y2={ey(ef)} />
      <text x="24" y="11">conduction band</text>
      <text x="24" y={H - 3}>valence band</text>
      <text x="186" y={ey(0) - 4} class="r">mid-gap, E<tspan dy="2" font-size="8">i</tspan></text>
      <text x="186" y={ey(ef) + (ef > 0 ? 12 : -5)} class="r f">Fermi level, E<tspan dy="2" font-size="8">F</tspan></text>
    </svg>
  </div>
  <dl class="nums ui">
    <div><dt>Type</dt><dd>{type}</dd></div>
    <div><dt>Dopant atoms</dt><dd>{net > 0 && nd + na > 2e10 ? `1 in ${sci(SI_ATOMS / (nd + na))} atoms` : 'none'}</dd></div>
    <div><dt>E<sub>F</sub> − E<sub>i</sub></dt><dd>{ef >= 0 ? '+' : '−'}{Math.abs(ef).toFixed(3)} eV</dd></div>
    <div><dt>Mobilities μ<sub>n</sub>, μ<sub>p</sub></dt><dd>{mun.toFixed(0)}, {mup.toFixed(0)} cm²/V·s</dd></div>
    <div><dt>Resistivity</dt><dd>{sci(rho, 3)} Ω·cm</dd></div>
  </dl>
  {#if degenerate}
    <p class="warn ui">So heavily doped that the Fermi level is within a few kT of a band edge: the silicon is <em>degenerate</em> and behaves almost like a metal. The simple formulas used here lose accuracy there.</p>
  {/if}
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: 1.2rem;
    align-items: center;
  }
  @media (max-width: 620px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .band {
      max-width: 18rem;
    }
  }
  .bars {
    display: grid;
    gap: 0.45rem;
    font-size: 0.8rem;
  }
  .row {
    display: grid;
    grid-template-columns: 7.2rem 1fr 5.6rem;
    gap: 0.5rem;
    align-items: center;
  }
  .track {
    position: relative;
    height: 0.95rem;
    background: var(--surface-2);
    border-radius: 2px;
  }
  .g {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--line-strong);
  }
  .bar {
    position: absolute;
    left: 0;
    top: 0.12rem;
    bottom: 0.12rem;
    border-radius: 2px;
    transition: width 150ms;
  }
  .bar.e {
    background: var(--electron);
  }
  .bar.h {
    background: var(--hole);
  }
  .bar.i {
    background: var(--ink-3);
  }
  .v {
    font-family: var(--font-mono);
    text-align: right;
  }
  .scale {
    display: flex;
    justify-content: space-between;
    margin-left: 7.7rem;
    margin-right: 6.1rem;
    font-size: 0.68rem;
    color: var(--ink-3);
  }
  .np {
    margin: 0.2rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .band {
    width: 100%;
    height: auto;
    font-family: var(--font-ui);
    font-size: 9px;
  }
  .band text {
    fill: var(--ink-2);
  }
  .band .r {
    text-anchor: end;
  }
  .band .f {
    fill: var(--ac);
    font-weight: 700;
  }
  .cb {
    fill: var(--electron);
    opacity: 0.15;
  }
  .vb {
    fill: var(--hole);
    opacity: 0.15;
  }
  .edge {
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }
  .ei {
    stroke: var(--ink-3);
    stroke-dasharray: 3 3;
  }
  .ef {
    stroke: var(--ac);
    stroke-width: 2.5;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.8rem 0 0;
    font-size: 0.82rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .warn {
    margin: 0.6rem 0 0;
    font-size: 0.8rem;
    color: var(--maybe);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
</style>

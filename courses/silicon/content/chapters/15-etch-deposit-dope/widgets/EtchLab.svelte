<!--
  Etching a film through a resist mask, in cross-section. Isotropy sets how fast the etch eats sideways compared
  with downwards: a wet chemical etch is isotropic, a plasma (reactive-ion) etch close to anisotropic. Selectivity
  sets how slowly the mask and the layer underneath are eaten compared with the film.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { etch } from '$lib/fab/fab';

  const FILM = 200;
  const OPENING = 120;
  const MASK = 120;
  let kind = $state<'wet' | 'plasma' | 'custom'>('plasma');
  let iso = $state(0.05);
  let progressPct = $state(130);
  let maskSel = $state(4);
  let stopSel = $state(20);
  $effect(() => {
    if (kind === 'wet') iso = 1;
    else if (kind === 'plasma') iso = 0.05;
  });
  const t = $derived((progressPct / 100) * FILM);
  const r = $derived(etch(OPENING, FILM, 1, iso, t, maskSel, stopSel));

  const W = 600;
  const SC = 1;
  const X0 = 300;
  const Y0 = 160; // top of the film
  const xs = Array.from({ length: 301 }, (_, i) => -300 + i * 2);
  const profile = $derived(xs.map((x) => [X0 + x * SC, Y0 + r.depthAt(x) * SC] as [number, number]));
  const maskThick = $derived(Math.max(0, MASK - r.maskLoss));
  const stopDip = $derived(r.stopLoss);
</script>

<Widget title="Etching through a mask" subtitle="A 200 nm film (glass) on silicon, under a resist mask with a 120 nm opening. Run the etch past the moment the film clears (100 %) to see over-etching.">
  {#snippet controls()}
    <Segmented bind:value={kind} label="Etch" size="sm" options={[{ value: 'wet', label: 'Wet (isotropic)' }, { value: 'plasma', label: 'Plasma (directional)' }, { value: 'custom', label: 'Custom' }]} />
    {#if kind === 'custom'}<Slider bind:value={iso} min={0} max={1} step={0.01} label="Sideways ÷ downwards rate" format={(v) => v.toFixed(2)} />{/if}
    <Slider bind:value={progressPct} min={0} max={200} step={1} label="Etch time" format={(v) => `${v} % of the time to clear`} />
    <Slider bind:value={maskSel} min={1} max={20} step={0.5} label="Selectivity to the mask" format={(v) => `${v} : 1`} />
    <Slider bind:value={stopSel} min={2} max={100} step={1} label="Selectivity to the silicon below" format={(v) => `${v} : 1`} />
  {/snippet}
  <svg viewBox="0 24 {W} 376" class="xs" role="img" aria-label="Etch profile: undercut {r.undercut.toFixed(0)} nm; film {r.cleared ? 'cleared' : 'not yet cleared'}">
    <rect x="0" y={Y0 + FILM} width={W} height={400 - Y0 - FILM} class="si" />
    {#if stopDip > 0}<rect x={X0 - OPENING / 2} y={Y0 + FILM} width={OPENING} height={Math.min(60, stopDip)} class="hole" />{/if}
    <rect x="0" y={Y0} width={W} height={FILM} class="ox" />
    <path d="M{profile[0]![0]},{Y0} {profile.map(([x, y]) => `L${x},${y}`).join(' ')} L{profile.at(-1)![0]},{Y0} Z" class="hole" />
    <rect x="0" y={Y0 - maskThick} width={X0 - OPENING / 2} height={maskThick} class="resist" />
    <rect x={X0 + OPENING / 2} y={Y0 - maskThick} width={W - X0 - OPENING / 2} height={maskThick} class="resist" />
    <text x="10" y={Y0 - maskThick - 6} class="t">resist mask</text>
    <text x="10" y={Y0 + 20} class="t">film (silicon dioxide)</text>
    <text x="10" y={Y0 + FILM + 22} class="t">silicon</text>
    {#if r.undercut > 4}
      <line x1={X0 + OPENING / 2} x2={X0 + OPENING / 2 + Math.min(r.undercut, 240)} y1={Y0 + 6} y2={Y0 + 6} class="dim" />
      <text x={X0 + OPENING / 2 + 4} y={Y0 + 20} class="t">undercut</text>
    {/if}
  </svg>
  <dl class="nums ui">
    <div><dt>Undercut below the mask edge</dt><dd>{r.undercut.toFixed(0)} nm</dd></div>
    <div><dt>Opening at the bottom</dt><dd>{r.cleared ? `${(OPENING + 2 * Math.max(0, Math.sqrt(Math.max(0, 1 - (FILM / Math.max(t, 1e-9)) ** 2)) * iso * t)).toFixed(0)} nm` : 'not yet open'}</dd></div>
    <div><dt>Resist left</dt><dd>{maskThick.toFixed(0)} of {MASK} nm</dd></div>
    <div><dt>Silicon lost below</dt><dd>{stopDip.toFixed(1)} nm</dd></div>
  </dl>
</Widget>

<style>
  .xs {
    width: 100%;
    max-width: 34rem;
    height: auto;
    display: block;
    margin: 0 auto;
    font-family: var(--font-ui);
  }
  .si {
    fill: var(--m-si);
  }
  .ox {
    fill: var(--m-oxide);
    stroke: var(--m-oxide-edge);
  }
  .hole {
    fill: var(--chart-surface);
  }
  .resist {
    fill: var(--m-resist);
  }
  .dim {
    stroke: var(--bad);
    stroke-width: 2;
  }
  .t {
    font-size: 13px;
    fill: var(--ink-2);
  }
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

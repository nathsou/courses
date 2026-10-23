<!--
  The circle of fifths: the twelve major keys around the outside, their relative minors inside. Choose a key
  to see its signature, its scale and its neighbours (one sharp or flat apart). With `chords`, the chosen
  key's three main chords (I, IV, V) light up: they are the key and its two neighbours.
-->
<script lang="ts">
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { keyFromFifths, keyScale } from '$lib/music/scale';
  import { audio } from '$lib/audio/engine.svelte';
  import { midi } from '$lib/music/pitch';
  import Score from '$lib/notation/Score.svelte';
  import { keyText } from '$lib/notation/write';
  import Widget from '$lib/components/ui/Widget.svelte';

  let { minor = true, chords = false, start = 0 }: { minor?: boolean; chords?: boolean; start?: number } = $props();

  // Positions clockwise from the top: C, G, D, A, E, B, F♯/G♭, D♭, A♭, E♭, B♭, F.
  const RING = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1];
  let sel = $state(0);
  $effect.pre(() => {
    sel = start;
  });
  const R = 130;
  const r = 86;
  const pos = (i: number, rad: number): [number, number] => {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    return [150 + rad * Math.cos(a), 150 + rad * Math.sin(a)];
  };
  const major = (f: number) => keyFromFifths(f, 'major');
  const minorOf = (f: number) => keyFromFifths(f, 'minor');
  const nm = (k: { tonic: { letter: string; alter: number } }) => noteName(k.tonic as never, settings.nameOptions);
  const signature = (f: number) => (f === 0 ? 'no sharps or flats' : `${Math.abs(f)} ${f > 0 ? (f === 1 ? 'sharp' : 'sharps') : f === -1 ? 'flat' : 'flats'}`);
  const selIndex = $derived(RING.indexOf(sel));
  const isNear = (f: number) => [1, 11].includes((RING.indexOf(f) - selIndex + 12) % 12);
  const k = $derived(major(sel));
  const tonicName = $derived(`${k.tonic.letter}${k.tonic.alter > 0 ? '#' : k.tonic.alter < 0 ? 'b' : ''}`);
  const src = $derived(`${keyText(tonicName, 'major')} \\hidetime \\time 8/4 ${keyScale(k).map((p) => p.letter.toLowerCase() + (p.alter > 0 ? '#' : p.alter < 0 ? 'b' : '') + (p.octave === 4 ? "'" : "''") + '4').join(' ')} ${k.tonic.letter.toLowerCase()}${k.tonic.alter > 0 ? '#' : k.tonic.alter < 0 ? 'b' : ''}''4 |`);
  function choose(f: number) {
    sel = f;
    const notes = keyScale(major(f)).map((p) => midi(p));
    audio.playSequence([notes[0]!, notes[2]!, notes[4]!].map((m) => ({ midi: m, time: 0, duration: 0.9, velocity: 70 })));
  }
</script>

<Widget title="The circle of fifths" subtitle="Each step clockwise is a fifth higher and adds a sharp (or removes a flat). Choose a key.">
  <div class="cof ui">
    <svg viewBox="0 0 300 300" role="group" aria-label="Circle of fifths">
      <circle cx="150" cy="150" r={R + 18} class="ring" />
      {#if minor}<circle cx="150" cy="150" r={r - 18} class="ring inner" />{/if}
      {#each RING as f, i (f)}
        {@const [x, y] = pos(i, R)}
        {@const [xi, yi] = pos(i, r)}
        <g class="key" class:sel={f === sel} class:near={chords && isNear(f)} role="button" tabindex="0" aria-label="{nm(major(f))} major, {signature(f)}" aria-pressed={f === sel} onclick={() => choose(f)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose(f))}>
          <circle cx={x} cy={y} r="19" />
          <text {x} y={y + 5} class="maj">{nm(major(f))}</text>
          {#if minor}<text x={xi} y={yi + 4} class="min">{nm(minorOf(f))}m</text>{/if}
        </g>
      {/each}
      <text x="150" y="146" class="centre">{nm(k)} major</text>
      <text x="150" y="164" class="centre sub">{signature(sel)}</text>
    </svg>
    <div class="side">
      <Score {src} label="{nm(k)} major scale with its key signature" />
      <p>
        <strong>{nm(k)} major</strong>: {signature(sel)}.{#if minor} Its relative minor, {nm(minorOf(sel))} minor, shares the signature.{/if}
        {#if chords}Its neighbours on the circle, {nm(major(RING[(selIndex + 11) % 12]!))} and {nm(major(RING[(selIndex + 1) % 12]!))}, are its IV and V.{/if}
        {#if sel === 6}On the piano, {nm(major(6))} major is also {noteName({ letter: 'G', alter: -1 }, settings.nameOptions)} major (6 flats): the circle closes.{/if}
      </p>
    </div>
  </div>
</Widget>

<style>
  .cof {
    display: grid;
    grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
    gap: 1rem;
    padding: 1rem 1.15rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .cof {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  svg {
    width: 100%;
    max-width: 18rem;
    height: auto;
  }
  .ring {
    fill: none;
    stroke: var(--line);
  }
  .key {
    cursor: pointer;
  }
  .key circle {
    fill: var(--surface);
    stroke: var(--line-strong);
  }
  .key:hover circle,
  .key:focus-visible circle {
    stroke: var(--accent);
  }
  .key:focus-visible {
    outline: none;
  }
  .key.near circle {
    fill: var(--fn-d-soft);
  }
  .key.sel circle {
    fill: var(--accent);
    stroke: var(--accent);
  }
  .key.sel .maj {
    fill: var(--on-accent);
  }
  text {
    text-anchor: middle;
    font-family: var(--font-ui);
    fill: var(--ink);
  }
  .maj {
    font-size: 13px;
    font-weight: 700;
  }
  .min {
    font-size: 10px;
    fill: var(--ink-2);
  }
  .centre {
    font-size: 13px;
    font-weight: 700;
  }
  .centre.sub {
    font-size: 10px;
    font-weight: 400;
    fill: var(--mute);
  }
  .side p {
    margin: 0;
    font-size: 0.92rem;
  }
</style>

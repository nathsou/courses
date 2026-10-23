<!--
  Hold notes: the course names the chord (symbol, kind, inversion) and its Roman numeral in the chosen key.
  Below, the key's chords on each degree, to play and hear. Used from triads to seventh chords.
-->
<script lang="ts">
  import { instrument } from '$lib/midi/instrument.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { chordFromRoman, chordSymbol, diatonicTriads, identifyChord, inversion, QUALITIES, romanNumeral, romanText, voicing, type Chord } from '$lib/music/chord';
  import { pitchName } from '$lib/music/names';
  import { midi, parsePitch, spell } from '$lib/music/pitch';
  import { fifthsOf, type Key } from '$lib/music/scale';
  import Score from '$lib/notation/Score.svelte';
  import { chordScore, keyText } from '$lib/notation/write';
  import Keyboard from './Keyboard.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';

  let { tonic = 'C', mode = 'major', degrees = true, title = 'Chord lab' }: { tonic?: string; mode?: 'major' | 'minor'; degrees?: boolean; title?: string } = $props();

  const key = $derived<Key>({ tonic: (({ letter, alter }) => ({ letter, alter }))(parsePitch(tonic)), mode });
  const fifths = $derived(fifthsOf(key));
  let shown: number[] = $state([]);
  $effect(() => {
    const h = [...instrument.held].sort((a, b) => a - b);
    if (h.length) shown = h;
  });
  const found = $derived(shown.length >= 2 ? identifyChord(shown, fifths)[0] : undefined);
  const INV = ['root position', 'first inversion', 'second inversion', 'third inversion'];
  const describe = (c: Chord) => `${QUALITIES[c.quality].name}${inversion(c) !== undefined && inversion(c)! > 0 ? `, ${INV[inversion(c)!]}` : ''}`;
  // In minor, the chords of common practice: the harmonic minor's V and vii° (raised seventh), the natural minor's III.
  const MINOR = ['i', 'ii°', 'III', 'iv', 'V', 'VI', '#vii°'];
  const triads = $derived(mode === 'minor' ? MINOR.map((r) => chordFromRoman(r, key)) : diatonicTriads(key));
  const labelOf = (c: Chord, i: number) => (mode === 'minor' ? MINOR[i]!.replace('#', '') : romanText(romanNumeral(c, key)));
  function play(c: Chord) {
    const notes = voicing(c, 4).map(midi);
    audio.playSequence(notes.map((m) => ({ midi: m, time: 0, duration: 1.2, velocity: 72 })));
    shown = notes;
  }
  const src = $derived(chordScore(shown.map((m) => spell(m, fifths)), { key: keyText(tonic, mode) }));
</script>

<Widget {title} subtitle="Hold two or more keys: the course names the chord. Or press a chord below to hear it.">
  <div class="cl ui">
    <div class="top">
      <div class="staff"><Score {src} play={false} label="The chord on the staff" /></div>
      <div class="name" aria-live="polite">
        {#if found}
          <p class="sym">{chordSymbol(found.chord, settings.nameOptions)}</p>
          <p>{describe(found.chord)}{found.omitted.length ? ', without its fifth' : ''}</p>
          <p class="rn">In {pitchName({ ...key.tonic, octave: 0 } as never, settings.nameOptions).replace(/0$/, '')} {mode}: <strong>{romanText(romanNumeral(found.chord, key))}</strong></p>
        {:else if shown.length}
          <p>{shown.map((m) => pitchName(spell(m, fifths), settings.nameOptions)).join(' ')}</p>
          <p class="mute">Not a chord the course names (yet).</p>
        {:else}
          <p class="mute">Hold some keys.</p>
        {/if}
      </div>
    </div>
    {#if degrees}
      <div class="degrees" role="group" aria-label="Chords of the key">
        {#each triads as c, i (i)}
          <button onclick={() => play(c)}><span class="rn">{labelOf(c, i)}</span><span>{chordSymbol(c, settings.nameOptions)}</span></button>
        {/each}
      </div>
    {/if}
    <Keyboard lo={48} hi={84} {fifths} label="Keyboard: hold a chord" />
  </div>
</Widget>

<style>
  .cl {
    display: grid;
    gap: 0.7rem;
    padding: 0.9rem 1.15rem 1rem;
  }
  .top {
    display: grid;
    grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 520px) {
    .top {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .name p {
    margin: 0.1rem 0;
  }
  .sym {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 600;
  }
  .rn {
    font-family: var(--font-body);
  }
  .mute {
    color: var(--mute);
  }
  .degrees {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .degrees button {
    display: grid;
    justify-items: center;
    gap: 0.05rem;
    min-width: 3.4rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.5rem;
    cursor: pointer;
    font-weight: 600;
  }
  .degrees button:hover {
    border-color: var(--accent);
  }
  .degrees .rn {
    font-size: 1.05rem;
  }
</style>

<!--
  Play keys and see them written on the grand staff, with their names. With `landmarks`, the landmark notes
  (C2, F3, middle C, G4, C6) are shown in the background. Spelling follows the chosen key.
-->
<script lang="ts">
  import { instrument } from '$lib/midi/instrument.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { pitchName } from '$lib/music/names';
  import { midi, spell, parsePitch } from '$lib/music/pitch';
  import Score from '$lib/notation/Score.svelte';
  import { chordScore, keyText } from '$lib/notation/write';
  import Keyboard from './Keyboard.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';

  let {
    title = 'Play it, see it written',
    lo = 36,
    hi = 84,
    tonic = 'C',
    mode = 'major',
    fifths = 0,
    staff = 'grand',
    landmarks = false,
  }: { title?: string; lo?: number; hi?: number; tonic?: string; mode?: 'major' | 'minor'; fifths?: number; staff?: 'grand' | 'treble' | 'bass'; landmarks?: boolean } = $props();

  // Keep the last chord on the staff after the keys come up, so it can be read.
  let shown: number[] = $state([]);
  $effect(() => {
    const h = [...instrument.held].sort((a, b) => a - b);
    if (h.length) shown = h;
  });
  const LANDMARKS = ['C2', 'F3', 'C4', 'G4', 'C6'].map((n) => midi(parsePitch(n)));
  const notes = $derived(landmarks && !shown.length ? LANDMARKS : shown);
  const src = $derived(chordScore(notes.map((m) => spell(m, fifths)), { staff, key: fifths ? keyText(tonic, mode) : '' }));
  const names = $derived(notes.map((m) => pitchName(spell(m, fifths), settings.nameOptions)).join('  '));
</script>

<Widget {title} subtitle={landmarks ? 'The landmark notes are shown until you play: C two octaves below middle C, the F of the bass clef, middle C, the G of the treble clef, and C two octaves above.' : 'Play any keys: they appear on the staff with their names.'}>
  <div class="sp ui">
    <div class="staff"><Score {src} play={false} label="The notes you are playing, on the staff" /></div>
    <p class="names" aria-live="polite">{shown.length ? names : landmarks ? `Landmarks: ${names}` : 'Play something.'}</p>
    <Keyboard {lo} {hi} {fifths} labels="c" label="Keyboard: play to write on the staff" />
  </div>
</Widget>

<style>
  .sp {
    display: grid;
    gap: 0.4rem;
    padding: 0.8rem 1.15rem 1rem;
  }
  .staff {
    max-width: 18rem;
    margin: 0 auto;
    width: 100%;
  }
  .names {
    margin: 0;
    text-align: center;
    font-weight: 600;
    min-height: 1.4em;
    white-space: pre;
  }
</style>

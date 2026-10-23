<!--
  Build a scale on any tonic: its step pattern (T for a tone, S for a semitone, 3S for an augmented second),
  its notes on the keyboard and the staff, spelt one letter per degree, and a play button.
-->
<script lang="ts">
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { midi, parsePitch, type Pitch } from '$lib/music/pitch';
  import { fifthsOf, scale, stepPattern, type ScaleKind } from '$lib/music/scale';
  import Score from '$lib/notation/Score.svelte';
  import { pitchToken } from '$lib/notation/write';
  import Keyboard, { type Mark } from './Keyboard.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  let {
    title = 'Scale explorer',
    tonic = 'C',
    kind = 'major',
    kinds = 'major',
    tonics = 'C,G,D,A,E,B,F#,F,Bb,Eb,Ab,Db',
    signature = false,
    subtitle = 'Choose a starting note and a scale. Each degree uses the next letter, so the sharps and flats fall where the pattern needs them.',
  }: {
    title?: string;
    tonic?: string;
    kind?: ScaleKind;
    /** Comma-separated scale kinds to offer. */
    kinds?: string;
    tonics?: string;
    /** Write the key signature instead of accidentals. */
    signature?: boolean;
    subtitle?: string;
  } = $props();

  let t = $state('C');
  let k: ScaleKind = $state('major');
  $effect.pre(() => {
    t = tonic;
    k = kind;
  });
  const LABEL: Record<string, string> = { major: 'Major', 'natural-minor': 'Natural minor', 'harmonic-minor': 'Harmonic minor', 'melodic-minor': 'Melodic minor', 'major-pentatonic': 'Major pentatonic', 'minor-pentatonic': 'Minor pentatonic', dorian: 'Dorian', phrygian: 'Phrygian', lydian: 'Lydian', mixolydian: 'Mixolydian', locrian: 'Locrian', blues: 'Blues', 'whole-tone': 'Whole-tone', 'octatonic-hw': 'Octatonic (H–W)', 'octatonic-wh': 'Octatonic (W–H)', 'bebop-dominant': 'Bebop dominant' };
  const start = $derived.by((): Pitch => {
    const p = parsePitch(t, 4);
    return midi(p) > 67 ? { ...p, octave: 3 } : p;
  });
  const notes = $derived([...scale(start, k), { ...start, octave: start.octave + 1 }]);
  const steps = $derived(stepPattern(k));
  const isMinor = $derived(k.includes('minor'));
  const fifths = $derived(signature && (k === 'major' || k === 'natural-minor') ? fifthsOf({ tonic: { letter: start.letter, alter: start.alter }, mode: isMinor ? 'minor' : 'major' }) : 0);
  const keyCmd = $derived(fifths ? `\\key ${start.letter.toLowerCase()}${start.alter > 0 ? '#' : start.alter < 0 ? 'b' : ''} \\${isMinor ? 'minor' : 'major'}` : '');
  const src = $derived(`${keyCmd} \\hidetime \\time ${notes.length}/4 \\tempo 120 ${notes.map((p) => pitchToken(p) + '4').join(' ')} |`);
  const marks = $derived(Object.fromEntries(notes.map((p, i) => [midi(p), (i === 0 || i === notes.length - 1 ? 'tonic' : 'target') as Mark])) as Record<number, Mark>);
  const stepName = (s: number) => (s === 1 ? 'S' : s === 2 ? 'T' : s === 3 ? 'T+S' : `${s}`);
</script>

<Widget {title} {subtitle}>
  {#snippet controls()}
    <Segmented options={tonics.split(',').map((x) => ({ value: x, label: noteName(parsePitch(x), settings.nameOptions) }))} value={t} label="Starting note" onchange={(v) => (t = v)} size="sm" />
    {#if kinds.includes(',')}
      <Segmented options={kinds.split(',').map((x) => ({ value: x as ScaleKind, label: LABEL[x] ?? x }))} value={k} label="Scale" onchange={(v) => (k = v)} size="sm" />
    {/if}
  {/snippet}
  <div class="se ui">
    <ol class="degrees" aria-label="Notes and steps">
      {#each notes as p, i (i)}
        <li><span class="deg">{i + 1 > steps.length ? 1 : i + 1}</span><span class="nm">{noteName(p, settings.nameOptions)}</span></li>
        {#if i < steps.length}<li class="step" class:half={steps[i] === 1} class:aug={steps[i] === 3} aria-label="{steps[i]} semitones">{stepName(steps[i]!)}</li>{/if}
      {/each}
    </ol>
    <Score {src} label="The scale on the staff" />
    <Keyboard lo={48} hi={84} {marks} labels="marked" names={Object.fromEntries(notes.map((p) => [midi(p), p]))} label="The scale on the keyboard" />
  </div>
</Widget>

<style>
  .se {
    display: grid;
    gap: 0.5rem;
    padding: 0.8rem 1.15rem 1rem;
  }
  .degrees {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
  }
  .degrees li {
    display: grid;
    justify-items: center;
  }
  .deg {
    font-size: 0.68rem;
    color: var(--mute);
  }
  .nm {
    font-weight: 700;
    font-size: 1.02rem;
  }
  .step {
    font-size: 0.75rem;
    color: var(--ink-2);
    padding: 0 0.2rem;
    border-bottom: 2px solid var(--line-strong);
  }
  .step.half {
    color: var(--accent);
    border-color: var(--accent);
    font-weight: 700;
  }
  .step.aug {
    color: var(--fn-d);
    border-color: var(--fn-d);
    font-weight: 700;
  }
</style>

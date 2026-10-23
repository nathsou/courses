<!--
  Modes over a drone: choose a tonic and a mode, start the drone (tonic and fifth, low, struck again every few
  seconds), and play over it. The keyboard marks the mode's notes, its tonic, and its characteristic note: the one
  degree that separates it from plain major or minor.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { midi, mod, parsePitch, pitchClass } from '$lib/music/pitch';
  import { scale, SCALE_NAMES, type ScaleKind } from '$lib/music/scale';
  import Keyboard, { type Mark } from './Keyboard.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let {
    title = 'Modes over a drone',
    tonic = 'D',
    mode = 'dorian',
    modes = 'major,dorian,phrygian,lydian,mixolydian,natural-minor,locrian',
    tonics = 'C,D,E,F,G,A',
  }: { title?: string; tonic?: string; mode?: ScaleKind; modes?: string; tonics?: string } = $props();

  let t = $state('D');
  let k: ScaleKind = $state('dorian');
  $effect.pre(() => {
    t = tonic;
    k = mode;
  });

  /** The degree (semitones above the tonic) that gives each mode its colour, compared with major or natural minor. */
  const CHARACTERISTIC: Partial<Record<ScaleKind, { semis: number; text: string }>> = {
    major: { semis: 11, text: 'the major seventh, a semitone below the tonic' },
    dorian: { semis: 9, text: 'the major sixth: natural minor with a raised sixth' },
    phrygian: { semis: 1, text: 'the minor second: natural minor with a lowered second' },
    lydian: { semis: 6, text: 'the augmented fourth: major with a raised fourth' },
    mixolydian: { semis: 10, text: 'the minor seventh: major with a lowered seventh' },
    'natural-minor': { semis: 8, text: 'the minor sixth' },
    locrian: { semis: 6, text: 'the diminished fifth: there is no perfect fifth above the tonic' },
  };
  const LABEL: Record<string, string> = { major: 'Ionian', dorian: 'Dorian', phrygian: 'Phrygian', lydian: 'Lydian', mixolydian: 'Mixolydian', 'natural-minor': 'Aeolian', locrian: 'Locrian' };

  const root = $derived.by(() => {
    const p = parsePitch(t, 4);
    return midi(p) > 64 ? { ...p, octave: 3 } : p;
  });
  const notes = $derived(scale(root, k));
  const ch = $derived(CHARACTERISTIC[k]);
  const marks = $derived.by((): Record<number, Mark> => {
    const out: Record<number, Mark> = {};
    const pcs = notes.map(pitchClass);
    const tonicPc = pitchClass(root);
    for (let m = 48; m <= 84; m++) {
      const pc = mod(m, 12);
      if (!pcs.includes(pc)) continue;
      out[m] = pc === tonicPc ? 'tonic' : ch && mod(pc - tonicPc, 12) === ch.semis ? 'dominant' : 'target';
    }
    return out;
  });
  const names = $derived(notes.map((p) => noteName(p, settings.nameOptions)).join(' '));

  let droning = $state(false);
  let timer: number | undefined;
  let voices: { stop(): void }[] = [];
  function strike() {
    for (const v of voices) v.stop();
    const r = 36 + mod(pitchClass(root) - 36, 12);
    voices = [audio.noteOn(r, 58), audio.noteOn(r + 7, 50), audio.noteOn(r + 12, 44)];
  }
  function toggle() {
    if (droning) {
      clearInterval(timer);
      for (const v of voices) v.stop();
      voices = [];
      droning = false;
      return;
    }
    audio.start();
    strike();
    timer = window.setInterval(strike, 3500);
    droning = true;
  }
  $effect(() => {
    void root;
    if (droning) strike();
  });
  function playScale() {
    audio.start();
    const all = [...notes, { ...root, octave: root.octave + 1 }].map(midi);
    const seq = [...all, ...all.slice(0, -1).reverse()];
    audio.playSequence(seq.map((m, i) => ({ midi: m, time: i * 0.32, duration: 0.3, velocity: 72 })));
  }
  onDestroy(() => {
    clearInterval(timer);
    for (const v of voices) v.stop();
  });
</script>

<Widget {title} subtitle="Start the drone, then play the mode over it. The tonic is marked in blue, the characteristic note in orange.">
  {#snippet controls()}
    <Segmented options={tonics.split(',').map((x) => ({ value: x, label: noteName(parsePitch(x), settings.nameOptions) }))} value={t} label="Tonic" onchange={(v) => (t = v)} size="sm" />
    <Segmented options={modes.split(',').map((x) => ({ value: x as ScaleKind, label: LABEL[x] ?? SCALE_NAMES[x as ScaleKind] ?? x }))} value={k} label="Mode" onchange={(v) => (k = v)} size="sm" />
    <button class="go" onclick={toggle} aria-pressed={droning}><Icon name={droning ? 'stop' : 'play'} size={14} /> {droning ? 'Stop the drone' : 'Drone'}</button>
    <button class="go" onclick={playScale}><Icon name="play" size={14} /> Play the mode</button>
  {/snippet}
  <div class="md ui">
    <p class="notes"><strong>{noteName(root, settings.nameOptions)} {LABEL[k] ?? SCALE_NAMES[k]}:</strong> {names}</p>
    {#if ch}<p class="ch">Characteristic note: {noteName(notes.find((p) => mod(pitchClass(p) - pitchClass(root), 12) === ch.semis) ?? root, settings.nameOptions)}, {ch.text}.</p>{/if}
    <Keyboard lo={48} hi={84} {marks} label="Keyboard with the mode marked" />
  </div>
</Widget>

<style>
  .md {
    padding: 0.7rem 1.15rem 1rem;
    display: grid;
    gap: 0.5rem;
  }
  .md p {
    margin: 0;
  }
  .ch {
    color: var(--ink-2);
    font-size: 0.92rem;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.7rem;
    cursor: pointer;
    font-weight: 600;
  }
</style>

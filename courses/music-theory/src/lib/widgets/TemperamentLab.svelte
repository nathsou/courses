<!--
  Hear temperaments: choose a tuning system and a chord (or interval) on any root, and play it. The panel shows the
  size of its third and fifth in cents against the pure intervals of the harmonic series, so the beating you hear
  has a number. Quarter-comma meantone is lovely in C and ugly in F♯; equal temperament is the same everywhere.
-->
<script lang="ts">
  import { audio } from '$lib/audio/engine.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { spell } from '$lib/music/pitch';
  import { intervalCents, PURE, TEMPERAMENT_NAMES, tuned, type Temperament } from '$lib/music/tuning';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { title = 'Temperaments', temperaments = 'equal,pythagorean,just,meantone,werckmeister', roots = 'C,G,D,E,F#,Ab' }: { title?: string; temperaments?: string; roots?: string } = $props();

  const ROOTS: Record<string, number> = { C: 60, 'C#': 61, Db: 61, D: 62, Eb: 63, E: 64, F: 65, 'F#': 66, G: 67, Ab: 68, A: 69, Bb: 70, B: 71 };
  let t: Temperament = $state('equal');
  let r = $state('C');
  const root = $derived(ROOTS[r] ?? 60);
  const third = $derived(intervalCents(root, root + 4, t));
  const fifth = $derived(intervalCents(root, root + 7, t));
  const diff = (x: number, pure: number) => `${x >= pure ? '+' : '−'}${Math.abs(x - pure).toFixed(1)}`;

  /** Korobeiniki's first phrase in A minor (melody in quavers, bass and chords), as [midi, start, length] in quavers. */
  const TUNE: [number, number, number][] = [
    [76, 0, 2], [71, 2, 1], [72, 3, 1], [74, 4, 2], [72, 6, 1], [71, 7, 1],
    [69, 8, 2], [69, 10, 1], [72, 11, 1], [76, 12, 2], [74, 14, 1], [72, 15, 1],
    [71, 16, 3], [72, 19, 1], [74, 20, 2], [76, 22, 2], [72, 24, 2], [69, 26, 2], [69, 28, 4],
  ];
  const CHORDS: [number[], number][] = [[[40, 56, 59, 62], 0], [[45, 57, 60, 64], 8], [[40, 56, 59, 62], 16], [[45, 57, 60, 64], 24]];
  /** Play the tune in the minor key whose tonic is the chosen root. */
  function playTune() {
    audio.start();
    const shift = ((root - 69) % 12 + 12 + 6) % 12 - 6;
    const q = 0.24;
    const ns = TUNE.map(([m, at, len]) => ({ midi: tuned(m + shift, t), time: at * q, duration: len * q * 0.95, velocity: 76 }));
    for (const [chord, at] of CHORDS) for (const m of chord) ns.push({ midi: tuned(m + shift, t), time: at * q, duration: 8 * q * 0.95, velocity: 54 });
    audio.playSequence(ns);
  }

  function play(kind: 'triad' | 'third' | 'fifth' | 'scale') {
    audio.start();
    const ns: { midi: number; time: number; duration: number; velocity: number }[] = [];
    if (kind === 'scale') [0, 2, 4, 5, 7, 9, 11, 12].forEach((s, i) => ns.push({ midi: tuned(root + s, t), time: i * 0.35, duration: 0.33, velocity: 70 }));
    else {
      const set = kind === 'triad' ? [0, 4, 7] : kind === 'third' ? [0, 4] : [0, 7];
      for (const s of set) ns.push({ midi: tuned(root + s, t), time: 0, duration: 2.6, velocity: 68 });
    }
    audio.playSequence(ns);
  }
</script>

<Widget {title} subtitle="Choose a tuning and a root, then play. The numbers compare each interval with its pure version: 0 means beatless.">
  {#snippet controls()}
    <Segmented options={temperaments.split(',').map((x) => ({ value: x as Temperament, label: TEMPERAMENT_NAMES[x as Temperament] ?? x }))} value={t} label="Tuning" onchange={(v) => (t = v)} size="sm" />
    <Segmented options={roots.split(',').map((x) => ({ value: x, label: noteName(spell(ROOTS[x] ?? 60, x.includes('b') ? -4 : 0), settings.nameOptions) }))} value={r} label="Root" onchange={(v) => (r = v)} size="sm" />
  {/snippet}
  <div class="tl ui">
    <div class="buttons">
      <button onclick={() => play('triad')}><Icon name="play" size={14} /> Major triad</button>
      <button onclick={() => play('third')}><Icon name="play" size={14} /> Major third</button>
      <button onclick={() => play('fifth')}><Icon name="play" size={14} /> Fifth</button>
      <button onclick={() => play('scale')}><Icon name="play" size={14} /> Major scale</button>
      <button onclick={playTune}><Icon name="play" size={14} /> Korobeiniki in {noteName(spell(root, r.includes('b') ? -4 : 3), settings.nameOptions)} minor</button>
    </div>
    <table>
      <thead><tr><th></th><th>In this tuning</th><th>Pure</th><th>Difference</th></tr></thead>
      <tbody>
        <tr><th>Major third</th><td>{third.toFixed(1)} cents</td><td>{PURE['major third']!.toFixed(1)}</td><td class:bad={Math.abs(third - PURE['major third']!) > 15}>{diff(third, PURE['major third']!)}</td></tr>
        <tr><th>Fifth</th><td>{fifth.toFixed(1)} cents</td><td>{PURE['perfect fifth']!.toFixed(1)}</td><td class:bad={Math.abs(fifth - PURE['perfect fifth']!) > 6}>{diff(fifth, PURE['perfect fifth']!)}</td></tr>
      </tbody>
    </table>
  </div>
</Widget>

<style>
  .tl {
    padding: 0.7rem 1.15rem 1rem;
    display: grid;
    gap: 0.6rem;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .buttons button {
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
  table {
    border-collapse: collapse;
    font-size: 0.92rem;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    text-align: left;
    padding: 0.25rem 0.8rem 0.25rem 0;
    border-bottom: 1px solid var(--line);
  }
  td.bad {
    color: var(--bad);
    font-weight: 600;
  }
</style>

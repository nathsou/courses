<!--
  The same progression voiced two ways: every chord in root position, or each chord as close as possible to
  the one before. The course counts how far the right hand moves, in semitones, from chord to chord.
-->
<script lang="ts">
  import { chordFromRoman, chordSymbol, chordTones } from '$lib/music/chord';
  import { midi, parsePitch, type Pitch } from '$lib/music/pitch';
  import type { Key } from '$lib/music/scale';
  import Score from '$lib/notation/Score.svelte';
  import { keyText, pitchToken } from '$lib/notation/write';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  let { romans = 'I,IV,V,I', tonic = 'C' }: { romans?: string; tonic?: string } = $props();
  let how: 'root' | 'close' = $state('close');
  const key = $derived<Key>({ tonic: (({ letter, alter }) => ({ letter, alter }))(parsePitch(tonic)), mode: 'major' });
  const chords = $derived(romans.split(',').map((r) => chordFromRoman(r.trim(), key)));

  /** Right-hand voicings: three notes from C4 up, root position, or nearest to the previous chord. */
  /** Stack the chord tones upwards from `octave`, starting with tone `inv` (0 = root position). */
  function stack(tones: Pitch[], inv: number, octave: number): Pitch[] {
    const v: Pitch[] = [];
    for (const t of [...tones.slice(inv), ...tones.slice(0, inv)]) {
      let p = { ...t, octave };
      while (v.length && midi(p) <= midi(v.at(-1)!)) p = { ...p, octave: p.octave + 1 };
      v.push(p);
    }
    return v;
  }

  /** Right-hand voicings around middle C: all in root position, or each nearest to the chord before. */
  const voicings = $derived.by((): Pitch[][] => {
    const out: Pitch[][] = [];
    for (const c of chords) {
      const tones = chordTones(c);
      if (how === 'root' || !out.length) {
        const v = stack(tones, 0, 4);
        out.push(midi(v[0]!) > 67 ? stack(tones, 0, 3) : v);
        continue;
      }
      const prev = out.at(-1)!.map(midi);
      let best = stack(tones, 0, 4);
      let bestCost = Infinity;
      for (let inv = 0; inv < 3; inv++)
        for (const oct of [3, 4]) {
          const v = stack(tones, inv, oct);
          const cost = v.reduce((a, p, i) => a + Math.abs(midi(p) - prev[i]!), 0);
          if (cost < bestCost && midi(v[0]!) >= 52) {
            bestCost = cost;
            best = v;
          }
        }
      out.push(best);
    }
    return out;
  });
  const moves = $derived(voicings.slice(1).map((v, i) => v.reduce((a, p, j) => a + Math.abs(midi(p) - midi(voicings[i]![j]!)), 0)));
  const common = $derived(voicings.slice(1).map((v, i) => v.filter((p) => voicings[i]!.some((q) => midi(q) === midi(p))).length));
  const bass = $derived(chords.map((c) => ({ ...c.root, octave: midi({ ...c.root, octave: 3 }) > 55 ? 2 : 3 })));
  const src = $derived(
    `${keyText(tonic, 'major')} \\time 4/4 \\tempo 66 \\staff treble ${voicings.map((v, i) => `<${v.map(pitchToken).join(' ')}>1^"${chordSymbol(chords[i]!)}"`).join(' | ')} | \\staff bass ${bass.map((b, i) => `${pitchToken(b)}1_"${romans.split(',')[i]!.trim()}"`).join(' | ')} |`,
  );
</script>

<Widget title="Moving less" subtitle="The same chords, voiced two ways. Root position makes the hand jump; choosing the nearest inversion keeps it almost still.">
  {#snippet controls()}
    <Segmented options={[{ value: 'root', label: 'All in root position' }, { value: 'close', label: 'Nearest voicing' }]} value={how} label="Voicing" onchange={(v) => (how = v)} size="sm" />
  {/snippet}
  <div class="vm ui">
    <Score {src} label="The progression on the grand staff" />
    <p aria-live="polite">
      Right hand moves {moves.join(', ')} semitones between chords ({moves.reduce((a, b) => a + b, 0)} in all), keeping
      {common.join(', ')} {common.length === 1 && common[0] === 1 ? 'note' : 'notes'} in place.
    </p>
  </div>
</Widget>

<style>
  .vm {
    padding: 0.6rem 1.15rem 1rem;
  }
  p {
    margin: 0.2rem 0 0;
    font-size: 0.92rem;
  }
</style>

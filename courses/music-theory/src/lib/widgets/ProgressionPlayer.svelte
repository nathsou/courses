<!--
  Play a chord progression from Roman numerals in any key and with a choice of left-hand accompaniment.
  The numerals are coloured by function (tonic, predominant, dominant), and the score shows exactly what
  is played, voiced the way a pianist would (src/lib/music/voicing.ts).
-->
<script lang="ts">
  import { audio, type ScheduledNote } from '$lib/audio/engine.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { chordFromRoman, chordSymbol, parseChordSymbol, romanNumeral, romanText, type Chord } from '$lib/music/chord';
  import { noteName } from '$lib/music/names';
  import { LETTERS, midi, parsePitch, pitchClass, spell, type Pitch, type PitchClassName } from '$lib/music/pitch';
  import { fifthsOf, type Key } from '$lib/music/scale';
  import { functionOf, voiceProgression, type Voiced } from '$lib/music/voicing';
  import Score from '$lib/notation/Score.svelte';
  import { keyText, pitchToken } from '$lib/notation/write';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  type Pattern = 'block' | 'pulse' | 'broken' | 'alberti' | 'waltz' | 'arpeggio' | 'stride' | 'charleston' | 'walking' | 'bossa';
  let {
    romans = 'I,IV,V,I',
    chords: symbols = '',
    tonic = 'C',
    mode = 'major',
    tonics = '',
    pattern = 'block',
    patterns = 'block',
    tempo = 84,
    title = 'Progression',
    subtitle = '',
  }: {
    romans?: string;
    /** Chord symbols instead of numerals ("C7,F7,C7,C7"); the numerals are worked out from the key. */
    chords?: string;
    tonic?: string;
    mode?: 'major' | 'minor';
    /** Comma-separated tonics to offer, or empty. */
    tonics?: string;
    pattern?: Pattern;
    /** Comma-separated patterns to offer. */
    patterns?: string;
    tempo?: number;
    title?: string;
    subtitle?: string;
  } = $props();

  let t = $state('C');
  let pat = $state<Pattern>('block');
  $effect.pre(() => {
    t = tonic;
    pat = pattern;
  });
  let playingIndex = $state(-1);
  const key = $derived<Key>({ tonic: (({ letter, alter }) => ({ letter, alter }))(parsePitch(t)), mode });
  const keyFifths = $derived(fifthsOf(key));
  const chords = $derived(symbols ? transposed(symbols.split(',').map((c) => parseChordSymbol(c.trim()))) : romans.split(',').map((r) => chordFromRoman(r.trim(), key)));
  const list = $derived(symbols ? chords.map((c) => romanText(romanNumeral(c, key))) : romans.split(',').map((r) => r.trim()));
  /** Symbols are written in the first key offered; move them to the chosen key. */
  function transposed(cs: Chord[]): Chord[] {
    const from: Key = { tonic: (({ letter, alter }) => ({ letter, alter }))(parsePitch(tonic)), mode };
    const shift = intervalBetweenKeys(from, key);
    return cs.map((c) => ({ root: tp(c.root, shift), quality: c.quality, bass: c.bass ? tp(c.bass, shift) : undefined }));
  }
  function intervalBetweenKeys(a: Key, b: Key): { letters: number; semis: number } {
    const letters = (LETTERS.indexOf(b.tonic.letter) - LETTERS.indexOf(a.tonic.letter) + 7) % 7;
    const semis = (pitchClass(b.tonic) - pitchClass(a.tonic) + 12) % 12;
    return { letters, semis };
  }
  function tp(p: PitchClassName, d: { letters: number; semis: number }): PitchClassName {
    const letter = LETTERS[(LETTERS.indexOf(p.letter) + d.letters) % 7]!;
    const alter = ((pitchClass(p) + d.semis - pitchClass({ letter, alter: 0 }) + 18) % 12) - 6;
    return { letter, alter };
  }
  const voiced = $derived(voiceProgression(chords, { lo: 57, hi: 79, bassLo: 36, bassHi: 52 }));
  const waltz = $derived(pat === 'waltz');
  const beats = $derived(waltz ? 3 : 4);
  const up = (p: Pitch, n: number): Pitch => ({ ...p, octave: p.octave + n });
  const fifthAbove = (v: Voiced): Pitch => {
    const tones = v.upper.map((p) => ({ ...p, octave: v.bass.octave }));
    // The chord tone a fifth (or so) above the bass, in the bass's octave or the next.
    const cand = tones.map((p) => (midi(p) <= midi(v.bass) ? up(p, 1) : p)).sort((a, b) => midi(a) - midi(b));
    return cand.find((p) => midi(p) - midi(v.bass) >= 6 && midi(p) - midi(v.bass) <= 8) ?? cand.at(-1)!;
  };

  /** Left-hand and right-hand events for one chord: [pitches, beats][] per hand. */
  function bar(v: Voiced, i: number): { lh: [Pitch[], number][]; rh: [Pitch[], number][] } {
    const b = v.bass;
    const f = fifthAbove(v);
    switch (pat) {
      case 'stride': {
        // Bass low on 1 and 3, the chord in the middle of the keyboard on 2 and 4.
        const mid = v.upper.map((p) => up(p, -1));
        return { lh: [[[up(b, -1)], 1], [mid, 1], [[up(f, -1)], 1], [mid, 1]], rh: [[v.upper, 4]] };
      }
      case 'charleston':
        // Root and fifth in the left hand; the chord on beat 1 and on the "and" of 2.
        return { lh: [[[b], 2], [[f], 2]], rh: [[v.upper, 1.5], [v.upper, 0.5], [[], 2]] };
      case 'bossa':
        return { lh: [[[b], 1.5], [[f], 0.5], [[f], 1.5], [[b], 0.5]], rh: [[v.upper, 1.5], [v.upper, 1], [v.upper, 1.5]] };
      case 'walking': {
        // Root, a chord tone, the fifth, then a semitone below (or above) the next root.
        const next = voiced[(i + 1) % voiced.length]!.bass;
        const third = v.upper.map((p) => ({ ...p, octave: b.octave })).map((p) => (midi(p) <= midi(b) ? up(p, 1) : p)).sort((x, y) => midi(x) - midi(y))[0] ?? f;
        let n = next;
        while (midi(n) - midi(f) > 6) n = up(n, -1);
        while (midi(f) - midi(n) > 6) n = up(n, 1);
        const approach = spell(midi(n) + (midi(n) > midi(f) ? -1 : 1), keyFifths);
        return { lh: [[[b], 1], [[third], 1], [[f], 1], [[approach], 1]], rh: [[v.upper, 1.5], [v.upper, 0.5], [[], 2]] };
      }
      case 'pulse':
        return { lh: [[[b], 2], [[b], 2]], rh: [[v.upper, 1], [v.upper, 1], [v.upper, 1], [v.upper, 1]] };
      case 'broken':
        return { lh: [[[b], 0.5], [[f], 0.5], [[up(b, 1)], 0.5], [[f], 0.5], [[b], 0.5], [[f], 0.5], [[up(b, 1)], 0.5], [[f], 0.5]], rh: [[v.upper, 4]] };
      case 'alberti': {
        const [lo, mid, hi] = [v.upper[0]!, v.upper[1]!, v.upper.at(-1)!].map((p) => up(p, -1));
        return { lh: [[[lo!], 0.5], [[hi!], 0.5], [[mid!], 0.5], [[hi!], 0.5], [[lo!], 0.5], [[hi!], 0.5], [[mid!], 0.5], [[hi!], 0.5]], rh: [[v.upper, 4]] };
      }
      case 'waltz':
        return { lh: [[[b], 1], [[], 2]], rh: [[[], 1], [v.upper, 1], [v.upper, 1]] };
      case 'arpeggio': {
        const third = v.upper.map((p) => ({ ...p, octave: b.octave + 1 })).filter((p) => midi(p) > midi(up(b, 1))).sort((a, c) => midi(a) - midi(c))[0] ?? up(b, 1);
        return { lh: [[[b], 0.5], [[f], 0.5], [[up(b, 1)], 0.5], [[third], 0.5], [[up(b, 1)], 0.5], [[f], 0.5], [[b], 1]], rh: [[v.upper, 4]] };
      }
      default:
        return { lh: [[[b], 4]], rh: [[v.upper, 4]] };
    }
  }

  const DUR: Record<number, string> = { 4: '1', 3: '2.', 2: '2', 1.5: '4.', 1: '4', 0.5: '8' };
  const tok = (ps: Pitch[], d: number) => (ps.length === 0 ? `r${DUR[d]}` : ps.length === 1 ? `${pitchToken(ps[0]!)}${DUR[d]}` : `<${ps.map(pitchToken).join(' ')}>${DUR[d]}`);
  const src = $derived.by(() => {
    const bars = voiced.map((v, i) => bar(v, i));
    const rh = bars.map((x, i) => x.rh.map(([p, d], j) => (j === 0 ? `${tok(p, d)}^"${chordSymbol(chords[i]!)}"` : tok(p, d))).join(' ')).join(' | ');
    const lh = bars.map((x, i) => x.lh.map(([p, d], j) => (j === 0 ? `${tok(p, d)}_"${list[i]}"` : tok(p, d))).join(' ')).join(' | ');
    return `${keyText(t, mode)} \\time ${beats}/4 \\tempo ${tempo} \\staff treble ${rh} | \\staff bass ${lh} |`;
  });

  function play() {
    const beat = 60 / tempo;
    const notes: ScheduledNote[] = [];
    const starts: number[] = [];
    voiced.forEach((v, i) => {
      const { lh, rh } = bar(v, i);
      const t0 = i * beats * beat;
      starts.push(t0);
      for (const hand of [lh, rh]) {
        let at = t0;
        for (const [ps, d] of hand) {
          for (const p of ps) notes.push({ midi: midi(p), time: at, duration: d * beat * 0.95, velocity: hand === lh ? 70 : 62 });
          at += d * beat;
        }
      }
    });
    const { start } = audio.playSequence(notes);
    starts.forEach((s, i) => setTimeout(() => (playingIndex = i), (start + s - audio.ctx!.currentTime) * 1000));
    setTimeout(() => (playingIndex = -1), (start + voiced.length * beats * beat - audio.ctx!.currentTime) * 1000);
  }
  const PATTERN_LABEL: Record<string, string> = { block: 'Block chords', pulse: 'Pulsed chords', broken: 'Broken bass', alberti: 'Alberti bass', waltz: 'Waltz', arpeggio: 'Arpeggio', stride: 'Stride', charleston: 'Comping', walking: 'Walking bass', bossa: 'Bossa nova' };
</script>

<Widget {title} subtitle={subtitle || 'Coloured by function: blue tonic, green predominant, orange dominant.'}>
  {#snippet controls()}
    {#if tonics}
      <Segmented options={tonics.split(',').map((x) => ({ value: x, label: noteName(parsePitch(x), settings.nameOptions) + (mode === 'minor' ? 'm' : '') }))} value={t} label="Key" onchange={(v) => (t = v)} size="sm" />
    {/if}
    {#if patterns.includes(',')}
      <Segmented options={patterns.split(',').map((x) => ({ value: x as Pattern, label: PATTERN_LABEL[x] ?? x }))} value={pat} label="Accompaniment" onchange={(v) => (pat = v)} size="sm" />
    {/if}
    <button class="go" onclick={play}><Icon name="play" size={14} /> Play</button>
  {/snippet}
  <div class="pp ui">
    <ol class="numerals" aria-label="The progression">
      {#each list as r, i (i)}
        <li class={functionOf(r) ?? ''} class:now={playingIndex === i}>
          <span class="rn">{r}</span><span class="sym">{chordSymbol(chords[i]!, settings.nameOptions)}</span><span class="fn">{({ tonic: 'T', predominant: 'PD', dominant: 'D' } as Record<string, string>)[functionOf(r) ?? ''] ?? ''}</span>
        </li>
      {/each}
    </ol>
    <Score {src} play={false} label="The progression as played" />
  </div>
</Widget>

<style>
  .pp {
    padding: 0.7rem 1.15rem 1rem;
  }
  .numerals {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0 0 0.4rem;
    padding: 0;
  }
  .numerals li {
    display: grid;
    justify-items: center;
    min-width: 3.4rem;
    padding: 0.3rem 0.5rem;
    border-radius: var(--radius-sm);
    border: 2px solid var(--line-strong);
    transition: transform 80ms;
  }
  .numerals li.tonic {
    border-color: var(--fn-t);
  }
  .numerals li.predominant {
    border-color: var(--fn-pd);
  }
  .numerals li.dominant {
    border-color: var(--fn-d);
  }
  .numerals li.now {
    transform: translateY(-3px);
    background: var(--accent-soft);
  }
  .rn {
    font-family: var(--font-body);
    font-size: 1.15rem;
    font-weight: 600;
  }
  .sym {
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .fn {
    font-size: 0.62rem;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--mute);
  }
  .tonic .fn {
    color: var(--fn-t);
  }
  .predominant .fn {
    color: var(--fn-pd);
  }
  .dominant .fn {
    color: var(--fn-d);
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: var(--accent);
    color: var(--on-accent);
    border: 0;
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
</style>

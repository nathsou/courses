<!--
  A melody over chords, every note labelled by its role: chord tone, or which kind of non-chord tone.
  The chord for each note is the last chord symbol at or before it. Choose a melody; the labels are worked
  out by the course (src/lib/music/melody.ts), not typed in.
-->
<script lang="ts">
  import { chordTones, parseChordSymbol } from '$lib/music/chord';
  import { classify, ROLE_LABEL, ROLE_SHORT, type NoteRole } from '$lib/music/melody';
  import { midi, pitchClass } from '$lib/music/pitch';
  import { parseScore } from '$lib/notation/parse';
  import Score from '$lib/notation/Score.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  const MELODIES: { label: string; src: string }[] = [
    { label: 'Passing and neighbour notes', src: String.raw`\time 4/4 \tempo 84 c''4^"C" d''4 e''4 g''4 | a''4^"F" g''4 a''4 c'''4 | d''4^"G" c''4 b'4 g'4 | e''4^"C" d''4 c''2 |` },
    { label: 'Appoggiaturas and escape notes', src: String.raw`\time 4/4 \tempo 72 g'4^"C" d''4 c''4 e''4 | f''4^"G" g''4 d''4 b'4 | a'4^"F" c''4 d''4 a'4 | g'4^"C" f''4 e''2 |` },
    { label: 'Suspensions and an anticipation', src: String.raw`\time 4/4 \tempo 66 a'2^"F" c''2~ | c''4^"G" b'4 d''2 | d''2^"G" b'4 c''4 | c''1^"C" |` },
  ];
  let which = $state(0);
  const src = $derived(MELODIES[which]!.src);
  const roles = $derived.by(() => {
    const sc = parseScore(src);
    const evs = sc.staves[0]!.events.filter((e) => e.kind === 'note');
    let chord: number[] = [];
    const notes = evs.map((e, i) => {
      if (e.above) chord = chordTones(parseChordSymbol(e.above)).map(pitchClass);
      const prev = evs[i - 1];
      return { midi: midi(e.pitches[0]!), chord, tied: !!prev?.tie && midi(prev.pitches[0]!) === midi(e.pitches[0]!), id: e.id };
    });
    const r = classify(notes);
    return notes.map((n, i) => ({ id: n.id, role: r[i]! }));
  });
  const annotate = $derived(Object.fromEntries(roles.map((x) => [x.id, ROLE_SHORT[x.role]])));
  const marks = $derived(Object.fromEntries(roles.filter((x) => x.role !== 'chord').map((x) => [x.id, 'dominant'])));
  const used = $derived([...new Set(roles.map((x) => x.role))] as NoteRole[]);
</script>

<Widget title="Chord tones and the notes between" subtitle="Notes outside the chord are coloured; the label under each note says what kind it is.">
  {#snippet controls()}
    <Segmented options={MELODIES.map((m, i) => ({ value: i, label: m.label }))} value={which} label="Melody" onchange={(v) => (which = v)} size="sm" />
  {/snippet}
  <div class="nct ui">
    <Score {src} {annotate} {marks} label="A melody over chords, each note labelled" />
    <p class="legend">{used.map((r) => `${ROLE_SHORT[r]} = ${ROLE_LABEL[r]}`).join(' · ')}</p>
  </div>
</Widget>

<style>
  .nct {
    padding: 0.6rem 1.15rem 1rem;
  }
  .legend {
    margin: 0.3rem 0 0;
    font-size: 0.86rem;
    color: var(--ink-2);
  }
</style>

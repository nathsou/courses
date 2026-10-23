<!--
  Straight and swung quavers: the same written line, played with the beat split evenly (1:1) or long-short.
  Triplet swing is 2:1; the slider runs from straight to a hard 3:1.
-->
<script lang="ts">
  import { audio, type ScheduledNote } from '$lib/audio/engine.svelte';
  import Score from '$lib/notation/Score.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let ratio = $state(2);
  const BPM = 120;
  // A line written for the course: quavers over a walking crotchet bass.
  const melody = [67, 69, 71, 74, 76, 74, 71, 69, 67, 64, 67, 69, 71, 69, 67, 62];
  const bass = [43, 47, 50, 52, 48, 52, 55, 50];
  const src = String.raw`\time 4/4 \tempo 120 \staff treble g'8 a' b' d'' e'' d'' b' a' | g' e' g' a' b' a' g' d' | \staff bass g,4 b, d e | c e g d |`;
  function play() {
    const beat = 60 / BPM;
    const long = (beat * ratio) / (ratio + 1);
    const notes: ScheduledNote[] = [];
    melody.forEach((m, i) => {
      const b = Math.floor(i / 2);
      const t = b * beat + (i % 2 ? long : 0);
      notes.push({ midi: m, time: t, duration: (i % 2 ? beat - long : long) * 0.9, velocity: i % 2 ? 60 : 78 });
    });
    bass.forEach((m, i) => notes.push({ midi: m, time: i * beat, duration: beat * 0.9, velocity: 70 }));
    const { start } = audio.playSequence(notes);
    for (let i = 0; i < 8; i++) audio.click(start + i * beat, i % 4 === 0);
  }
</script>

<Widget title="Straight or swung" subtitle="The same written quavers. At 1:1 each beat splits evenly; at 2:1 the first quaver of each pair lasts twice as long as the second, the swing of jazz.">
  <div class="sw ui">
    <Score {src} play={false} label="A line of quavers over a bass" />
    <Slider bind:value={ratio} min={1} max={3} step={0.1} label="Long : short" format={(v) => `${v.toFixed(1)} : 1${Math.abs(v - 1) < 0.05 ? ' (straight)' : Math.abs(v - 2) < 0.05 ? ' (triplet swing)' : ''}`} />
    <button onclick={play}><Icon name="play" size={14} /> Play</button>
  </div>
</Widget>

<style>
  .sw {
    display: grid;
    gap: 0.6rem;
    padding: 0.6rem 1.15rem 1rem;
    justify-items: start;
  }
  .sw :global(figure.score) {
    width: 100%;
  }
  button {
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

<!--
  Play two keys (or hold them together): the interval between them, counted on the letters and named by its
  quality, with its size in semitones and its inversion. Flip the upper note's spelling to see how the
  name follows the letters: C up to D♯ is an augmented second, C up to E♭ a minor third.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { intervalBetween, intervalName, invert } from '$lib/music/interval';
  import { pitchName } from '$lib/music/names';
  import { midi, spell, spellings, type Pitch } from '$lib/music/pitch';
  import Score from '$lib/notation/Score.svelte';
  import { pitchToken } from '$lib/notation/write';
  import Keyboard, { type Mark } from '$lib/widgets/Keyboard.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';

  let lo: Pitch = $state(spell(60, 0));
  let hi: Pitch = $state(spell(67, 0));
  let waiting = $state(false);
  onMount(() =>
    instrument.subscribe((e) => {
      if (!e.on) return;
      const p = spell(e.midi, 0);
      if (!waiting) {
        lo = p;
        waiting = true;
      } else {
        hi = p;
        waiting = false;
        if (midi(hi) < midi(lo)) [lo, hi] = [hi, lo];
      }
    }),
  );
  const iv = $derived.by(() => {
    try {
      return intervalBetween(lo, hi);
    } catch {
      return undefined;
    }
  });
  const inv = $derived(iv && iv.number <= 8 ? invert(iv) : undefined);
  function flip() {
    const all = spellings(hi);
    const i = all.findIndex((q) => q.letter === hi.letter && q.alter === hi.alter);
    hi = all[(i + 1) % all.length]!;
  }
  const src = $derived(`\\hidetime \\time 3/4 \\tempo 70 ${pitchToken(lo)}4 ${pitchToken(hi)}4 <${pitchToken(lo)} ${pitchToken(hi)}>4 |`);
  const marks = $derived({ [midi(lo)]: 'target', [midi(hi)]: 'target' } as Record<number, Mark>);
  function hear() {
    audio.playSequence([
      { midi: midi(lo), time: 0, duration: 0.7 },
      { midi: midi(hi), time: 0.75, duration: 0.7 },
      { midi: midi(lo), time: 1.5, duration: 1.2 },
      { midi: midi(hi), time: 1.5, duration: 1.2 },
    ]);
  }
</script>

<Widget title="Interval lab" subtitle="Play one key, then another. The interval is named from the letters and measured in semitones.">
  <div class="il ui">
    <div class="top">
      <div class="staff"><Score {src} play={false} label="The two notes, one after the other and together" /></div>
      <div aria-live="polite">
        <p class="pair">{pitchName(lo, settings.nameOptions)} → {pitchName(hi, settings.nameOptions)}</p>
        {#if iv}
          <p class="big">{intervalName(iv)}</p>
          <p>{iv.number} letters counting both ends, {iv.semitones} semitones{inv ? `; inverted, a ${intervalName(inv)}` : ''}.</p>
        {:else}
          <p>Too far apart in letters to name simply.</p>
        {/if}
        <div class="btns">
          <button onclick={hear}>Hear it</button>
          <button onclick={flip}>Respell the upper note</button>
        </div>
        {#if waiting}<p class="mute">Now play the second note.</p>{/if}
      </div>
    </div>
    <Keyboard lo={48} hi={84} {marks} showHeld={false} labels="marked" names={{ [midi(lo)]: lo, [midi(hi)]: hi }} label="Keyboard: play two notes" />
  </div>
</Widget>

<style>
  .il {
    display: grid;
    gap: 0.6rem;
    padding: 0.9rem 1.15rem 1rem;
  }
  .top {
    display: grid;
    grid-template-columns: minmax(0, 13rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 520px) {
    .top {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  p {
    margin: 0.15rem 0;
    font-size: 0.92rem;
  }
  .pair {
    font-weight: 600;
  }
  .big {
    font-family: var(--font-display);
    font-size: 1.7rem;
    font-weight: 600;
  }
  .btns {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.7rem;
    font-weight: 600;
    cursor: pointer;
  }
  .mute {
    color: var(--mute);
  }
</style>

<!--
  Press two keys, one after the other: the distance between them in semitones, and what it is called.
  Every key it touches is listed with both of its names where it has two.
-->
<script lang="ts">
  import { instrument } from '$lib/midi/instrument.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { enharmonic, isBlackKey, spell } from '$lib/music/pitch';
  import Keyboard, { type Mark } from '$lib/widgets/Keyboard.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import { onMount } from 'svelte';

  let a: number | undefined = $state();
  let b: number | undefined = $state();
  onMount(() =>
    instrument.subscribe((e) => {
      if (!e.on) return;
      if (a === undefined || b !== undefined) {
        a = e.midi;
        b = undefined;
      } else b = e.midi;
    }),
  );
  const both = (m: number) => {
    const p = spell(m, 1);
    const q = enharmonic(p);
    return isBlackKey(m) && q ? `${noteName(p, settings.nameOptions)} or ${noteName(q, settings.nameOptions)}` : noteName(p, settings.nameOptions);
  };
  const d = $derived(a !== undefined && b !== undefined ? Math.abs(b - a) : undefined);
  const what = $derived(d === undefined ? '' : d === 0 ? 'the same key' : d === 1 ? 'a semitone' : d === 2 ? 'a tone (two semitones)' : d === 12 ? 'an octave (twelve semitones)' : `${d} semitones`);
  const marks = $derived.by(() => {
    const m: Record<number, Mark> = {};
    if (a !== undefined) m[a] = 'target';
    if (b !== undefined) {
      const [lo, hi] = [Math.min(a!, b), Math.max(a!, b)];
      for (let k = lo + 1; k < hi; k++) m[k] = 'hint';
      m[b] = 'target';
    }
    return m;
  });
</script>

<Widget title="Count the steps" subtitle="Play one key, then another. Every key, black or white, is one semitone from its neighbours.">
  <div class="sc ui">
    <p aria-live="polite">
      {#if a === undefined}Play a key.
      {:else if b === undefined}From {both(a)}: now play a second key.
      {:else}From {both(a)} to {both(b)}: <strong>{what}</strong>.{/if}
    </p>
    <Keyboard lo={55} hi={77} {marks} showHeld={false} labels="white" label="Keyboard: play two keys" />
  </div>
</Widget>

<style>
  .sc {
    display: grid;
    gap: 0.6rem;
    padding: 0.9rem 1.15rem 1rem;
  }
  p {
    margin: 0;
    min-height: 1.5em;
  }
</style>

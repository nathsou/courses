<!--
  Write notes: the reader plays keys to add notes (press again to remove one), flips any note to its other
  name, and checks. Spelling counts: E♭ is not D♯ here.
  YAML (```spell block): id, title, prompt, key ("Eb major"), staff (treble | bass | grand), items: [{ ask, answer: [Eb4, G4, Bb4], octave }]
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { pitchName, noteName } from '$lib/music/names';
  import { midi, spell, type Pitch } from '$lib/music/pitch';
  import Score from '$lib/notation/Score.svelte';
  import { chordScore, keyText } from '$lib/notation/write';
  import Keyboard from '$lib/widgets/Keyboard.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import { parseKey } from './play';
  import { checkSpelling, respellNote, type SpellItem, type SpellVerdict } from './spell';
  import { localise } from './localise.svelte';
  import { listening } from './active';

  interface Spec {
    id: string;
    title?: string;
    prompt?: string;
    hints?: string[];
    solution?: string;
    key?: string;
    staff?: 'treble' | 'bass' | 'grand';
    range?: [number, number];
    items: SpellItem[];
  }
  let { spec }: { spec: Spec } = $props();

  const key = $derived(parseKey(spec.key));
  let index = $state(0);
  let written: Pitch[] = $state([]);
  let verdict: SpellVerdict | undefined = $state();
  let done = $state(false);

  const item = $derived(spec.items[index]!);
  const src = $derived(chordScore([...written].sort((a, b) => midi(a) - midi(b)), { staff: spec.staff ?? 'grand', key: keyText(key.tonic, key.mode) }));

  function toggle(m: number) {
    verdict = undefined;
    const i = written.findIndex((p) => midi(p) === m);
    if (i >= 0) written = written.filter((_, j) => j !== i);
    else written = [...written, spell(m, key.fifths)];
  }
  function flip(i: number) {
    verdict = undefined;
    written = written.map((p, j) => (j === i ? respellNote(p) : p));
  }
  function check() {
    verdict = checkSpelling(written, item);
  }
  function next() {
    verdict = undefined;
    written = [];
    if (index + 1 < spec.items.length) index++;
    else {
      done = true;
      progress.markSolved(spec.id);
    }
  }
  function restart() {
    index = 0;
    written = [];
    verdict = undefined;
    done = false;
  }

  onMount(() => instrument.subscribe((e) => e.on && !done && listening(spec.id) && toggle(e.midi)));
</script>

<ExerciseFrame id={spec.id} listens kind="Write" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={spec.solution} completionLabel="Answer checked">
  <div class="spell ui" use:localise>
    {#if done}
      <p class="ok"><Icon name="check" size={15} /> Answer checked: all {spec.items.length} written correctly. <button onclick={restart}>Again</button></p>
    {:else}
      <p class="ask"><span class="n">{index + 1}/{spec.items.length}</span> {@html item.ask}</p>
      <Score src={src} play={written.length > 0} label="The notes you have written" />
      <div class="chips" aria-label="Notes written">
        {#each written as p, i (i)}
          <span class="chip">{pitchName(p, settings.nameOptions)}<button onclick={() => flip(i)} title="Use its other name" aria-label="Respell {pitchName(p, settings.nameOptions)}">⇄</button><button onclick={() => (written = written.filter((_, j) => j !== i))} aria-label="Remove">×</button></span>
        {:else}
          <span class="mute">Play keys to write notes; play a key again to remove it.</span>
        {/each}
      </div>
      <Keyboard lo={spec.range?.[0] ?? 48} hi={spec.range?.[1] ?? 79} marks={Object.fromEntries(written.map((p) => [midi(p), 'target']))} fifths={key.fifths} showHeld={false} label="Keyboard to write with" />
      <div class="row" aria-live="polite">
        {#if verdict?.ok}
          <p class="ok"><Icon name="check" size={14} /> Right: {written.map((p) => noteName(p, settings.nameOptions)).join(' ')}.</p>
          <button class="go" onclick={next}>{index + 1 < spec.items.length ? 'Next' : 'Finish'} →</button>
        {:else}
          <button class="go" disabled={!written.length} onclick={check}>Check</button>
          {#if verdict}<p class="bad">{verdict.detail}</p>{/if}
        {/if}
      </div>
    {/if}
  </div>
</ExerciseFrame>

<style>
  .spell {
    display: grid;
    gap: 0.6rem;
  }
  .ask {
    margin: 0;
    font-family: var(--font-body);
    font-size: 1.05rem;
  }
  .ask .n {
    font-family: var(--font-ui);
    font-size: 0.75rem;
    color: var(--mute);
    margin-right: 0.3rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-height: 1.8rem;
    align-items: center;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: 0.1rem 0.25rem 0.1rem 0.6rem;
    font-weight: 600;
  }
  .chip button {
    border: 0;
    background: none;
    cursor: pointer;
    color: var(--ink-2);
    padding: 0 0.25rem;
  }
  .row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
  }
  .row p {
    margin: 0;
  }
  .row button,
  .ok button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
  .go {
    background: var(--accent) !important;
    color: var(--on-accent);
    border-color: var(--accent) !important;
  }
  .go:disabled {
    opacity: 0.5;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0;
  }
  .bad {
    color: var(--bad);
  }
  .mute {
    color: var(--mute);
    font-size: 0.88rem;
  }
</style>

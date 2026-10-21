<!--
  An exercise played on the reader's keyboard (MIDI, computer keyboard or the on-screen one). Each step
  names notes or a chord; the step passes when exactly those notes are held down together. The result
  says what was established: "Played and checked" (every step matched what was held), nothing more.

  YAML (```play block):
    id, title, prompt, hints, solution
    key: "C major"            spelling of names and keys (default C major)
    range: [48, 84]           keys shown
    steps:
      - chord: Am             any octave, any order, doublings allowed (pitch classes must match exactly)
      - notes: [C4, E4, G4]   exactly these keys
      - notes: [C, E, G]      these notes in any octave
        label: "C major"      what the step chip shows (default: the chord symbol or note names)
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { check, parseKey, targetOf, type PlaySpec, type PlayStep } from './play';
  import { chordSymbol, parseChordSymbol } from '$lib/music/chord';
  import { mod, parsePitch } from '$lib/music/pitch';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { identifyChord } from '$lib/music/chord';
  import { noteName } from '$lib/music/names';
  import { spell } from '$lib/music/pitch';
  import Keyboard, { type Mark } from '$lib/widgets/Keyboard.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import { localise } from './localise.svelte';

  let { spec }: { spec: PlaySpec } = $props();

  const key = $derived(parseKey(spec.key));
  const targets = $derived(spec.steps.map(targetOf));
  let step = $state(0);
  let passed = $state(false);
  let wrong: number[] = $state([]);
  let showKeys = $state(false);
  /** Set when every step was matched in this run (not from an earlier visit). */
  let justPassed = $state(false);

  const held = $derived([...instrument.held].sort((a, b) => a - b));
  const heard = $derived.by(() => {
    if (!held.length) return '';
    const names = held.map((m) => noteName(spell(m, key.fifths), settings.nameOptions)).join(' ');
    const chord = identifyChord(held, key.fifths)[0];
    return chord ? `${names} — ${chordSymbol(chord.chord, settings.nameOptions)}` : names;
  });

  /** Label of a step in the reader's note names. */
  function label(s: PlayStep): string {
    if (s.label) return s.label;
    if (s.chord) return chordSymbol(parseChordSymbol(s.chord), settings.nameOptions);
    return (s.notes ?? []).map((n) => {
      const p = parsePitch(n);
      return noteName(p, settings.nameOptions) + (/\d$/.test(n) ? String(p.octave) : '');
    }).join(' ');
  }

  const marks = $derived.by((): Record<number, Mark> => {
    const out: Record<number, Mark> = {};
    if (showKeys && !passed) {
      const t = targets[step]!;
      const lo = spec.range?.[0] ?? 48;
      const hi = spec.range?.[1] ?? 84;
      if (t.exact) for (const m of t.exact) out[m] = 'target';
      else for (let m = lo; m <= hi; m++) if (t.pcs!.includes(mod(m, 12))) out[m] = 'target';
    }
    for (const m of wrong) out[m] = 'wrong';
    for (const m of held) if (!(m in out) && !wrong.includes(m)) out[m] = passed ? 'ok' : 'target';
    return out;
  });

  let settle: number | undefined;
  /** Judge the held keys. Wrong notes are reported only after a key goes down, not while a chord is let go. */
  function evaluate(afterPress: boolean) {
    if (passed) return;
    const h = [...instrument.held];
    if (!h.length) {
      wrong = [];
      return;
    }
    const r = check(h, targets[step]!);
    wrong = afterPress ? r.wrong : wrong.filter((m) => instrument.held.has(m));
    if (r.ok) {
      wrong = [];
      if (step + 1 < targets.length) step++;
      else {
        passed = true;
        justPassed = true;
        progress.markSolved(spec.id);
      }
    }
  }

  function restart() {
    step = 0;
    passed = false;
    justPassed = false;
    wrong = [];
  }

  onMount(() =>
    instrument.subscribe((e) => {
      // Chords arrive one note at a time: wait a moment for the rest before judging.
      clearTimeout(settle);
      settle = window.setTimeout(() => evaluate(e.on), 90);
    }),
  );
</script>

<ExerciseFrame id={spec.id} kind="At the keyboard" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={spec.solution} completionLabel="Played and checked">
  <div class="play-ex ui" use:localise>
    <ol class="steps" aria-label="Steps">
      {#each spec.steps as s, i (i)}
        <li class:done={passed || i < step} class:current={!passed && i === step} aria-current={!passed && i === step ? 'step' : undefined}>
          {#if passed || i < step}<Icon name="check" size={13} />{/if}
          {label(s)}
        </li>
      {/each}
    </ol>
    <Keyboard lo={spec.range?.[0] ?? 48} hi={spec.range?.[1] ?? 84} {marks} fifths={key.fifths} labels={showKeys ? 'marked' : 'c'} label="Keyboard for this exercise" />
    <div class="status" aria-live="polite">
      {#if passed}
        <p class="ok"><Icon name="check" size={15} /> {justPassed ? 'Played and checked: every step matched the keys you held.' : 'Played and checked earlier.'}</p>
      {:else if wrong.length}
        <p class="bad">Not in {label(spec.steps[step]!)}: {wrong.map((m) => noteName(spell(m, key.fifths), settings.nameOptions)).join(', ')}</p>
      {:else if heard}
        <p>You are holding {heard}</p>
      {:else}
        <p class="mute">Step {step + 1} of {spec.steps.length}: play {label(spec.steps[step]!)}.</p>
      {/if}
    </div>
    <div class="actions">
      <label class="show"><input type="checkbox" bind:checked={showKeys} /> Show me the keys</label>
      {#if step > 0 || passed}<button onclick={restart}><Icon name="reset" size={14} /> Start again</button>{/if}
    </div>
  </div>
</ExerciseFrame>

<style>
  .play-ex {
    display: grid;
    gap: 0.75rem;
  }
  .steps {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
  }
  .steps li {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.7rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.92rem;
    color: var(--ink-2);
  }
  .steps li.current {
    border-color: var(--accent);
    color: var(--accent-ink);
    background: var(--accent-soft);
  }
  .steps li.done {
    color: var(--ok);
    border-color: var(--ok);
  }
  .status p {
    margin: 0;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .bad {
    color: var(--bad);
  }
  .mute {
    color: var(--ink-2);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.2rem;
    font-size: 0.88rem;
  }
  .show {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    cursor: pointer;
  }
  .actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.7rem;
    cursor: pointer;
    font-weight: 600;
  }
</style>

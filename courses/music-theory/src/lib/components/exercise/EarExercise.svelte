<!--
  Ear training: the course plays something; the reader names it (buttons) or plays it back on the keyboard.
  A run is a fixed number of rounds; passing needs `pass` right answers in that run ("Answer checked: n of m").
  YAML (```ear block): see ear.ts for the fields.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { spell } from '$lib/music/pitch';
  import Keyboard from '$lib/widgets/Keyboard.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import { question, rng, type EarSpec, type Question } from './ear';
  import { localise } from './localise.svelte';
  import { listening } from './active';

  let { spec }: { spec: EarSpec } = $props();

  const rounds = $derived(spec.rounds ?? 10);
  const pass = $derived(spec.pass ?? Math.ceil(rounds * 0.8));
  let r = rng(Date.now() % 100000);
  let round = $state(0);
  let right = $state(0);
  let q: Question | undefined = $state();
  let answered: string | undefined = $state();
  let finished = $state(false);
  let played: number[] = $state([]);
  let unsub: (() => void) | undefined;

  const playbackMode = $derived(!!q?.playback);
  const name = (m: number) => noteName(spell(m, 0), settings.nameOptions);

  function hear() {
    if (!q) return;
    const gap = spec.kind === 'scale' || spec.kind === 'echo' ? 0.45 : 0.85;
    audio.playSequence(q.play.flatMap((group, i) => group.map((m) => ({ midi: m, time: i * gap, duration: gap * 0.95, velocity: 76 }))));
  }

  function next() {
    answered = undefined;
    played = [];
    if (round >= rounds) {
      finished = true;
      unsub?.();
      if (right >= pass) progress.markSolved(spec.id);
      return;
    }
    q = question(spec, r);
    round++;
    hear();
  }

  function start() {
    r = rng(Date.now() % 100000);
    round = 0;
    right = 0;
    finished = false;
    unsub?.();
    unsub = instrument.subscribe((e) => {
      if (!e.on || !q?.playback || answered !== undefined || !listening(spec.id)) return;
      played = [...played, e.midi];
      const want = q.playback.flat();
      const i = played.length - 1;
      const octaveFree = spec.kind === 'pitch' && spec.pool?.includes('any-octave');
      const ok = octaveFree ? played[i]! % 12 === want[i]! % 12 : played[i] === want[i];
      if (!ok) answer('wrong');
      else if (played.length === want.length) answer(q.answer);
    });
    next();
  }

  function answer(v: string) {
    if (!q || answered !== undefined) return;
    answered = v;
    if (v === q.answer) right++;
  }

  const answerText = $derived.by(() => {
    if (!q) return '';
    if (q.playback) return q.playback.flat().map(name).join(' ');
    return q.options.find((o) => o.value === q!.answer)?.label ?? q.answer;
  });

  onDestroy(() => unsub?.());
</script>

<ExerciseFrame id={spec.id} listens={spec.kind === "pitch" || spec.kind === "echo"} kind="Ear" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={spec.solution} completionLabel="Answer checked">
  <div class="ear ui" use:localise>
    {#if !q || finished}
      <div class="row">
        <button class="go" onclick={start}><Icon name="play" size={14} /> {finished ? 'Another run' : 'Start'}</button>
        <p aria-live="polite">
          {#if finished}
            <span class:ok={right >= pass}>{#if right >= pass}<Icon name="check" size={14} /> {'Answer checked: '}{/if}{right} of {rounds} right{right >= pass ? '.' : `; ${pass} passes. Try another run.`}</span>
          {:else}
            {rounds} rounds; {pass} right answers pass. Headphones help.
          {/if}
        </p>
      </div>
    {:else}
      <div class="row">
        <button onclick={hear}><Icon name="volume" size={14} /> Hear it again</button>
        <span class="count">Round {round} of {rounds} · {right} right</span>
      </div>
      {#if playbackMode}
        <p class="mute">Play {q.playback!.flat().length === 1 ? 'the note' : 'the notes'} back on your keyboard.</p>
        <Keyboard lo={(spec.range?.[0] ?? 48) - 5} hi={(spec.range?.[1] ?? 72) + 5} marks={answered !== undefined ? Object.fromEntries(q.playback!.flat().map((m) => [m, answered === q!.answer ? 'ok' : 'target'])) : {}} label="Keyboard to answer on" />
      {:else}
        <div class="options" role="group" aria-label="Answers">
          {#each q.options as o (o.value)}
            <button
              class:right={answered !== undefined && o.value === q.answer}
              class:wrong={answered === o.value && o.value !== q.answer}
              disabled={answered !== undefined}
              onclick={() => answer(o.value)}>{o.label}</button>
          {/each}
        </div>
      {/if}
      {#if answered !== undefined}
        <div class="row" aria-live="polite">
          <p class:ok={answered === q.answer} class:bad={answered !== q.answer}>{answered === q.answer ? 'Right.' : `It was: ${answerText}.`}</p>
          <button class="go" onclick={next}>{round >= rounds ? 'See the result' : 'Next'} →</button>
        </div>
      {/if}
    {/if}
  </div>
</ExerciseFrame>

<style>
  .ear {
    display: grid;
    gap: 0.7rem;
  }
  .row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
  }
  .row p {
    margin: 0;
    font-size: 0.92rem;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
  .go {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }
  .options button.right {
    border-color: var(--ok);
    color: var(--ok);
    background: var(--ok-soft);
  }
  .options button.wrong {
    border-color: var(--bad);
    color: var(--bad);
    background: var(--bad-soft);
  }
  button:disabled {
    cursor: default;
  }
  .count {
    font-size: 0.85rem;
    color: var(--mute);
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .bad {
    color: var(--bad);
  }
  .mute {
    margin: 0;
    color: var(--ink-2);
    font-size: 0.92rem;
  }
</style>

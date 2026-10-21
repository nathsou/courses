<!--
  Reading drill: one note at a time on the staff; play it. Counts right answers and how long each took.
  YAML (```read block): id, title, prompt, staff (treble | bass | grand), range: [C4, G5], white (true),
  key ("C major"), rounds (20), pass (18)
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { pitchName } from '$lib/music/names';
  import { isBlackKey, midi, parsePitch, spell, type Pitch } from '$lib/music/pitch';
  import Score from '$lib/notation/Score.svelte';
  import { chordScore, keyText } from '$lib/notation/write';
  import Keyboard from '$lib/widgets/Keyboard.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import { parseKey } from './play';
  import { rng } from './ear';
  import { localise } from './localise.svelte';

  interface Spec {
    id: string;
    title?: string;
    prompt?: string;
    hints?: string[];
    staff?: 'treble' | 'bass' | 'grand';
    range?: [string, string];
    white?: boolean;
    key?: string;
    rounds?: number;
    pass?: number;
  }
  let { spec }: { spec: Spec } = $props();

  const key = $derived(parseKey(spec.key));
  const lo = $derived(midi(parsePitch(spec.range?.[0] ?? 'C4')));
  const hi = $derived(midi(parsePitch(spec.range?.[1] ?? 'C5')));
  const rounds = $derived(spec.rounds ?? 20);
  const pass = $derived(spec.pass ?? Math.ceil(rounds * 0.9));
  const staffFor = (p: Pitch) => spec.staff === 'grand' ? 'grand' : (spec.staff ?? 'treble');

  let r = rng(1);
  let target: Pitch | undefined = $state();
  let round = $state(0);
  let right = $state(0);
  let times: number[] = $state([]);
  let shownAt = 0;
  let flash: 'ok' | 'bad' | undefined = $state();
  let missed: number | undefined = $state();
  let finished = $state(false);
  let unsub: (() => void) | undefined;
  let timer: number | undefined;

  function draw(): Pitch {
    for (;;) {
      const m = lo + Math.floor(r() * (hi - lo + 1));
      if ((spec.white ?? true) && isBlackKey(m)) continue;
      const p = spell(m, key.fifths);
      if (target && midi(target) === m) continue;
      return p;
    }
  }

  function next() {
    flash = undefined;
    missed = undefined;
    if (round >= rounds) {
      finished = true;
      target = undefined;
      unsub?.();
      if (right >= pass) progress.markSolved(spec.id);
      return;
    }
    round++;
    target = draw();
    shownAt = performance.now();
  }

  function start() {
    r = rng(Date.now() % 100000);
    round = 0;
    right = 0;
    times = [];
    finished = false;
    target = undefined;
    unsub?.();
    unsub = instrument.subscribe((e) => {
      if (!e.on || !target || flash) return;
      if (e.midi === midi(target)) {
        right++;
        times = [...times, (e.time - shownAt) / 1000];
        flash = 'ok';
      } else {
        flash = 'bad';
        missed = e.midi;
      }
      timer = window.setTimeout(next, flash === 'ok' ? 350 : 1300);
    });
    next();
  }

  const median = $derived.by(() => {
    if (!times.length) return 0;
    const s = [...times].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)]!;
  });

  onDestroy(() => {
    unsub?.();
    clearTimeout(timer);
  });
</script>

<ExerciseFrame id={spec.id} kind="Read" title={spec.title} prompt={spec.prompt} hints={spec.hints} completionLabel="Answer checked">
  <div class="read ui" use:localise>
    {#if target}
      <div class="note" class:ok={flash === 'ok'} class:bad={flash === 'bad'}>
        <Score src={chordScore([target], { staff: staffFor(target), key: keyText(key.tonic, key.mode) })} play={false} label="The note to play" />
      </div>
      <p class="status" aria-live="polite">
        {#if flash === 'bad' && missed !== undefined}<span class="bad">That was {pitchName(spell(missed, key.fifths), settings.nameOptions)}; this is {pitchName(target, settings.nameOptions)}.</span>
        {:else}Note {round} of {rounds} · {right} right{#if times.length} · typical time {median.toFixed(1)} s{/if}{/if}
      </p>
      <Keyboard lo={lo - 2} hi={hi + 2} labels={flash === 'bad' ? 'all' : 'c'} marks={flash === 'bad' ? { [midi(target)]: 'target' } : {}} fifths={key.fifths} label="Keyboard to answer on" />
    {:else}
      <div class="row">
        <button class="go" onclick={start}><Icon name="play" size={14} /> {finished ? 'Another run' : 'Start'}</button>
        <p aria-live="polite">
          {#if finished}
            <span class:okt={right >= pass}>{#if right >= pass}<Icon name="check" size={14} /> Answer checked: {/if}{right} of {rounds} right, typically {median.toFixed(1)} s per note.{right >= pass ? ' Next time, try to beat that time.' : ` ${pass} pass; try another run.`}</span>
          {:else}
            {rounds} notes, one at a time. Play each one as soon as you can name it.
          {/if}
        </p>
      </div>
    {/if}
  </div>
</ExerciseFrame>

<style>
  .read {
    display: grid;
    gap: 0.5rem;
  }
  .note {
    max-width: 16rem;
    border-radius: var(--radius);
    transition: background-color 150ms;
  }
  .note.ok {
    background: var(--ok-soft);
  }
  .note.bad {
    background: var(--bad-soft);
  }
  .status {
    margin: 0;
    font-size: 0.92rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem 1rem;
    flex-wrap: wrap;
  }
  .row p {
    margin: 0;
    font-size: 0.92rem;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: var(--accent);
    color: var(--on-accent);
    border: 0;
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .bad {
    color: var(--bad);
  }
  .okt {
    color: var(--ok);
    font-weight: 600;
  }
</style>

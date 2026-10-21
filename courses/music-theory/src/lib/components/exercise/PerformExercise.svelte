<!--
  Play a score on the keyboard. Three modes:
    rhythm  tap the rhythm on any key, in time with the click (checked: timing only)
    notes   play the notes in order at your own pace (checked: pitches only)
    both    play the notes in time (checked: pitches and timing)

  YAML (```perform block):
    id, title, prompt, hints, solution
    score: |            the course's score format
    mode: both          rhythm | notes | both
    tempo: 72           override the score's tempo (felt beats per minute)
    countIn: 1          bars of clicks before the start
    tolerance: 90       ms either side of each note
    click: true         keep the click going while you play
    range: [48, 84]     keyboard shown
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { spell } from '$lib/music/pitch';
  import { isCompound } from '$lib/music/rhythm';
  import { parseScore, secondsPerTick } from '$lib/notation/parse';
  import Score from '$lib/notation/Score.svelte';
  import Keyboard from '$lib/widgets/Keyboard.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import { endTime, judgeTimed, matchesOnset, onsetsOf, type Press, type TimedResult } from './perform';
  import { localise } from './localise.svelte';
  import { listening } from './active';

  interface Spec {
    id: string;
    title?: string;
    prompt?: string;
    hints?: string[];
    solution?: string;
    score: string;
    mode?: 'rhythm' | 'notes' | 'both';
    tempo?: number;
    countIn?: number;
    tolerance?: number;
    click?: boolean;
    range?: [number, number];
  }
  let { spec }: { spec: Spec } = $props();

  const mode = $derived(spec.mode ?? 'both');
  const score = $derived(parseScore(spec.score));
  const tempo = $derived(spec.tempo ?? score.tempo);
  const onsets = $derived(onsetsOf(score, tempo));
  const tolerance = $derived(spec.tolerance ?? 90);
  const label = $derived(mode === 'rhythm' ? `In time (±${tolerance} ms)` : mode === 'notes' ? 'Played and checked' : `Played and checked, in time (±${tolerance} ms)`);

  let phase: 'idle' | 'counting' | 'playing' | 'done' = $state('idle');
  let countBeat = $state(0);
  let result: TimedResult | undefined = $state();
  let step = $state(0);
  let marks: Record<number, string> = $state({});
  let presses: Press[] = [];
  /** performance.now() of the first downbeat, also exposed as data-downbeat for the browser tests. */
  let downbeat = $state(0);
  let unsub: (() => void) | undefined;
  let timers: number[] = [];
  let settle: number | undefined;
  let wrongHeld: number[] = $state([]);

  function heardAt(ctx: AudioContext, t: number): number {
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) return ts.performanceTime + (t - ts.contextTime) * 1000;
    return performance.now() + (t - ctx.currentTime + (ctx.outputLatency || ctx.baseLatency || 0)) * 1000;
  }

  function clear() {
    for (const t of timers) clearTimeout(t);
    timers = [];
    unsub?.();
    unsub = undefined;
    clearTimeout(settle);
  }

  function reset() {
    clear();
    phase = 'idle';
    result = undefined;
    step = 0;
    marks = {};
    presses = [];
    wrongHeld = [];
  }

  /** Timed modes: count in, click, record presses, then judge. */
  function startTimed() {
    reset();
    const ctx = audio.start();
    const beatsPerBar = isCompound(score.time) ? score.time.beats / 3 : score.time.beats;
    const beat = 60 / tempo;
    const countBeats = (spec.countIn ?? 1) * beatsPerBar;
    const upbeat = score.partial * ((secondsPerTick(score) * score.tempo) / tempo);
    const T = ctx.currentTime + 0.4 + (countBeats + Math.ceil(upbeat / beat - 1e-6)) * beat;
    const total = endTime(score, tempo);
    const clickUntil = spec.click === false ? T - upbeat : T + total;
    // Clicks fall on the beats of the piece (beat 0 is the first downbeat), starting a full count-in before
    // the first note; the first beat of every bar is accented, so an upbeat is heard as the end of a bar.
    const first = -Math.ceil(upbeat / beat - 1e-6) - countBeats;
    for (let k = first; T + k * beat < clickUntil - 1e-6; k++) {
      const t = T + k * beat;
      audio.click(t, ((k % beatsPerBar) + beatsPerBar) % beatsPerBar === 0);
      const shown = k - first;
      timers.push(window.setTimeout(() => (countBeat = shown < countBeats ? shown + 1 : 0), (t - ctx.currentTime) * 1000));
    }
    downbeat = heardAt(ctx, T);
    phase = 'counting';
    timers.push(window.setTimeout(() => (phase = 'playing'), (T - upbeat - ctx.currentTime) * 1000));
    unsub = instrument.subscribe((e) => {
      if (e.on) presses.push({ midi: e.midi, time: (e.time - settings.latencyMs - downbeat) / 1000 });
    });
    timers.push(window.setTimeout(finishTimed, (T + total - ctx.currentTime + 0.8) * 1000));
  }

  function finishTimed() {
    clear();
    const r = judgeTimed(onsets, presses, { toleranceMs: tolerance, pitches: mode === 'both' });
    result = r;
    const m: Record<number, string> = {};
    onsets.forEach((o, i) => {
      for (const id of o.ids) m[id] = r.verdicts[i]!.verdict === 'ok' ? 'ok' : 'wrong';
    });
    marks = m;
    phase = 'done';
    if (r.passed) progress.markSolved(spec.id);
  }

  /** Untimed mode: step through the onsets as the reader plays them. */
  function startUntimed() {
    reset();
    audio.start();
    phase = 'playing';
    marks = Object.fromEntries((onsets[0]?.ids ?? []).map((id) => [id, 'target']));
    unsub = instrument.subscribe((e) => {
      if (!listening(spec.id)) return;
      clearTimeout(settle);
      settle = window.setTimeout(() => judgeUntimed(e.on), 90);
    });
  }

  function judgeUntimed(afterPress: boolean) {
    if (phase !== 'playing') return;
    const o = onsets[step];
    if (!o) return;
    const held = [...instrument.held];
    if (matchesOnset(held, o)) {
      wrongHeld = [];
      const m = { ...marks };
      for (const id of o.ids) m[id] = 'ok';
      step++;
      const next = onsets[step];
      if (next) for (const id of next.ids) m[id] = 'target';
      marks = m;
      if (!next) {
        clear();
        phase = 'done';
        result = { verdicts: onsets.map(() => ({ verdict: 'ok' })), extra: [], passed: true };
        progress.markSolved(spec.id);
      }
    } else if (afterPress) wrongHeld = held.filter((m) => !o.pitches.includes(m));
  }

  const summary = $derived.by(() => {
    if (!result) return '';
    const v = result.verdicts.map((x) => x.verdict);
    const ok = v.filter((x) => x === 'ok').length;
    const parts = [`${ok} of ${v.length} ${mode === 'rhythm' ? 'notes in time' : 'notes right'}`];
    const late = result.verdicts.filter((x) => x.verdict === 'late');
    const early = result.verdicts.filter((x) => x.verdict === 'early');
    if (early.length) parts.push(`${early.length} early (by up to ${Math.max(...early.map((x) => -(x.offsetMs ?? 0)))} ms)`);
    if (late.length) parts.push(`${late.length} late (by up to ${Math.max(...late.map((x) => x.offsetMs ?? 0))} ms)`);
    const wrong = v.filter((x) => x === 'wrong').length;
    if (wrong) parts.push(`${wrong} with wrong notes`);
    const missed = v.filter((x) => x === 'missed').length;
    if (missed) parts.push(`${missed} missed`);
    if (result.extra.length) parts.push(`${result.extra.length} extra key ${result.extra.length === 1 ? 'press' : 'presses'}`);
    return parts.join(', ');
  });

  // Timing chart: expected onsets as ticks, the reader's presses as dots, both against the beat.
  const chart = $derived.by(() => {
    if (!result || mode === 'notes') return undefined;
    const total = Math.max(endTime(score, tempo), 0.1);
    const lo = Math.min(0, ...onsets.map((o) => o.time)) - 0.2;
    const hi = total + 0.2;
    const x = (t: number) => ((t - lo) / (hi - lo)) * 600;
    return { x, onsets, presses: [...presses], verdicts: result.verdicts };
  });

  onDestroy(clear);
</script>

<ExerciseFrame id={spec.id} listens kind="At the keyboard" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={spec.solution} completionLabel={label}>
  <div class="perform ui" use:localise data-downbeat={downbeat} data-phase={phase}>
    <Score src={spec.score} {marks} {tempo} strip={false} caption={mode === 'rhythm' ? 'Listen first if you like; then tap the rhythm on any key.' : 'Listen first if you like.'} label="The score to play" />
    {#if mode !== 'rhythm'}
      <Keyboard lo={spec.range?.[0] ?? 48} hi={spec.range?.[1] ?? 84} marks={Object.fromEntries(wrongHeld.map((m) => [m, 'wrong']))} fifths={score.fifths} label="Keyboard for this exercise" />
    {/if}
    <div class="controls">
      {#if phase === 'idle' || phase === 'done'}
        <button class="go" onclick={() => (mode === 'notes' ? startUntimed() : startTimed())}>
          <Icon name="play" size={14} /> {phase === 'done' ? 'Try again' : mode === 'notes' ? 'Start' : 'Start (with a count-in)'}
        </button>
      {:else}
        <button onclick={reset}><Icon name="stop" size={14} /> Stop</button>
      {/if}
      <p aria-live="polite">
        {#if phase === 'counting'}
          Count-in… {countBeat || ''}
        {:else if phase === 'playing' && mode === 'notes'}
          {#if wrongHeld.length}<span class="bad">Not this one: {wrongHeld.map((m) => noteName(spell(m, score.fifths), settings.nameOptions)).join(', ')}</span>{:else}Note {step + 1} of {onsets.length}: play the highlighted note.{/if}
        {:else if phase === 'playing'}
          Play!
        {:else if result}
          <span class:ok={result.passed}>{#if result.passed}<Icon name="check" size={14} /> {`${label}: `}{/if}{summary}.</span>
        {:else}
          {mode === 'notes' ? 'Play each note when it is highlighted. There is no clock.' : settings.latencyMs ? `Tempo ${tempo}. Your timing allows for the ${settings.latencyMs} ms delay you measured.` : `Tempo ${tempo}. For fairer timing, measure your delay once with the tap-along in the prologue.`}
        {/if}
      </p>
    </div>
    {#if chart}
      <svg class="chart" viewBox="0 -14 600 44" role="img" aria-label="Timing: expected notes as lines, your presses as dots">
        <line x1="0" y1="10" x2="600" y2="10" class="axis" />
        {#each chart.onsets as o, i (i)}
          <line x1={chart.x(o.time)} y1="0" x2={chart.x(o.time)} y2="20" class="expect {chart.verdicts[i]?.verdict}" />
        {/each}
        {#each chart.presses as p, i (i)}
          <circle cx={chart.x(p.time)} cy="10" r="3.4" class="press" />
        {/each}
        <text x="0" y="-4">expected</text>
        <text x="600" y="-4" text-anchor="end">● your presses</text>
      </svg>
    {/if}
  </div>
</ExerciseFrame>

<style>
  .perform {
    display: grid;
    gap: 0.6rem;
  }
  .controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
  }
  .controls p {
    margin: 0;
    font-size: 0.92rem;
    flex: 1 1 16rem;
  }
  .controls button {
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
  .controls .go {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .bad {
    color: var(--bad);
  }
  .chart {
    width: 100%;
    height: auto;
    max-height: 5rem;
  }
  .chart text {
    font-size: 9px;
    fill: var(--mute);
  }
  .axis {
    stroke: var(--line-strong);
  }
  .expect {
    stroke: var(--ink-3);
    stroke-width: 2;
  }
  .expect.ok {
    stroke: var(--ok);
  }
  .expect.early,
  .expect.late,
  .expect.wrong,
  .expect.missed {
    stroke: var(--bad);
  }
  .press {
    fill: var(--accent);
  }
</style>

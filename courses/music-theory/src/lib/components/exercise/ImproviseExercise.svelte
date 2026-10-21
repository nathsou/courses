<!--
  Improvise over a backing track. The course loops a chord chart with a count-in, the reader plays whatever they
  like, and afterwards every note is plotted against the chords: chord tone, tension or outside. Nothing is graded;
  the reader looks, listens back, and marks the take as reviewed ("Self-reviewed").

  YAML (```improvise block): id, title, prompt, hints, chart: ["Dm7", "G7", "Cmaj7", "Cmaj7"] (one bar each; two
  chords in a bar as "Dm7 G7"), tempo (100), choruses (2), swing (true), range ([48, 84]), beats (4)
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { chordSymbol, chordTones } from '$lib/music/chord';
  import { pitchClass } from '$lib/music/pitch';
  import Keyboard, { type Mark } from '$lib/widgets/Keyboard.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import { analyse, backing, chartSlots, summarise, type ImproviseSpec, type Placed, type Played } from './improvise';
  import { listening } from './active';
  import { localise } from './localise.svelte';

  let { spec }: { spec: ImproviseSpec } = $props();

  const beats = $derived(spec.beats ?? 4);
  const tempo = $derived(spec.tempo ?? 100);
  const choruses = $derived(spec.choruses ?? 2);
  const slots = $derived(chartSlots(spec.chart, beats));
  const chartBeats = $derived(spec.chart.length * beats);
  const total = $derived(chartBeats * choruses);

  let phase: 'idle' | 'counting' | 'playing' | 'done' = $state('idle');
  let played: Played[] = $state([]);
  let placed: Placed[] = $state([]);
  let current = $state(-1);
  let countBeat = $state(0);
  let timers: number[] = [];
  let ticker: number | undefined;
  let unsub: (() => void) | undefined;
  let downbeat = 0;
  let startAt = 0;

  const summary = $derived(summarise(placed));
  const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);
  const sym = (i: number) => chordSymbol(slots[i]!.chord, settings.nameOptions);

  const keyMarks = $derived.by((): Record<number, Mark> => {
    const out: Record<number, Mark> = {};
    if (current < 0) return out;
    const pcs = chordTones(slots[current]!.chord).map(pitchClass);
    const [lo, hi] = spec.range ?? [48, 84];
    for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) out[m] = 'hint';
    return out;
  });

  function heardAt(ctx: AudioContext, t: number): number {
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) return ts.performanceTime + (t - ts.contextTime) * 1000;
    return performance.now() + (t - ctx.currentTime + (ctx.outputLatency || ctx.baseLatency || 0)) * 1000;
  }

  function clear() {
    for (const t of timers) clearTimeout(t);
    timers = [];
    clearInterval(ticker);
    unsub?.();
    unsub = undefined;
  }

  function start() {
    clear();
    played = [];
    placed = [];
    const ctx = audio.start();
    const beat = 60 / tempo;
    const T = ctx.currentTime + 0.4 + beats * beat;
    startAt = T;
    // Count-in on every beat, then a soft click on 2 and 4 to swing against.
    for (let k = -beats; k < total; k++) {
      const t = T + k * beat;
      if (k < 0) {
        audio.click(t, k === -beats);
        timers.push(window.setTimeout(() => (countBeat = k + beats + 1), (t - ctx.currentTime) * 1000));
      } else if (k % 2 === 1) audio.click(t, false);
    }
    const notes = backing(slots, tempo, choruses, spec.swing ?? true, beats);
    const offset = T - (ctx.currentTime + 0.12);
    audio.playSequence(notes.map((n) => ({ ...n, time: n.time + offset })));
    downbeat = heardAt(ctx, T);
    phase = 'counting';
    timers.push(window.setTimeout(() => ((phase = 'playing'), (countBeat = 0)), (T - ctx.currentTime) * 1000));
    timers.push(window.setTimeout(finish, (T + total * beat - ctx.currentTime + 0.6) * 1000));
    ticker = window.setInterval(() => {
      const b = (ctx.currentTime - startAt) / beat;
      if (b < 0 || b >= total) return (current = -1);
      const inChart = b % chartBeats;
      current = slots.findIndex((s) => inChart >= s.start && inChart < s.start + s.length);
    }, 40);
    unsub = instrument.subscribe((e) => {
      if (e.on && listening(spec.id)) played = [...played, { midi: e.midi, time: (e.time - settings.latencyMs - downbeat) / 1000 }];
    });
  }

  function finish() {
    clear();
    audio.stopSequence();
    current = -1;
    placed = analyse(played, slots, tempo, choruses, beats);
    phase = 'done';
  }

  function listenBack() {
    const beat = 60 / tempo;
    const notes = [...backing(slots, tempo, choruses, spec.swing ?? true, beats), ...placed.map((p) => ({ midi: p.midi, time: Math.max(0, p.time), duration: beat * 0.6, velocity: 84 }))];
    audio.playSequence(notes);
  }

  onDestroy(() => {
    clear();
    if (phase === 'counting' || phase === 'playing') audio.stopSequence();
  });

  // The chart of the take: time across, pitch up.
  const W = 640;
  const H = 180;
  const lo = $derived(Math.min(55, ...placed.map((p) => p.midi)) - 2);
  const hi = $derived(Math.max(79, ...placed.map((p) => p.midi)) + 2);
  const x = (b: number) => 8 + ((W - 16) * b) / total;
  const y = (m: number) => 14 + ((H - 28) * (hi - m)) / (hi - lo);
</script>

<ExerciseFrame id={spec.id} listens kind="Improvise" title={spec.title} prompt={spec.prompt} hints={spec.hints} completionLabel="Self-reviewed">
  <div class="imp ui" use:localise>
    <ol class="chart" aria-label="The chord chart">
      {#each spec.chart as bar, b (b)}
        <li>
          {#each slots.filter((s) => s.bar === b) as s (s.start)}
            <span class:now={current === slots.indexOf(s)}>{sym(slots.indexOf(s))}</span>
          {/each}
        </li>
      {/each}
    </ol>
    <p class="meta">{spec.chart.length} {settings.term(spec.chart.length === 1 ? 'bar' : 'bars')}, {choruses} time{choruses > 1 ? 's' : ''} through, {tempo} beats a minute{spec.swing === false ? '' : ', swung'}.</p>

    {#if phase === 'counting' || phase === 'playing'}
      <Keyboard lo={spec.range?.[0] ?? 48} hi={spec.range?.[1] ?? 84} marks={keyMarks} label="Keyboard: the current chord’s notes are marked" />
      <p class="status" aria-live="polite">
        {#if phase === 'counting'}Count-in: {countBeat || ''}{:else}Play! The current chord’s notes are marked on the keyboard. {played.length} note{played.length === 1 ? '' : 's'} so far.{/if}
      </p>
      <div class="actions"><button onclick={finish}><Icon name="stop" size={14} /> Stop</button></div>
    {:else}
      {#if phase === 'done'}
        {#if summary.total}
          <svg class="take" viewBox="0 0 {W} {H}" role="img" aria-label="Your notes against the chords: {summary.chord} chord tones, {summary.tension} tensions, {summary.outside} outside">
            {#each Array.from({ length: spec.chart.length * choruses + 1 }, (_, i) => i) as i (i)}
              <line x1={x(i * beats)} x2={x(i * beats)} y1="10" y2={H - 10} class="bar" />
            {/each}
            {#each Array.from({ length: choruses }, (_, c) => c) as c (c)}
              {#each slots as s, i (i)}
                <text x={x(c * chartBeats + s.start) + 3} y="10" class="sym">{sym(i)}</text>
              {/each}
            {/each}
            {#each placed as p, i (i)}
              <circle cx={x(p.beat)} cy={y(p.midi)} r={p.strong ? 4.2 : 3.2} class={p.category} />
            {/each}
          </svg>
          <ul class="legend">
            <li><span class="dot chord"></span> chord tones: {summary.chord} ({pct(summary.chord, summary.total)}%)</li>
            <li><span class="dot tension"></span> tensions (9ths, 11ths, 13ths): {summary.tension}</li>
            <li><span class="dot outside"></span> outside: {summary.outside}</li>
            <li>On beats 1 and 3 (larger dots): {summary.strongChord} of {summary.strong} were chord tones.</li>
          </ul>
          <p class="mute">Outside notes are not mistakes: approach notes and blue notes live there. Look for them resolving to a chord tone.</p>
        {:else}
          <p class="mute">No notes were heard in that take.</p>
        {/if}
      {/if}
      <div class="actions">
        <button class="go" onclick={start}><Icon name="play" size={14} /> {phase === 'done' ? 'Another take' : 'Start (with a count-in)'}</button>
        {#if phase === 'done' && summary.total}
          <button onclick={listenBack}><Icon name="volume" size={14} /> Listen back</button>
          <button onclick={() => progress.markSolved(spec.id)}><Icon name="check" size={14} /> Mark as reviewed</button>
        {/if}
      </div>
    {/if}
  </div>
</ExerciseFrame>

<style>
  .imp {
    display: grid;
    gap: 0.6rem;
  }
  .chart {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    margin: 0;
    padding: 0;
    border-left: 2px solid var(--line-strong);
  }
  .chart li {
    display: flex;
    gap: 0.4rem;
    padding: 0.35rem 0.5rem;
    border-right: 2px solid var(--line-strong);
    font-weight: 600;
    font-size: 1.02rem;
  }
  .chart span.now {
    color: var(--accent-ink);
    background: var(--accent-soft);
    border-radius: 3px;
    padding: 0 0.2rem;
  }
  .meta,
  .status {
    margin: 0;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    font-weight: 600;
  }
  .actions .go {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
  .take {
    width: 100%;
    height: auto;
    background: var(--chart-surface, var(--surface));
    border-radius: var(--radius-sm);
  }
  .take .bar {
    stroke: var(--line);
  }
  .take .sym {
    font-size: 9px;
    fill: var(--ink-2);
    font-family: var(--font-ui);
  }
  .take circle.chord,
  .dot.chord {
    fill: var(--ok);
    background: var(--ok);
  }
  .take circle.tension,
  .dot.tension {
    fill: var(--fn-d);
    background: var(--fn-d);
  }
  .take circle.outside {
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }
  .dot.outside {
    border: 1.5px solid var(--ink-2);
  }
  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.2rem;
    font-size: 0.9rem;
  }
  .dot {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    vertical-align: -0.05rem;
    margin-right: 0.2rem;
  }
  .mute {
    margin: 0;
    color: var(--ink-2);
    font-size: 0.88rem;
  }
</style>

<!--
  A score from the course's text format (src/lib/notation/parse.ts), engraved by our own layout and drawn
  in SVG with Bravura. Reflows to the column width. Click a note to hear it; the play button plays the
  whole score on the course piano and highlights each note as it sounds.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { audio, type ScheduledNote } from '$lib/audio/engine.svelte';
  import { midi } from '$lib/music/pitch';
  import { chordSymbol, parseChordSymbol } from '$lib/music/chord';
  import { settings } from '$lib/state/settings.svelte';
  import { ticks } from '$lib/music/rhythm';
  import { layoutScore, type Layout } from './layout';
  import { parseScore, secondsPerTick, type Score } from './parse';
  import Icon from '$lib/components/ui/Icon.svelte';

  let {
    src,
    marks = {},
    caption,
    play = true,
    tempo,
    label = 'Score',
    space = 0,
  }: {
    src: string;
    /** Extra classes by event id ("target", "wrong", "tonic" …). */
    marks?: Record<number, string>;
    caption?: string;
    /** Show the play button. */
    play?: boolean;
    /** Override the score's tempo (beats per minute). */
    tempo?: number;
    label?: string;
    /** Staff space in CSS pixels (0: chosen from the width). */
    space?: number;
  } = $props();

  const parsed = $derived.by((): { score?: Score; error?: string } => {
    try {
      return { score: parseScore(src) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });

  let box: HTMLDivElement | undefined = $state();
  let width = $state(640);
  const sp = $derived(space || (width < 480 ? 7.5 : 9));
  const layout = $derived.by((): Layout | undefined => (parsed.score ? layoutScore(parsed.score, { width: width / sp - 0.5, barNumbers: true }) : undefined));
  let fontReady = $state(false);
  let playingIds: Set<number> = $state(new Set());
  let playing = $state(false);

  function notesOf(score: Score): (ScheduledNote & { id: number })[] {
    const spt = tempo ? (secondsPerTick(score) * score.tempo) / tempo : secondsPerTick(score);
    const out: (ScheduledNote & { id: number })[] = [];
    for (const staff of score.staves) {
      const evs = staff.events;
      evs.forEach((ev, i) => {
        if (ev.kind === 'rest') return;
        // A note tied into from the previous event is already sounding.
        const prev = evs[i - 1];
        for (const p of ev.pitches) {
          const m = midi(p);
          if (prev?.tie && prev.pitches.some((q) => midi(q) === m)) continue;
          let length = ticks(ev.duration);
          for (let j = i; evs[j]?.tie && evs[j + 1]?.pitches.some((q) => midi(q) === m); j++) length += ticks(evs[j + 1]!.duration);
          out.push({ id: ev.id, midi: m, time: (ev.start + score.partial) * spt, duration: length * spt * 0.96, velocity: 72 });
        }
      });
    }
    return out;
  }

  async function toggle() {
    if (playing) {
      audio.stopSequence();
      return;
    }
    if (!parsed.score) return;
    const notes = notesOf(parsed.score);
    playing = true;
    const { done } = audio.playSequence(notes, (n, on) => {
      const id = (n as ScheduledNote & { id: number }).id;
      const s = new Set(playingIds);
      if (on) s.add(id);
      else s.delete(id);
      playingIds = s;
    });
    await done;
    playing = false;
    playingIds = new Set();
  }

  function hear(id: number) {
    const ev = parsed.score?.staves.flatMap((s) => s.events).find((e) => e.id === id);
    if (!ev || ev.kind === 'rest') return;
    for (const p of ev.pitches) audio.noteOn(midi(p), 72).stop(audio.ctx!.currentTime + 0.9);
  }

  onMount(() => {
    const ro = new ResizeObserver(() => (width = box?.clientWidth || width));
    if (box) {
      ro.observe(box);
      width = box.clientWidth || width;
    }
    document.fonts?.load('40px Bravura').then(() => (fontReady = true), () => (fontReady = true));
    return () => {
      ro.disconnect();
      if (playing) audio.stopSequence();
    };
  });

  const f = (n: number) => +n.toFixed(3);
  /** Chord symbols above the staff follow the reader's note names; other text is shown as written. */
  function textOf(s: string, kind: string): string {
    if (kind !== 'chordsym') return s;
    try {
      return chordSymbol(parseChordSymbol(s), settings.nameOptions);
    } catch {
      return s;
    }
  }
  const cls = (base: string | undefined, ev: number | undefined) => [base, ev !== undefined && playingIds.has(ev) ? 'playing' : '', ev !== undefined ? (marks[ev] ?? '') : ''].filter(Boolean).join(' ');
</script>

<figure class="score" class:loading={!fontReady}>
  <div class="frame" bind:this={box}>
    {#if parsed.error}
      <p class="error ui" role="alert">Score error: {parsed.error}</p>
    {:else if layout}
      <svg
        width={layout.width * sp}
        height={layout.height * sp}
        viewBox="0 0 {f(layout.width)} {f(layout.height)}"
        role="img"
        aria-label={label}
      >
        {#each layout.prims as p, i (i)}
          {#if p.k === 'line'}
            <line x1={f(p.x1)} y1={f(p.y1)} x2={f(p.x2)} y2={f(p.y2)} stroke-width={p.w} class={cls(p.cls, p.ev)} />
          {:else if p.k === 'glyph'}
            {#if p.sy}
              <text class="g {cls(p.cls, p.ev)}" transform="translate({f(p.x)} {f(p.y)}) scale(1 {f(p.sy)})">{p.ch}</text>
            {:else}
              <text class="g {cls(p.cls, p.ev)}" x={f(p.x)} y={f(p.y)}>{p.ch}</text>
            {/if}
          {:else if p.k === 'poly'}
            <polygon points={p.points.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')} class={cls(p.cls, p.ev)} />
          {:else if p.k === 'path'}
            <path d={p.d} class={cls(p.cls, p.ev)} />
          {:else if p.k === 'text'}
            <text class="t {cls(p.cls, p.ev)}" x={f(p.x)} y={f(p.y)} text-anchor={p.anchor}>{textOf(p.s, p.cls)}</text>
          {:else if p.k === 'hit'}
            <rect class="hit" x={f(p.x)} y={f(p.y)} width={f(p.w)} height={f(p.h)} onclick={() => hear(p.ev)} role="presentation" />
          {/if}
        {/each}
      </svg>
    {/if}
  </div>
  {#if (play && !parsed.error) || caption}
    <figcaption class="ui">
      {#if play && !parsed.error}
        <button class="play" onclick={toggle} aria-label={playing ? 'Stop' : 'Play the score'}>
          <Icon name={playing ? 'stop' : 'play'} size={14} />
          {playing ? 'Stop' : 'Play'}
        </button>
      {/if}
      {#if caption}<span class="cap">{@html caption}</span>{/if}
    </figcaption>
  {/if}
</figure>

<style>
  .score {
    margin: 1.6rem 0;
  }
  .frame {
    overflow-x: auto;
    min-width: 0;
  }
  svg {
    display: block;
    max-width: none;
  }
  .loading svg {
    visibility: hidden;
  }
  line {
    stroke: var(--ink);
  }
  line.staff,
  line.ledger {
    stroke: var(--staff);
  }
  .g {
    font-family: Bravura;
    font-size: 4px;
    fill: var(--ink);
  }
  .t {
    font-family: var(--font-ui);
    font-size: 1.75px;
    fill: var(--ink);
  }
  .chordsym {
    font-weight: 700;
  }
  .roman {
    font-family: var(--font-body);
    font-size: 1.85px;
  }
  .barnum {
    font-size: 1.2px;
    fill: var(--mute);
  }
  polygon,
  path {
    fill: var(--ink);
  }
  .playing {
    fill: var(--accent);
    stroke: var(--accent);
  }
  .g.playing,
  .t.playing,
  polygon.playing {
    stroke: none;
  }
  .target {
    fill: var(--key-target-ink);
  }
  .wrong {
    fill: var(--bad);
  }
  .ok {
    fill: var(--ok);
  }
  .tonic {
    fill: var(--fn-t);
  }
  .predominant {
    fill: var(--fn-pd);
  }
  .dominant {
    fill: var(--fn-d);
  }
  .hit {
    fill: transparent;
    cursor: pointer;
  }
  figcaption {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem 0.9rem;
    margin-top: 0.4rem;
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .play {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: 999px;
    padding: 0.2rem 0.8rem;
    cursor: pointer;
    font-weight: 600;
  }
  .play:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .error {
    color: var(--bad);
    font-size: 0.9rem;
  }
</style>

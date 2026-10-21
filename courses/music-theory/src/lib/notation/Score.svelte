<!--
  A score from the course's text format (src/lib/notation/parse.ts), engraved by our own layout and drawn
  in SVG with Bravura. Reflows to the column width.

  It can be explored: point at a note (or tap it, or step through with the arrow keys) to see its name, its
  value, the interval from the note before and the harmony sounding with it; click to hear it. Play plays the
  score with a moving cursor, from the start or from the selected note, at full, ¾ or half speed. Two
  switches, remembered for every score, write the note names under the notes and show a piano keyboard that
  lights up the notes. `reveal={false}` turns the explanations off where they would give an answer away.
-->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { audio, type ScheduledNote } from '$lib/audio/engine.svelte';
  import { midi } from '$lib/music/pitch';
  import { chordSymbol, parseChordSymbol } from '$lib/music/chord';
  import { intervalName } from '$lib/music/interval';
  import { settings } from '$lib/state/settings.svelte';
  import { localise } from '$lib/components/exercise/localise.svelte';
  import { ticks } from '$lib/music/rhythm';
  import { layoutScore, type Layout } from './layout';
  import { parseScore, secondsPerTick, voiceCount, voiceEvents, type Score } from './parse';
  import { explain, readingOrder, type Explained } from './explain';
  import { noteName, pitchName } from '$lib/music/names';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Keyboard, { type Mark } from '$lib/widgets/Keyboard.svelte';

  let {
    src,
    marks = {},
    caption,
    play = true,
    tempo,
    label = 'Score',
    space = 0,
    names = false,
    annotate = {},
    reveal = true,
    strip = true,
  }: {
    src: string;
    /** Extra classes by event id ("target", "wrong", "tonic" …). */
    marks?: Record<number, string>;
    caption?: string;
    /** Show the play button (and the speed and display switches). */
    play?: boolean;
    /** Override the score's tempo (beats per minute). */
    tempo?: number;
    label?: string;
    /** Staff space in CSS pixels (0: chosen from the width). */
    space?: number;
    /** Write each single note's name under it (for beginners), whatever the reader's switch says. */
    names?: boolean;
    /** Extra text under events, by event id (labels computed by a widget). */
    annotate?: Record<number, string>;
    /** Explain notes on hover and offer the names and keyboard switches (off where that would give an answer away). */
    reveal?: boolean;
    /** Allow the keyboard under the score (off where an exercise already shows one). */
    strip?: boolean;
  } = $props();

  const parsed = $derived.by((): { score?: Score; error?: string } => {
    try {
      return { score: parseScore(src) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });

  let figure: HTMLElement | undefined = $state();
  let box: HTMLDivElement | undefined = $state();
  let paper: HTMLDivElement | undefined = $state();
  let width = $state(640);
  const sp = $derived(space || (width < 480 ? 7.5 : 9));
  const showNames = $derived(names || (reveal && settings.scoreNames));
  const showKeys = $derived(reveal && strip && settings.scoreKeys);
  const annotated = $derived.by(() => {
    const sc = parsed.score;
    if (!sc || !Object.keys(annotate).length) return sc;
    return { ...sc, staves: sc.staves.map((st) => ({ ...st, events: st.events.map((e) => (annotate[e.id] ? { ...e, below: annotate[e.id] } : e)) })) };
  });
  const layout = $derived.by((): Layout | undefined => (annotated ? layoutScore(annotated, { width: width / sp - 0.5, barNumbers: true, noteName: showNames ? (p) => pitchName(p, settings.nameOptions) : undefined }) : undefined));
  const order = $derived(parsed.score ? readingOrder(parsed.score) : []);
  const eventById = $derived(new Map((parsed.score?.staves ?? []).flatMap((st, si) => st.events.map((e) => [e.id, { e, si }] as const))));
  let fontReady = $state(false);
  let playingIds: Set<number> = $state(new Set());
  let playingMidi: Set<number> = $state(new Set());
  let playing = $state(false);

  // ── Pointing at notes ──
  let hoverId: number | undefined = $state();
  let selId: number | undefined = $state();
  const shown = $derived(hoverId ?? selId);
  const info: Explained | undefined = $derived(reveal && shown !== undefined && parsed.score ? explain(parsed.score, shown) : undefined);
  let tip: { x: number; y: number; below: boolean } | undefined = $state();

  const SPEEDS = [1, 0.75, 0.5];
  let speed = $state(1);
  const speedLabel = (x: number) => (x === 1 ? '1×' : x === 0.75 ? '¾×' : '½×');

  /** Place the explanation above the note's system, so that it covers none of its notes (below the system near the top of the window). */
  function place() {
    if (shown === undefined || !paper || !info) {
      tip = undefined;
      return;
    }
    const hit = paper.querySelector(`rect.hit[data-ev="${shown}"]`);
    const sb = layout?.events.get(shown);
    const svg = paper.querySelector('svg');
    if (!hit || !sb || !svg) return (tip = undefined);
    const r = svg.getBoundingClientRect();
    const sx = r.width / (layout!.width || 1);
    const x = r.left + (sb.x + 0.6) * sx;
    const sys = layout!.systems[sb.system]!;
    const top = r.top + sys.top * sx;
    const bottom = r.top + sys.bottom * sx;
    const frame = box!.getBoundingClientRect();
    if (x < frame.left - 4 || x > frame.right + 4) return (tip = undefined);
    const below = top < 150;
    tip = { x: Math.min(Math.max(x, 110), window.innerWidth - 110), y: below ? bottom + 10 : top - 10, below };
  }
  $effect(() => {
    void shown;
    void info;
    void layout;
    void width;
    tick().then(place);
  });

  function point(id: number) {
    hoverId = id;
  }
  function unpoint(e: PointerEvent) {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') hoverId = undefined;
  }
  function select(id: number) {
    selId = id;
    hear(id);
  }

  /** Arrow keys step through the notes in reading order (up and down change staff), Enter or Space plays, Escape lets go. */
  function onkey(e: KeyboardEvent) {
    const sc = parsed.score;
    if (!sc || !order.length) return;
    const at = selId === undefined ? -1 : order.indexOf(selId);
    let next: number | undefined;
    if (e.key === 'ArrowRight') next = order[Math.min(order.length - 1, at + 1)];
    else if (e.key === 'ArrowLeft') next = order[Math.max(0, at - 1)];
    else if (e.key === 'Home') next = order[0];
    else if (e.key === 'End') next = order.at(-1);
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && selId !== undefined) {
      const cur = eventById.get(selId)!;
      const target = cur.si + (e.key === 'ArrowUp' ? -1 : 1);
      const same = order.map((id) => eventById.get(id)!).filter((x) => x.si === target && x.e.start <= cur.e.start);
      next = same.at(-1)?.e.id ?? selId;
    } else if ((e.key === 'Enter' || e.key === ' ') && selId !== undefined) {
      e.preventDefault();
      hear(selId);
      return;
    } else if (e.key === 'Escape') {
      selId = undefined;
      return;
    } else return;
    e.preventDefault();
    if (next === undefined) return;
    hoverId = undefined;
    selId = next;
    hear(next);
    tick().then(() => paper?.querySelector(`rect.hit[data-ev="${next}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  }

  // ── Playback, with a cursor ──
  const fromTick = $derived(selId !== undefined ? eventById.get(selId)?.e.start : undefined);
  const fromBar = $derived(selId !== undefined && fromTick !== undefined && order.length && fromTick > eventById.get(order[0]!)!.e.start ? eventById.get(selId)!.e.bar : undefined);
  let cursor: { x: number; top: number; bottom: number } | undefined = $state();

  function spt(score: Score) {
    return (tempo ? (secondsPerTick(score) * score.tempo) / tempo : secondsPerTick(score)) / speed;
  }

  function notesOf(score: Score, from = -Infinity): (ScheduledNote & { id: number })[] {
    const s = spt(score);
    const out: (ScheduledNote & { id: number })[] = [];
    const origin = Number.isFinite(from) ? from : -score.partial;
    for (const staff of score.staves) for (let v = 0; v < voiceCount(staff); v++) {
      const evs = voiceEvents(staff, v);
      evs.forEach((ev, i) => {
        if (ev.kind === 'rest' || ev.start < from) return;
        // A note tied into from the previous event is already sounding (unless playback starts here).
        const prev = evs[i - 1];
        for (const p of ev.pitches) {
          const m = midi(p);
          if (prev?.tie && prev.pitches.some((q) => midi(q) === m) && prev.start >= from) continue;
          let length = ticks(ev.duration);
          for (let j = i; evs[j]?.tie && evs[j + 1]?.pitches.some((q) => midi(q) === m); j++) length += ticks(evs[j + 1]!.duration);
          out.push({ id: ev.id, midi: m, time: (ev.start - origin) * s, duration: length * s * 0.96, velocity: 72 });
        }
      });
    }
    return out;
  }

  /** Where the cursor stands at a tick: interpolated between the columns of the system that holds it. */
  function cursorAt(t: number) {
    const sys = layout?.systems.find((y) => t >= y.startTick && t < y.endTick) ?? layout?.systems.at(-1);
    if (!sys || !sys.columns.length) return undefined;
    const cols = sys.columns;
    let i = cols.findLastIndex((c) => c.tick <= t);
    if (i < 0) i = 0;
    const a = cols[i]!;
    const b = cols[i + 1] ?? { tick: sys.endTick, x: Math.min(layout!.width - 1, a.x + 4) };
    const x = a.x + (b.tick > a.tick ? ((t - a.tick) / (b.tick - a.tick)) * (b.x - a.x) : 0);
    return { x: x + 0.6, top: sys.top + 1, bottom: sys.bottom - 1 };
  }

  let raf = 0;
  async function toggle() {
    if (playing) {
      audio.stopSequence();
      return;
    }
    const sc = parsed.score;
    if (!sc) return;
    const from = fromBar !== undefined && fromTick !== undefined ? fromTick : -sc.partial;
    const notes = notesOf(sc, from);
    const s = spt(sc);
    playing = true;
    const seq = audio.playSequence(notes, (n, on) => {
      const id = (n as ScheduledNote & { id: number }).id;
      const ids = new Set(playingIds);
      const ms = new Set(playingMidi);
      if (on) {
        ids.add(id);
        ms.add(n.midi);
      } else {
        ids.delete(id);
        ms.delete(n.midi);
      }
      playingIds = ids;
      playingMidi = ms;
    });
    const end = from + Math.max(0, ...notes.map((n) => n.time + n.duration)) / s;
    const frame = () => {
      const now = audio.ctx ? audio.ctx.currentTime - seq.start : -1;
      cursor = now >= 0 ? cursorAt(Math.min(end, from + now / s)) : undefined;
      if (playing) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    await seq.done;
    cancelAnimationFrame(raf);
    playing = false;
    cursor = undefined;
    playingIds = new Set();
    playingMidi = new Set();
  }

  function hear(id: number) {
    const ev = eventById.get(id)?.e;
    if (!ev || ev.kind === 'rest') return;
    for (const p of ev.pitches) audio.noteOn(midi(p), 72).stop(audio.ctx!.currentTime + 0.9);
  }

  // ── The keyboard under the score ──
  const range = $derived.by(() => {
    const ms = (parsed.score?.staves ?? []).flatMap((st) => st.events.flatMap((e) => e.pitches.map(midi)));
    if (!ms.length) return [48, 72] as const;
    const lo = Math.min(...ms);
    const hi = Math.max(...ms);
    return [lo - (lo % 12), hi + (11 - (hi % 12))] as const;
  });
  const keyMarks = $derived.by((): Record<number, Mark> => {
    const out: Record<number, Mark> = {};
    if (playing) for (const m of playingMidi) out[m] = 'sounding';
    else if (info) for (const p of info.pitches) out[midi(p)] = 'target';
    return out;
  });

  onMount(() => {
    const ro = new ResizeObserver(() => (width = box?.clientWidth || width));
    if (box) {
      ro.observe(box);
      width = box.clientWidth || width;
    }
    document.fonts?.load('40px Bravura').then(() => (fontReady = true), () => (fontReady = true));
    // Keep the explanation on its note while the page or the score scrolls; let go when the reader taps elsewhere.
    const onScroll = () => shown !== undefined && place();
    const onDown = (e: PointerEvent) => {
      if (selId !== undefined && figure && !figure.contains(e.target as Node)) selId = undefined;
    };
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    document.addEventListener('pointerdown', onDown);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('pointerdown', onDown);
      cancelAnimationFrame(raf);
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
  const cls = (base: string | undefined, ev: number | undefined) =>
    [base, ev !== undefined && playingIds.has(ev) ? 'playing' : '', ev !== undefined && ev === shown && !playing ? 'hover' : '', ev !== undefined ? (marks[ev] ?? '') : ''].filter(Boolean).join(' ');

  // ── Words for the explanation ──
  const an = (w: string) => (/^[aeiou]/.test(w) ? 'an' : 'a');
  function valueText(x: Explained): string {
    const v = x.value;
    const dotted = v.dots === 1 ? 'dotted ' : v.dots === 2 ? 'double-dotted ' : '';
    const word = settings.term(v.rest ? `${v.base} rest` : v.base);
    return `${dotted}${word}${v.tuplet === 3 ? ' (triplet)' : v.tuplet ? ` (${v.tuplet}-tuplet)` : ''}`;
  }
  function moveText(x: Explained): string | undefined {
    if (x.interval) return intervalName(x.interval);
    if (!x.step) return undefined;
    const name = intervalName(x.step.interval);
    if (x.step.dir === 0) return 'the same note again';
    return `${x.step.dir > 0 ? 'up' : 'down'} ${an(name)} ${name}`;
  }
  const keyText = (x: NonNullable<Explained['harmony']>) => `${noteName(x.key.tonic, settings.nameOptions)} ${x.key.mode}`;
  const toggleNames = () => {
    settings.scoreNames = !settings.scoreNames;
    settings.save();
  };
  const toggleKeys = () => {
    settings.scoreKeys = !settings.scoreKeys;
    settings.save();
  };
</script>

<figure class="score" class:loading={!fontReady} bind:this={figure}>
  <div class="frame" bind:this={box}>
    {#if parsed.error}
      <p class="error ui" role="alert">Score error: {parsed.error}</p>
    {:else if layout}
      <!-- A focusable group: the arrow keys step through its notes. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
      <div
        class="paper"
        bind:this={paper}
        tabindex="0"
        role="group"
        aria-label="{label}. Arrow keys step through the notes; Enter plays the selected one."
        onkeydown={onkey}
        onblur={() => (hoverId = undefined)}
      >
        <svg width={layout.width * sp} height={layout.height * sp} viewBox="0 0 {f(layout.width)} {f(layout.height)}" role="img" aria-label={label}>
          {#if cursor}
            <rect class="cursor" x={f(cursor.x - 0.9)} y={f(cursor.top)} width="1.8" height={f(cursor.bottom - cursor.top)} rx="0.5" />
          {/if}
          {#each layout.prims as p, i (i)}
            {#if p.k === 'line'}
              <line x1={f(p.x1)} y1={f(p.y1)} x2={f(p.x2)} y2={f(p.y2)} stroke-width={p.w} class={cls(p.cls, p.ev)} />
            {:else if p.k === 'glyph'}
              {#if p.sy}
                <text class="g {cls(p.cls, p.ev)}" transform="translate({f(p.x)} {f(p.y)}) scale({f(p.sx ?? 1)} {f(p.sy)})">{p.ch}</text>
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
              <rect
                class="hit"
                class:selected={p.ev === selId && !playing}
                data-ev={p.ev}
                x={f(p.x)}
                y={f(p.y)}
                width={f(p.w)}
                height={f(p.h)}
                onpointerenter={() => point(p.ev)}
                onpointerleave={unpoint}
                onclick={() => select(p.ev)}
                role="presentation"
              />
            {/if}
          {/each}
        </svg>
      </div>
    {/if}
  </div>
  {#if info && tip}
    <div class="tip ui" class:below={tip.below} style="left: {tip.x}px; top: {tip.y}px" aria-hidden="true">
      <div class="names">
        {#if info.value.rest}
          {valueText(info)}
        {:else}
          {info.pitches.map((q) => pitchName(q, settings.nameOptions)).join(' · ')}
        {/if}
      </div>
      {#if !info.value.rest}
        <div class="what">{valueText(info)}{#if moveText(info)}<span class="sep">·</span>{moveText(info)}{/if}</div>
      {/if}
      {#if info.harmony}
        <div class="harmony">
          <strong>{chordSymbol(info.harmony.chord, settings.nameOptions)}</strong>{#if info.harmony.roman}<span class="sep">·</span>{info.harmony.roman} in {keyText(info.harmony)}{/if}
        </div>
      {/if}
    </div>
  {/if}
  {#if reveal}
    <p class="sr-only" aria-live="polite">
      {#if info}{info.value.rest ? valueText(info) : `${info.pitches.map((q) => pitchName(q, settings.nameOptions)).join(', ')}, ${valueText(info)}${moveText(info) ? `, ${moveText(info)}` : ''}${info.harmony ? `; harmony ${chordSymbol(info.harmony.chord, settings.nameOptions)}${info.harmony.roman ? `, ${info.harmony.roman}` : ''}` : ''}`}{/if}
    </p>
  {/if}
  {#if showKeys && !parsed.error}
    <div class="keys">
      <Keyboard lo={range[0]} hi={range[1]} marks={keyMarks} interactive={false} showHeld={false} fifths={parsed.score?.fifths ?? 0} minKey={14} label="The notes of the score on the keyboard" />
    </div>
  {/if}
  {#if (play && !parsed.error) || caption}
    <figcaption class="ui" use:localise>
      {#if play && !parsed.error}
        <span class="tools">
          <button class="play" onclick={toggle} aria-label={playing ? 'Stop' : fromBar !== undefined ? 'Play from the selected note' : 'Play the score'}>
            <Icon name={playing ? 'stop' : 'play'} size={14} />
            {playing ? 'Stop' : fromBar === 0 ? 'Play from the upbeat' : fromBar !== undefined ? `Play from ${settings.term('bar')} ${fromBar}` : 'Play'}
          </button>
          <button class="tool" onclick={() => (speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!)} title="Playback speed" aria-label="Speed {speedLabel(speed)}">{speedLabel(speed)}</button>
          {#if reveal}
            <button class="tool" class:on={settings.scoreNames} aria-pressed={settings.scoreNames} onclick={toggleNames} title="Write the note names under the notes">Names</button>
            {#if strip}
              <button class="tool" class:on={settings.scoreKeys} aria-pressed={settings.scoreKeys} onclick={toggleKeys} title="Show the notes on a keyboard"><Icon name="piano" size={14} /> Keys</button>
            {/if}
          {/if}
        </span>
      {/if}
      {#if caption}<span class="cap">{@html caption}</span>{/if}
    </figcaption>
  {/if}
</figure>

<style>
  .score {
    margin: 1.6rem 0;
    /* Inside a grid (the exercises) the figure must not grow to the score's width: its frame scrolls instead. */
    min-width: 0;
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
  .figure,
  .rfig {
    font-family: var(--font-body);
    font-size: 1.55px;
  }
  .rfig {
    font-size: 1.25px;
  }
  .tuplet {
    font-family: var(--font-body);
    font-style: italic;
    font-size: 1.5px;
  }
  line.tupletbr {
    stroke: var(--ink);
  }
  .notename {
    font-size: 1.35px;
    fill: var(--accent);
    font-weight: 600;
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
  .paper {
    position: relative;
    width: max-content;
    border-radius: var(--radius-sm);
  }
  .paper:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .hover {
    fill: var(--accent);
    stroke: var(--accent);
  }
  .g.hover,
  .t.hover,
  polygon.hover {
    stroke: none;
  }
  line.hover {
    fill: none;
  }
  .hit.selected {
    fill: color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .cursor {
    fill: color-mix(in srgb, var(--accent) 16%, transparent);
    pointer-events: none;
  }
  .tip {
    position: fixed;
    z-index: 40;
    transform: translate(-50%, -100%);
    pointer-events: none;
    background: var(--ink);
    color: var(--page);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.65rem 0.4rem;
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.18);
    font-size: 0.8rem;
    line-height: 1.35;
    text-align: center;
    white-space: nowrap;
    max-width: 92vw;
  }
  .tip.below {
    transform: translate(-50%, 0);
  }
  .tip::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: var(--ink);
  }
  .tip.below::after {
    top: auto;
    bottom: 100%;
    border-top-color: transparent;
    border-bottom-color: var(--ink);
  }
  .tip .names {
    font-weight: 700;
    font-size: 0.98rem;
    letter-spacing: 0.01em;
  }
  .tip .what,
  .tip .harmony {
    opacity: 0.85;
  }
  .tip .harmony strong {
    opacity: 1;
  }
  .tip .sep {
    margin: 0 0.35em;
    opacity: 0.6;
  }
  .keys {
    margin-top: 0.5rem;
  }
  .tools {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .tool {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--ink-2);
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    min-width: 2.2rem;
    justify-content: center;
  }
  .tool:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .tool.on {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border-color: var(--accent);
    color: var(--accent-ink);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .error {
    color: var(--bad);
    font-size: 0.9rem;
  }
</style>

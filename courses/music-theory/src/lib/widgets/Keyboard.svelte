<!--
  The course keyboard. Shows the reader's held keys (from MIDI, the computer keyboard or this keyboard),
  optional highlights and labels, and plays when clicked or touched. Scrolls sideways when the screen is
  too narrow for the range. One tab stop: arrow keys move between keys, Enter or Space plays.
-->
<script lang="ts" module>
  export type Mark = 'target' | 'ok' | 'wrong' | 'hint' | 'tonic' | 'predominant' | 'dominant' | 'sounding';
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { isBlackKey, spell } from '$lib/music/pitch';
  import { pitchName } from '$lib/music/names';

  let {
    lo = 36,
    hi = 84,
    marks = {},
    labels = 'c',
    fingers = {},
    interactive = true,
    showHeld = true,
    fifths = 0,
    minKey = 22,
    maxKey = 38,
    label = 'Piano keyboard',
    names = {},
  }: {
    /** Lowest and highest MIDI notes shown (snapped outwards to white keys). */
    lo?: number;
    hi?: number;
    /** Highlights by MIDI note. */
    marks?: Record<number, Mark>;
    /** Which keys carry their note name. */
    labels?: 'none' | 'c' | 'white' | 'marked' | 'all';
    /** Finger numbers (1 = thumb … 5) by MIDI note. */
    fingers?: Record<number, number>;
    interactive?: boolean;
    showHeld?: boolean;
    /** Key signature used to spell black-key labels. */
    fifths?: number;
    /** Narrowest white key in CSS pixels before the keyboard scrolls; keys never grow wider than `maxKey`. */
    minKey?: number;
    maxKey?: number;
    label?: string;
    /** Spelt names by MIDI note, overriding the key-signature spelling (e.g. E♯ in F♯ major). */
    names?: Record<number, import('$lib/music/pitch').Pitch>;
  } = $props();

  const first = $derived(isBlackKey(lo) ? lo - 1 : lo);
  const last = $derived(isBlackKey(hi) ? hi + 1 : hi);
  const notes = $derived(Array.from({ length: last - first + 1 }, (_, i) => first + i));
  const whites = $derived(notes.filter((m) => !isBlackKey(m)));
  const whiteIndex = $derived(new Map(whites.map((m, i) => [m, i])));

  // Geometry in SVG units: white key 24 × 140, black key 14 × 88.
  const W = 24;
  const H = 140;
  const BW = 14;
  const BH = 88;
  /** Black keys sit slightly off-centre, as on a real keyboard. */
  const BLACK_SHIFT: Record<number, number> = { 1: -2, 3: 2, 6: -3, 8: 0, 10: 3 };

  function x(m: number): number {
    if (!isBlackKey(m)) return whiteIndex.get(m)! * W;
    return whiteIndex.get(m - 1)! * W + W - BW / 2 + BLACK_SHIFT[m % 12]!;
  }

  let box: HTMLDivElement | undefined = $state();
  let width = $state(0);
  const svgWidth = $derived(Math.min(Math.max(width, whites.length * minKey), whites.length * maxKey));
  const svgHeight = $derived((svgWidth * (H + 2)) / (whites.length * W));
  let focusNote = $state(60);
  let pressed = new Set<number>();
  let pointerDown = false;

  const held = $derived(showHeld ? instrument.held : new Set<number>());
  const sounding = $derived(audio.sounding);

  function name(m: number): string {
    return pitchName(names[m] ?? spell(m, fifths), settings.nameOptions);
  }

  function showLabel(m: number): boolean {
    if (labels === 'none') return false;
    if (labels === 'all') return true;
    if (labels === 'marked') return m in marks || held.has(m);
    if (labels === 'white') return !isBlackKey(m);
    return m % 12 === 0;
  }

  function stateOf(m: number): string {
    if (held.has(m)) return marks[m] === 'wrong' ? 'wrong' : marks[m] === 'target' || marks[m] === 'ok' ? 'ok' : 'held';
    if (sounding.has(m)) return 'sounding';
    return marks[m] ?? '';
  }

  function press(m: number) {
    if (!interactive || pressed.has(m)) return;
    pressed.add(m);
    instrument.note(m, true, 'screen');
  }
  function release(m: number) {
    if (!pressed.has(m)) return;
    pressed.delete(m);
    instrument.note(m, false, 'screen');
  }
  function releaseAll() {
    pointerDown = false;
    for (const m of [...pressed]) release(m);
  }

  function noteAt(e: PointerEvent): number | undefined {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const v = el instanceof Element ? el.closest('[data-note]')?.getAttribute('data-note') : null;
    return v == null ? undefined : Number(v);
  }

  function onPointerDown(e: PointerEvent) {
    if (!interactive || e.button > 0) return;
    const m = noteAt(e);
    if (m === undefined) return;
    e.preventDefault();
    pointerDown = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    focusNote = m;
    press(m);
  }
  function onPointerMove(e: PointerEvent) {
    if (!pointerDown) return;
    const m = noteAt(e);
    if (m === undefined || pressed.has(m)) return;
    for (const p of [...pressed]) release(p);
    press(m);
  }

  function onKey(e: KeyboardEvent) {
    if (!interactive) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      focusNote = Math.min(last, Math.max(first, focusNote + (e.key === 'ArrowRight' ? 1 : -1)));
      scrollToNote(focusNote);
    } else if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      press(focusNote);
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') release(focusNote);
  }

  function scrollToNote(m: number) {
    if (!box || svgWidth <= width) return;
    const px = (x(m) / (whites.length * W)) * svgWidth;
    if (px < box.scrollLeft + 20 || px > box.scrollLeft + width - 40) box.scrollLeft = px - width / 2;
  }

  onMount(() => {
    focusNote = Math.min(last, Math.max(first, Object.keys(marks).map(Number)[0] ?? 60));
    const ro = new ResizeObserver(() => (width = box?.clientWidth ?? 0));
    if (box) ro.observe(box);
    width = box?.clientWidth ?? 0;
    queueMicrotask(() => scrollToNote(focusNote));
    return () => {
      ro.disconnect();
      releaseAll();
    };
  });
</script>

<div class="kbd-wrap ui" bind:this={box}>
  <!-- A composite widget (one tab stop, arrow keys inside): the svg itself takes focus and key events. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <svg
    class="kbd"
    class:interactive
    width={svgWidth}
    height={svgHeight}
    viewBox="0 0 {whites.length * W} {H + 2}"
    role="application"
    aria-roledescription="piano keyboard"
    aria-label="{label}{interactive ? ': arrow keys choose a key, Enter or Space plays it' : ''}"
    tabindex={interactive ? 0 : -1}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={releaseAll}
    onpointercancel={releaseAll}
    onlostpointercapture={releaseAll}
    onkeydown={onKey}
    onkeyup={onKeyUp}
    onblur={releaseAll}
  >
    {#each whites as m (m)}
      {@const st = stateOf(m)}
      <g data-note={m}>
        <rect class="white {st}" class:focus={interactive && m === focusNote} x={x(m) + 0.5} y="0.5" width={W - 1} height={H} rx="2.5" />
        {#if fingers[m]}<text class="finger" x={x(m) + W / 2} y={H - 30}>{fingers[m]}</text>{/if}
        {#if showLabel(m)}<text class="lab" x={x(m) + W / 2} y={H - 9}>{name(m)}</text>{/if}
      </g>
    {/each}
    {#each notes.filter(isBlackKey) as m (m)}
      {@const st = stateOf(m)}
      <g data-note={m}>
        <rect class="black {st}" class:focus={interactive && m === focusNote} x={x(m)} y="0" width={BW} height={BH} rx="1.8" />
        {#if fingers[m]}<text class="finger on-black" x={x(m) + BW / 2} y={BH - 24}>{fingers[m]}</text>{/if}
        {#if showLabel(m)}<text class="lab on-black" x={x(m) + BW / 2} y={BH - 8}>{name(m).replace(/-?\d+$/, '')}</text>{/if}
      </g>
    {/each}
  </svg>
</div>

<style>
  .kbd-wrap {
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    border-radius: var(--radius-sm);
    scrollbar-width: thin;
  }
  .kbd {
    display: block;
    margin: 0 auto;
    touch-action: pan-x;
    user-select: none;
    -webkit-user-select: none;
  }
  .kbd.interactive {
    cursor: pointer;
  }
  .kbd:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  rect {
    stroke: var(--key-edge);
    stroke-width: 1;
    transition: fill 60ms;
  }
  .white {
    fill: var(--key-white);
  }
  .black {
    fill: var(--key-black);
  }
  .held {
    fill: var(--key-held);
  }
  .ok {
    fill: var(--ok);
  }
  .wrong {
    fill: var(--bad);
  }
  .sounding {
    fill: var(--key-sounding);
  }
  .white.target,
  .white.hint {
    fill: var(--key-target);
  }
  .black.target,
  .black.hint {
    fill: color-mix(in srgb, var(--key-target) 70%, var(--key-black));
  }
  .tonic {
    fill: var(--fn-t-soft);
  }
  .predominant {
    fill: var(--fn-pd-soft);
  }
  .dominant {
    fill: var(--fn-d-soft);
  }
  .black.tonic {
    fill: var(--fn-t);
  }
  .black.predominant {
    fill: var(--fn-pd);
  }
  .black.dominant {
    fill: var(--fn-d);
  }
  .kbd:focus-visible .focus {
    stroke: var(--focus);
    stroke-width: 2.5;
  }
  text {
    font-family: var(--font-ui);
    text-anchor: middle;
    pointer-events: none;
  }
  .lab {
    font-size: 8.5px;
    font-weight: 600;
    fill: var(--key-label);
  }
  .lab.on-black {
    font-size: 6.5px;
    fill: var(--key-label-on-black);
  }
  .finger {
    font-size: 10px;
    font-weight: 700;
    fill: var(--accent);
  }
  .finger.on-black {
    font-size: 8px;
    fill: var(--key-label-on-black);
  }
  .held + text,
  .ok + text,
  .wrong + text {
    fill: var(--key-label-on-black);
  }
</style>

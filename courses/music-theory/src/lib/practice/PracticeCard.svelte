<!-- One practice card: read a note, play notes or a chord, or choose an answer (often after listening). -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { midi, mod } from '$lib/music/pitch';
  import { noteName } from '$lib/music/names';
  import { spell } from '$lib/music/pitch';
  import Score from '$lib/notation/Score.svelte';
  import { chordScore } from '$lib/notation/write';
  import Keyboard, { type Mark } from '$lib/widgets/Keyboard.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { markup } from './markup';
  import type { Card } from './skills';

  let { card, ondone }: { card: Card; ondone: (right: boolean) => void } = $props();

  let verdict: boolean | undefined = $state();
  let step = $state(0);
  let wrong: number[] = $state([]);
  let chosen: string | undefined = $state();
  const html = $derived(markup(card.prompt, settings.nameOptions, (w) => settings.term(w)));
  const optionHtml = (o: string) => markup(o, settings.nameOptions, (w) => settings.term(w));
  /** A step's label is a note name, a chord symbol, or two notes joined by +. */
  const stepLabel = (l: string) => {
    if (/^[A-G](#|b)?$/.test(l)) return markup(`:n[${l}]`, settings.nameOptions, (w) => w);
    if (l.includes(' + ')) return l.split(' + ').map((n) => markup(`:n[${n}]`, settings.nameOptions, (w) => w)).join(' + ');
    return markup(`:c[${l}]`, settings.nameOptions, (w) => w);
  };

  function hear() {
    if (card.type !== 'choose' || !card.hear) return;
    audio.playSequence(card.hear.flatMap((g, i) => g.map((m) => ({ midi: m, time: i * 0.8, duration: 0.75, velocity: 74 }))));
  }

  function finish(right: boolean) {
    if (verdict !== undefined) return;
    verdict = right;
  }

  let settle: number | undefined;
  function judge(afterPress: boolean) {
    if (verdict !== undefined) return;
    const held = [...instrument.held];
    if (card.type === 'read') {
      if (!afterPress || !held.length) return;
      finish(held.includes(midi(card.note)) && held.length === 1);
      if (!verdict) wrong = held;
      return;
    }
    if (card.type !== 'play' || !held.length) return;
    const s = card.steps[step]!;
    let ok: boolean;
    let bad: number[];
    if (s.exact) {
      ok = held.length === s.exact.length && s.exact.every((m) => held.includes(m));
      bad = held.filter((m) => !s.exact!.includes(m));
    } else {
      const pcs = new Set(held.map((m) => mod(m, 12)));
      ok = s.pcs!.every((p) => pcs.has(p)) && [...pcs].every((p) => s.pcs!.includes(p)) && (s.bass === undefined || mod(Math.min(...held), 12) === s.bass);
      bad = held.filter((m) => !s.pcs!.includes(mod(m, 12)));
      if (!ok && !bad.length && s.bass !== undefined && s.pcs!.every((p) => pcs.has(p))) bad = [Math.min(...held)];
    }
    if (ok) {
      wrong = [];
      if (step + 1 < card.steps.length) step++;
      else finish(true);
    } else if (afterPress && bad.length) {
      wrong = bad;
      finish(false);
    }
  }

  onMount(() => {
    if (card.type === 'choose' && card.hear) hear();
    return instrument.subscribe((e) => {
      clearTimeout(settle);
      settle = window.setTimeout(() => judge(e.on), card.type === 'read' ? 0 : 110);
    });
  });

  const marks = $derived.by((): Record<number, Mark> => {
    const m: Record<number, Mark> = {};
    for (const w of wrong) m[w] = 'wrong';
    if (verdict === false && card.type === 'read') m[midi(card.note)] = 'target';
    return m;
  });
  const answerText = $derived.by(() => {
    if (card.type === 'read') return noteName(card.note, settings.nameOptions) + card.note.octave;
    if (card.type === 'play') return card.steps.map((s) => (s.exact ? s.exact.map((m) => noteName(spell(m, card.fifths), settings.nameOptions)).join('+') : s.label)).join(' ');
    return optionHtml(card.answer);
  });
</script>

<div class="card ui">
  <p class="prompt">{@html html}</p>
  {#if card.type === 'read'}
    <div class="staff"><Score src={chordScore([card.note], { staff: card.staff })} play={false} reveal={false} label="The note to play" /></div>
  {:else if card.type === 'choose'}
    {#if card.score}<div class="staff"><Score src={card.score} play={false} reveal={false} label="The question" /></div>{/if}
    {#if card.hear}<button class="hear" onclick={hear}><Icon name="volume" size={14} /> Hear it again</button>{/if}
    <div class="options">
      {#each card.options as o (o)}
        <button class:right={verdict !== undefined && o === card.answer} class:wrongopt={chosen === o && o !== card.answer} disabled={verdict !== undefined} onclick={() => { chosen = o; finish(o === card.answer); }}>{@html optionHtml(o)}</button>
      {/each}
    </div>
  {:else}
    <ol class="steps">
      {#each card.steps as s, i (i)}<li class:done={i < step || verdict === true} class:now={i === step && verdict === undefined}>{@html stepLabel(s.label)}</li>{/each}
    </ol>
  {/if}
  {#if card.type !== 'choose'}
    <Keyboard lo={card.type === 'read' && card.staff === 'bass' ? 36 : 48} hi={card.type === 'read' && card.staff === 'bass' ? 64 : 84} {marks} fifths={card.type === 'play' ? card.fifths : 0} label="Keyboard to answer on" />
  {/if}
  {#if verdict !== undefined}
    <div class="result" aria-live="polite">
      <p class:ok={verdict} class:bad={!verdict}>{#if verdict}<Icon name="check" size={14} /> {card.type === 'choose' ? 'Answer checked.' : 'Played and checked.'}{:else}Not this time. The answer: {@html answerText}.{/if}</p>
      <button class="go" onclick={() => ondone(verdict!)}>Next →</button>
    </div>
  {/if}
</div>

<style>
  .card {
    display: grid;
    gap: 0.7rem;
  }
  .prompt {
    margin: 0;
    font-family: var(--font-body);
    font-size: 1.2rem;
  }
  .staff {
    max-width: 16rem;
  }
  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .hear {
    justify-self: start;
  }
  .options .right {
    border-color: var(--ok);
    color: var(--ok);
    background: var(--ok-soft);
  }
  .options .wrongopt {
    border-color: var(--bad);
    color: var(--bad);
    background: var(--bad-soft);
  }
  .steps {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
  }
  .steps li {
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: 0.15rem 0.65rem;
    font-weight: 600;
    color: var(--ink-2);
  }
  .steps li.now {
    border-color: var(--accent);
    color: var(--accent-ink);
    background: var(--accent-soft);
  }
  .steps li.done {
    border-color: var(--ok);
    color: var(--ok);
  }
  .result {
    display: flex;
    align-items: center;
    gap: 0.6rem 1rem;
    flex-wrap: wrap;
  }
  .result p {
    margin: 0;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .bad {
    color: var(--bad);
  }
  .go {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
</style>

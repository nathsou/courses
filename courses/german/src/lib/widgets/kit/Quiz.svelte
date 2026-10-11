<script lang="ts" module>
  export interface QuizItem {
    /** German with one ___ gap (or none); shown large. */
    de?: string;
    /** English instruction or question, with {German} allowed. */
    prompt?: string;
    /** English translation or hint shown under the sentence. */
    en?: string;
    /** Choices (German). Without options the learner types the answer. */
    options?: string[];
    /** The right option, or the accepted typed answers (first = model). */
    answer: string | string[];
    /** Placeholder for typed answers, e.g. the infinitive. */
    hint?: string;
    /** English explanation shown after answering, with {German} allowed. */
    explain?: string;
  }
</script>

<script lang="ts">
  /** A short round of questions inside a widget: choose or type, feedback, score, again. */
  import { settings } from '$lib/state/settings.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { mark, type Marked } from '$lib/de/check';
  import { shuffle } from '$lib/exercises/shuffle';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import De from '$lib/components/de/De.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import UmlautKeys from '$lib/components/de/UmlautKeys.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import HiText from './HiText.svelte';

  let { items, seed = 'quiz', count, shuffleOptions = true }: { items: QuizItem[]; seed?: string; count?: number; shuffleOptions?: boolean } = $props();

  let round = $state(0);
  const order = $derived(shuffle(items.map((_, i) => i), `${seed}:${round}`).slice(0, count ?? items.length));
  let pos = $state(0);
  let score = $state(0);
  let result = $state<Marked | null>(null);
  let picked = $state<string | null>(null);
  let value = $state('');
  let input: HTMLInputElement | undefined = $state();
  let nextBtn: HTMLButtonElement | undefined = $state();

  const done = $derived(pos >= order.length);
  const item = $derived(items[order[Math.min(pos, order.length - 1)]!]!);
  const answers = $derived(Array.isArray(item.answer) ? item.answer : [item.answer]);
  const options = $derived(item.options ? (shuffleOptions ? shuffle(item.options, `${seed}:${round}:${pos}`) : item.options) : null);
  const settled = $derived(result !== null);
  const ok = $derived(result ? result.verdict !== 'wrong' : false);
  const shown = $derived(result && result.verdict !== 'wrong' ? result.answer : answers[0]!);
  const gapped = $derived(!!item.de?.includes('___'));
  const parts = $derived(item.de?.split(/_{3,}/) ?? []);
  const full = $derived(gapped ? item.de!.replace(/_{3,}/, shown) : shown);

  function settle(m: Marked) {
    result = m;
    const good = m.verdict !== 'wrong';
    if (good) score++;
    sfx(good ? 'right' : 'wrong', settings.data.sounds);
    const said = m.verdict !== 'wrong' ? m.answer : answers[0]!;
    void speech.say(gapped ? item.de!.replace(/_{3,}/, said) : said);
    queueMicrotask(() => nextBtn?.focus());
  }

  function choose(o: string) {
    if (settled) return;
    picked = o;
    settle(answers.includes(o) ? { verdict: 'right', answer: o } : { verdict: 'wrong', answer: answers[0]! });
  }

  function check(e: Event) {
    e.preventDefault();
    if (settled || !value.trim()) return;
    settle(mark(value, answers, { lenient: settings.data.lenientSpelling }));
  }

  function next() {
    result = null;
    picked = null;
    value = '';
    pos++;
    if (pos >= order.length) sfx('done', settings.data.sounds);
    else queueMicrotask(() => input?.focus());
  }

  function again() {
    round++;
    pos = 0;
    score = 0;
    result = null;
    picked = null;
    value = '';
  }
</script>

<div class="quiz">
  {#if done}
    <div class="end" aria-live="polite">
      <p class="score ui"><strong>{score}</strong> / {order.length}</p>
      <p class="ui msg">{score === order.length ? 'Perfect.' : score >= order.length * 0.7 ? 'Well done.' : 'Have another round: the questions come in a new order.'}</p>
      <button class="btn primary" type="button" onclick={again}><Icon name="refresh" size={16} />Again</button>
    </div>
  {:else}
    <div class="top ui">
      <span>Question {pos + 1} of {order.length}</span>
      <span class="pts">{score} right</span>
    </div>
    {#if item.prompt}<p class="prompt"><Rich text={item.prompt} /></p>{/if}
    {#if item.de}
      <p class="sentence">
        {#if settled}
          {#if gapped}<HiText text={item.de.replace(/_{3,}/, `{${shown}}`)} tone={ok ? 'jade' : 'accent'} size="md" />{:else}<De text={item.de} size="md" play={false} />{/if}
          <PlayButton text={gapped ? full : item.de} small />
        {:else if gapped}
          <span class="md"><De text={parts[0] ?? ''} play={false} genders="hide" /><span class="gap" aria-label="gap">＿＿＿</span><De text={parts[1] ?? ''} play={false} genders="hide" /></span>
        {:else}
          <De text={item.de} size="md" play={false} genders="hide" />
        {/if}
      </p>
    {/if}
    {#if item.en}<p class="en ui">{item.en}</p>{/if}
    {#if options}
      <div class="options" class:short={options.every((o) => o.length <= 10)} role="group" aria-label="Options">
        {#each options as o (o)}
          <button
            type="button"
            class="option"
            class:right={settled && answers.includes(o)}
            class:wrong={settled && picked === o && !answers.includes(o)}
            disabled={settled && !answers.includes(o) && picked !== o}
            aria-pressed={picked === o}
            onclick={() => choose(o)}><De text={o} plain play={false} genders="hide" /></button
          >
        {/each}
      </div>
    {:else}
      <form class="row" onsubmit={check}>
        <input
          bind:this={input}
          bind:value
          class:right={result?.verdict === 'right'}
          class:almost={result?.verdict === 'almost'}
          class:bad={result?.verdict === 'wrong'}
          lang="de"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          aria-label="Your answer"
          placeholder={item.hint ? `(${item.hint})` : 'Type in German…'}
          readonly={settled}
        />
        {#if !settled}<button class="btn" disabled={!value.trim()}>Check</button>{/if}
      </form>
      {#if !settled}<UmlautKeys target={input} oninput={(v) => (value = v)} />{/if}
    {/if}
    <div class="fb" aria-live="polite">
      {#if result}
        <p class:ok class:almost={result.verdict === 'almost'}>
          <strong lang="de">{result.verdict === 'right' ? 'Richtig!' : result.verdict === 'almost' ? 'Fast!' : 'Nicht ganz.'}</strong>
          {#if result.verdict === 'almost'}{result.note ?? ''} <Rich text={`{${result.answer}}`} />{:else if result.verdict === 'wrong'}The answer: <Rich text={`{${answers[0]}}`} />{/if}
          {#if item.explain}<span class="ex"><Rich text={item.explain} /></span>{/if}
        </p>
        <button bind:this={nextBtn} class="btn small primary" type="button" onclick={next}>{pos + 1 < order.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .quiz {
    min-height: 9rem;
  }
  .top {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: var(--mute);
    margin-bottom: 0.4rem;
  }
  .pts {
    color: var(--jade);
    font-weight: 600;
  }
  .prompt {
    margin: 0 0 0.5rem;
  }
  .sentence {
    margin: 0.2rem 0 0.4rem;
  }
  .md {
    font-size: 1.15rem;
  }
  .gap {
    display: inline-block;
    min-width: 3em;
    margin: 0 0.2em;
    border-bottom: 2px solid var(--accent);
    color: transparent;
    line-height: 1.2;
  }
  .en {
    margin: 0 0 0.7rem;
    color: var(--mute);
    font-size: 0.88rem;
  }
  .options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    gap: 0.45rem;
  }
  .options.short {
    grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr));
  }
  .option {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: 1.5px solid var(--line-strong);
    border-radius: 12px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 1rem;
    line-height: 1.35;
    min-height: 2.75rem;
    transition: border-color 120ms, background-color 120ms;
  }
  .short .option {
    text-align: center;
  }
  .option:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .option.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .option.wrong {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .option:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.3rem 0 0.4rem;
  }
  input {
    flex: 1;
    min-width: 0;
    font-size: 1.05rem;
    padding: 0.5rem 0.75rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  input.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  input.almost {
    border-color: var(--gold);
    background: var(--gold-soft);
  }
  input.bad {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .fb {
    margin-top: 0.6rem;
  }
  .fb p {
    margin: 0 0 0.55rem;
  }
  .fb strong {
    color: var(--accent-ink);
    margin-right: 0.2rem;
  }
  .fb .ok strong {
    color: var(--jade);
  }
  .fb .almost strong {
    color: var(--gold);
  }
  .ex {
    display: block;
    color: var(--ink-2);
    margin-top: 0.15rem;
    font-size: 0.97rem;
  }
  .end {
    text-align: center;
    padding: 0.6rem 0;
  }
  .score {
    font-size: 1.1rem;
    margin: 0;
  }
  .score strong {
    font-size: 2rem;
    color: var(--jade);
  }
  .msg {
    color: var(--mute);
    font-size: 0.9rem;
    margin: 0.2rem 0 0.8rem;
  }
</style>

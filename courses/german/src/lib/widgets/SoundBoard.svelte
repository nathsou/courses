<script lang="ts">
  /**
   * German sounds, set by set: tap example words to hear them, read how to make each sound, then
   * a minimal-pair listening quiz (schon or schön? Kirche or Kirsche?).
   */
  import { onDestroy } from 'svelte';
  import { SOUND_SETS, type SoundSetId, type SoundWord } from './data/sounds';
  import { pairQuiz, type PairQuestion } from '$lib/de/minimal-pairs';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Shell from './kit/Shell.svelte';

  let { set: setProp }: { set?: SoundSetId } = $props();
  const fixed = $derived(SOUND_SETS.find((s) => s.id === setProp));
  let picked = $state<SoundSetId>('vowels');
  const current = $derived(fixed ?? SOUND_SETS.find((s) => s.id === picked)!);

  let tab = $state(0);

  // Quiz
  const ROUNDS = 8;
  let qs = $state<PairQuestion<SoundWord>[]>([]);
  let qi = $state(0);
  let choice = $state<'a' | 'b' | null>(null);
  let score = $state(0);
  let quizFor = $state<SoundSetId | null>(null);
  let nextBtn: HTMLButtonElement | undefined = $state();
  let cancel = () => {};
  onDestroy(() => cancel());
  const q = $derived(qs[qi]);
  const finished = $derived(qs.length > 0 && qi >= qs.length);
  const heard = $derived(q ? q[q.answer] : undefined);

  function startQuiz() {
    qs = pairQuiz(current.pairs, ROUNDS, Date.now() % 1e9);
    quizFor = current.id;
    qi = 0;
    score = 0;
    ask();
  }
  function ask() {
    choice = null;
    cancel();
    const x = qs[qi];
    if (x) cancel = speech.schedule(x[x.answer].word, 300);
  }
  function choose(side: 'a' | 'b') {
    if (!q || choice) return;
    choice = side;
    const ok = side === q.answer;
    if (ok) score++;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    queueMicrotask(() => nextBtn?.focus());
  }
  function next() {
    qi++;
    if (qi >= qs.length) sfx('done', settings.data.sounds);
    else ask();
  }
  $effect(() => {
    if (tab === 1 && quizFor !== current.id) startQuiz();
  });
</script>

<Shell label="Sounds" icon="speaker" title={fixed ? fixed.title : undefined} tabs={['Sounds', 'Which one?']} bind:tab>
  {#if !fixed}
    <div class="sets ui" role="group" aria-label="Sound set">
      {#each SOUND_SETS as s (s.id)}
        <button type="button" class:on={picked === s.id} aria-pressed={picked === s.id} onclick={() => (picked = s.id)}>{s.label}</button>
      {/each}
    </div>
  {/if}

  {#if tab === 0}
    <p class="summary ui"><Rich text={current.summary} /></p>
    <div class="grid">
      {#each current.sounds as s (s.title + s.label)}
        <section class="sound" aria-label={s.label}>
          <header>
            <span class="sym" lang="de">{s.title}</span>
            <span class="lbl ui">{s.label}</span>
          </header>
          <p class="note ui"><Rich text={s.note} /></p>
          <div class="words">
            {#each s.words as x (x.word)}
              <button type="button" class="word" class:playing={speech.playing === x.word} aria-label="{x.word}: {x.en}. Listen" onclick={() => speech.say(x.word)}>
                <span class="de" lang="de">{x.word}</span>
                <span class="en ui">{x.en}</span>
              </button>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {:else if finished}
    <div class="end" aria-live="polite">
      <p class="score ui"><strong>{score}</strong> / {qs.length}</p>
      <p class="ui msg">{score === qs.length ? 'Sharp ears!' : 'Go back to the sounds, listen again, and have another go.'}</p>
      <button class="btn primary" type="button" onclick={startQuiz}><Icon name="refresh" size={16} />Again</button>
    </div>
  {:else if q}
    <div class="top ui"><span>{current.label}: pair {qi + 1} of {qs.length}</span><span class="pts">{score} right</span></div>
    <div class="ask ui">
      <PlayButton text={q[q.answer].word} label="Play the word" />
      <PlayButton text={q[q.answer].word} slow />
      <span>Which word do you hear?</span>
    </div>
    <div class="pair" role="group" aria-label="Choose the word you heard">
      {#each ['a', 'b'] as const as side (side)}
        <button
          type="button"
          class="opt"
          class:right={choice !== null && side === q.answer}
          class:wrong={choice === side && side !== q.answer}
          disabled={choice !== null && side !== q.answer && side !== choice}
          onclick={() => choose(side)}
        >
          <span class="de" lang="de">{q[side].word}</span>
          <span class="en ui">{q[side].en}</span>
        </button>
      {/each}
    </div>
    <div class="fb" aria-live="polite">
      {#if choice && heard}
        <p class:ok={choice === q.answer}>
          <strong>{choice === q.answer ? 'Richtig!' : 'Nicht ganz.'}</strong>
          You heard <b lang="de">{heard.word}</b> ({heard.en}). Compare:
          <span class="cmp"><span lang="de">{q.a.word}</span><PlayButton text={q.a.word} small /> <span lang="de">{q.b.word}</span><PlayButton text={q.b.word} small /></span>
        </p>
        <button bind:this={nextBtn} class="btn small primary" type="button" onclick={next}>{qi + 1 < qs.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>
      {/if}
    </div>
  {/if}
</Shell>

<style>
  .sets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.8rem;
  }
  .sets button {
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--ink-2);
  }
  .sets button.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
  .summary {
    margin: 0 0 0.9rem;
    font-size: 0.9rem;
    color: var(--ink-2);
    line-height: 1.55;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15.5rem), 1fr));
    gap: 0.6rem;
  }
  .sound {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.65rem 0.75rem 0.7rem;
    background: var(--panel);
    display: flex;
    flex-direction: column;
  }
  .sound header {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.2rem 0.6rem;
  }
  .sym {
    font-size: 1.35rem;
    font-weight: 650;
    color: var(--accent-ink);
    line-height: 1.2;
  }
  .lbl {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .note {
    margin: 0.3rem 0 0.55rem;
    font-size: 0.84rem;
    line-height: 1.45;
    color: var(--ink-2);
    flex: 1;
  }
  .words {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .word {
    display: inline-grid;
    justify-items: start;
    padding: 0.25rem 0.6rem 0.3rem;
    border-radius: 9px;
    border: 1px solid var(--line-strong);
    background: var(--pn);
    color: var(--fg);
    cursor: pointer;
    text-align: left;
    line-height: 1.2;
    transition: border-color 120ms, background-color 120ms;
  }
  .word:hover {
    border-color: var(--accent);
  }
  .word.playing {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  .word .de {
    font-family: var(--font-body);
    font-size: 1.02rem;
    font-weight: 600;
  }
  .word .en {
    font-size: 0.7rem;
    color: var(--mute);
  }
  .top {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: var(--mute);
  }
  .pts {
    color: var(--jade);
    font-weight: 600;
  }
  .ask {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin: 0.6rem 0 0.8rem;
    font-size: 0.95rem;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    max-width: 28rem;
  }
  .opt {
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    padding: 0.7rem 0.5rem;
    border-radius: 12px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    min-height: 4.2rem;
    transition: border-color 120ms, background-color 120ms;
  }
  .opt:hover:not(:disabled):not(.right):not(.wrong) {
    border-color: var(--accent);
  }
  .opt .de {
    font-family: var(--font-body);
    font-size: 1.45rem;
    font-weight: 600;
    line-height: 1.2;
  }
  .opt .en {
    font-size: 0.75rem;
    color: var(--mute);
  }
  .opt.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .opt.wrong {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .opt:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .fb {
    margin-top: 0.7rem;
    min-height: 2rem;
  }
  .fb p {
    margin: 0 0 0.5rem;
  }
  .fb strong {
    color: var(--accent-ink);
  }
  .fb .ok strong {
    color: var(--jade);
  }
  .cmp {
    white-space: nowrap;
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

<script lang="ts">
  /**
   * The German alphabet: tap a letter to hear its name (J is Jott, V is Vau…), with the letters
   * English speakers mix up marked. Then a spelling game: hear a word spelt aloud, type it.
   */
  import { onDestroy } from 'svelte';
  import { LETTERS, SPELLING_WORDS, SPELLING_PHRASES, type Letter } from './data/alphabet';
  import { spell, spokenSpelling, markSpelling, type SpellVerdict } from '$lib/de/spelling';
  import { shuffle } from '$lib/exercises/shuffle';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import De from '$lib/components/de/De.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import UmlautKeys from '$lib/components/de/UmlautKeys.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Shell from './kit/Shell.svelte';

  let tab = $state(0);
  let sel = $state<Letter>(LETTERS[9]!);
  let playingAll = $state(false);
  let allToken = 0;

  function tap(l: Letter) {
    stopAll();
    sel = l;
    void speech.say(l.say);
  }
  async function playAll() {
    if (playingAll) return stopAll();
    playingAll = true;
    const token = ++allToken;
    for (const l of LETTERS) {
      if (token !== allToken) return;
      sel = l;
      await speech.say(l.say);
      await new Promise((r) => setTimeout(r, 120));
    }
    if (token === allToken) playingAll = false;
  }
  function stopAll() {
    if (!playingAll) return;
    allToken++;
    playingAll = false;
    speech.stop();
  }

  // Spelling game
  const ROUNDS = 8;
  let words = $state<string[]>([]);
  let qi = $state(0);
  let typed = $state('');
  let verdict = $state<SpellVerdict | null>(null);
  let score = $state(0);
  let input: HTMLInputElement | undefined = $state();
  let nextBtn: HTMLButtonElement | undefined = $state();
  let cancel = () => {};
  onDestroy(() => {
    cancel();
    allToken++;
  });
  const word = $derived(words[qi]);
  const finished = $derived(words.length > 0 && qi >= words.length);

  function startGame() {
    words = shuffle(SPELLING_WORDS, Date.now() % 1e9).slice(0, ROUNDS);
    qi = 0;
    score = 0;
    ask();
  }
  function ask() {
    typed = '';
    verdict = null;
    cancel();
    if (words[qi]) cancel = speech.schedule(spokenSpelling(words[qi]!), 350);
    queueMicrotask(() => input?.focus());
  }
  function check(e: Event) {
    e.preventDefault();
    if (!word || verdict || !typed.trim()) return;
    verdict = markSpelling(typed, word);
    if (verdict !== 'wrong') score++;
    sfx(verdict === 'wrong' ? 'wrong' : 'right', settings.data.sounds);
    void speech.say(word);
    queueMicrotask(() => nextBtn?.focus());
  }
  function next() {
    qi++;
    if (qi >= words.length) sfx('done', settings.data.sounds);
    else ask();
  }
  $effect(() => {
    if (tab === 1 && !words.length) startGame();
    if (tab === 1) stopAll();
  });
</script>

<Shell label="Das Alphabet" icon="book" tabs={['Letters', 'Spell it']} bind:tab>
  {#if tab === 0}
    <p class="intro ui">Tap a letter to hear its German name. <span class="dotkey" aria-hidden="true"></span> marks the ones English speakers get wrong.</p>
    <div class="letters" role="group" aria-label="Letters">
      {#each LETTERS as l (l.letter)}
        <button type="button" class="letter" class:on={sel.letter === l.letter} class:tricky={!!l.note} class:playing={speech.playing === l.say} aria-label="{l.letter}: {l.name}" aria-pressed={sel.letter === l.letter} onclick={() => tap(l)}>
          <span class="glyph" lang="de">{l.letter}{l.letter === 'ß' ? '' : l.letter.toLowerCase()}</span>
          <span class="nm" lang="de">{l.name}</span>
        </button>
      {/each}
    </div>
    <div class="detail" aria-live="polite">
      <div class="big" lang="de">{sel.letter}</div>
      <div class="info">
        <p class="name"><span lang="de">{sel.name}</span><PlayButton text={sel.say} small label="Hear the letter" /></p>
        <p class="ui sounds">sounds like <em>{sel.en}</em></p>
        {#if sel.note}<p class="ui note">{sel.note}</p>{/if}
        <p class="ex"><De text={sel.example} play={false} /><PlayButton text={sel.example} small /></p>
      </div>
    </div>
    <div class="row-end">
      <button class="btn small" type="button" onclick={playAll}><Icon name={playingAll ? 'stop' : 'play'} size={14} />{playingAll ? 'Stop' : 'Hear A to ß'}</button>
    </div>
  {:else if finished}
    <div class="end" aria-live="polite">
      <p class="score ui"><strong>{score}</strong> / {words.length}</p>
      <p class="ui msg">{score === words.length ? 'Perfekt! You can take down a German name over the phone.' : 'Watch E (ay) and I (ee), and J, V, W, Z.'}</p>
      <button class="btn primary" type="button" onclick={startGame}><Icon name="refresh" size={16} />Again</button>
    </div>
  {:else if word}
    <div class="top ui"><span>Word {qi + 1} of {words.length}</span><span class="pts">{score} right</span></div>
    <p class="ask"><De text={SPELLING_PHRASES[0]!.de} play={false} /> <span class="ui gloss">Listen to the spelling and type the word.</span></p>
    <div class="listen">
      <PlayButton text={spokenSpelling(word)} label="Hear the spelling" />
      <PlayButton text={spokenSpelling(word)} slow />
    </div>
    <form class="row ui" onsubmit={check}>
      <input
        bind:this={input}
        bind:value={typed}
        lang="de"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-label="The word"
        placeholder="Type the word…"
        readonly={verdict !== null}
        class:ok={verdict === 'right'}
        class:almost={verdict === 'almost'}
        class:bad={verdict === 'wrong'}
      />
      {#if verdict === null}<button class="btn" disabled={!typed.trim()}>Check</button>{/if}
    </form>
    {#if verdict === null}<UmlautKeys target={input} oninput={(v) => (typed = v)} />{/if}
    <div class="fb" aria-live="polite">
      {#if verdict}
        <p class:ok={verdict === 'right'} class:almost={verdict === 'almost'}>
          <strong>{verdict === 'right' ? 'Richtig!' : verdict === 'almost' ? 'Fast!' : 'Nicht ganz.'}</strong>
          {#if verdict === 'almost'}Spelt with {/[ß]/.test(word) ? 'ß (Eszett)' : 'an umlaut'}:{:else if verdict === 'wrong'}It was{/if}
          <b lang="de">{word}</b><PlayButton text={word} small />
        </p>
        <ol class="spelt" aria-label="The letters">
          {#each spell(word) as l, i (i)}<li><span class="g" lang="de">{l.letter}</span><span class="n" lang="de">{l.name}</span></li>{/each}
        </ol>
        <button bind:this={nextBtn} class="btn small primary" type="button" onclick={next}>{qi + 1 < words.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>
      {/if}
    </div>
  {/if}
</Shell>

<style>
  .intro {
    margin: 0 0 0.7rem;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .dotkey {
    display: inline-block;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--gold);
    vertical-align: 0.05em;
  }
  .letters {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(3.3rem, 1fr));
    gap: 0.35rem;
  }
  .letter {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 0.05rem;
    padding: 0.35rem 0.1rem 0.3rem;
    border-radius: 10px;
    border: 1.5px solid var(--line);
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    transition: border-color 120ms, background-color 120ms;
  }
  .letter:hover {
    border-color: var(--accent);
  }
  .letter.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .letter.playing {
    background: var(--accent-soft);
  }
  .letter.tricky::after {
    content: '';
    position: absolute;
    top: 0.3rem;
    right: 0.3rem;
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: var(--gold);
  }
  .glyph {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.1;
  }
  .nm {
    font-family: var(--font-ui);
    font-size: 0.66rem;
    color: var(--mute);
    font-weight: 600;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .detail {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    margin-top: 0.9rem;
    padding: 0.8rem 1rem;
    border-radius: 12px;
    background: var(--pn);
    min-height: 7.5rem;
  }
  .big {
    font-size: 3.6rem;
    font-weight: 600;
    line-height: 1;
    color: var(--accent-ink);
    min-width: 3.2rem;
    text-align: center;
  }
  .info {
    min-width: 0;
  }
  .info p {
    margin: 0;
  }
  .name {
    font-size: 1.4rem;
    font-weight: 600;
    line-height: 1.3;
  }
  .sounds {
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .note {
    margin-top: 0.3rem !important;
    font-size: 0.85rem;
    color: var(--ink-2);
    line-height: 1.45;
  }
  .ex {
    margin-top: 0.35rem !important;
  }
  .row-end {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.6rem;
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
    margin: 0.4rem 0 0.4rem;
    font-size: 1.15rem;
  }
  .gloss {
    display: block;
    font-size: 0.85rem;
    color: var(--mute);
  }
  .listen {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 0.6rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  .row input {
    flex: 1;
    min-width: 0;
    max-width: 18rem;
    font-size: 1.1rem;
    padding: 0.45rem 0.75rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  .row input.ok {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .row input.almost {
    border-color: var(--gold);
    background: var(--gold-soft);
  }
  .row input.bad {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .fb {
    margin-top: 0.6rem;
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
  .fb .almost strong {
    color: var(--gold);
  }
  .spelt {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 0;
    margin: 0 0 0.7rem;
  }
  .spelt li {
    display: grid;
    justify-items: center;
    min-width: 2.6rem;
    padding: 0.2rem 0.4rem;
    border-radius: 8px;
    background: var(--pn);
  }
  .spelt .g {
    font-weight: 650;
    font-size: 1.1rem;
    line-height: 1.2;
  }
  .spelt .n {
    font-family: var(--font-ui);
    font-size: 0.68rem;
    color: var(--mute);
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

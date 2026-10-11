<script lang="ts">
  /**
   * Compound nouns: tap a first and a last part; the last part decides the gender, and linking
   * elements (-s-, -n-, -er-) are shown. The famous Danube-steamship word built up step by step,
   * and a quiz: guess the gender of a compound.
   */
  import { C_FIRST, C_LAST, COMPOUNDS, LONG_STEPS, LONG_NOTE, C_QUIZ, type CGender } from './data/compound-builder';
  import Shell from './kit/Shell.svelte';
  import HiText from './kit/HiText.svelte';
  import Quiz from './kit/Quiz.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { unmark, type Tone } from './kit/marks';

  let tab = $state(0);
  let first = $state<string | null>('Haus');
  let last = $state<string | null>('Tür');
  let longStep = $state(0);

  const genderOf = (de: string): CGender => (de.startsWith('der ') ? 'm' : de.startsWith('die ') ? 'f' : de.startsWith('das ') ? 'n' : 'v');
  const TONE: Record<CGender, Tone> = { m: 'blue', f: 'red', n: 'green', pl: 'purple', v: 'mute' };
  const GNAME: Record<CGender, string> = { m: 'masculine', f: 'feminine', n: 'neuter', pl: 'plural', v: 'verb' };

  const firstPart = $derived(C_FIRST.find((p) => p.id === first));
  const lastPart = $derived(C_LAST.find((p) => p.id === last));
  const compound = $derived(COMPOUNDS.find((c) => c.first === first && c.last === last));
  const partners = $derived(new Set(COMPOUNDS.filter((c) => c.first === first).map((c) => c.last)));
  const suggestions = $derived(COMPOUNDS.filter((c) => c.first === first).map((c) => c.de));
  const word = (de: string) => de.replace(/^(der|die|das) /, '');

  function pickFirst(id: string) {
    first = id;
    const c = COMPOUNDS.find((x) => x.first === id && x.last === last);
    if (c) void speech.say(c.de);
  }
  function pickLast(id: string) {
    last = id;
    const c = COMPOUNDS.find((x) => x.first === first && x.last === id);
    if (c) void speech.say(c.de);
  }

  const long = $derived(LONG_STEPS[longStep]!);
  const quizItems = C_QUIZ.map((q) => ({
    de: `___ ${q.word}`,
    options: ['der', 'die', 'das'],
    answer: q.answer,
    en: q.en,
    explain: `{${q.parts.join('·')}}: the last part decides, {${q.head}} → {${q.de}}.${q.note ? ` ${q.note}` : ''}`,
  }));
</script>

<Shell label="Compound builder" icon="plus" tabs={['Build', 'The long one', 'Quiz']} bind:tab>
  {#if tab === 0}
    <p class="ui lead">Tap a first part and a last part. The <strong>last part</strong> decides the gender of the whole word.</p>
    <div class="cols">
      <div>
        <span class="lbl ui" id="cb-first">First part</span>
        <div class="tiles" role="radiogroup" aria-labelledby="cb-first">
          {#each C_FIRST as p (p.id)}
            <button type="button" role="radio" aria-checked={first === p.id} class="tile" class:on={first === p.id} onclick={() => pickFirst(p.id)}>
              <span class="w" lang="de">{p.id}-</span><span class="src ui g-{p.kind}" lang="de">{p.de}</span>
            </button>
          {/each}
        </div>
      </div>
      <div>
        <span class="lbl ui" id="cb-last">Last part</span>
        <div class="tiles" role="radiogroup" aria-labelledby="cb-last">
          {#each C_LAST as p (p.id)}
            <button type="button" role="radio" aria-checked={last === p.id} class="tile" class:on={last === p.id} class:fits={partners.has(p.id)} onclick={() => pickLast(p.id)}>
              <span class="w" lang="de">-{p.id.toLowerCase()}</span><span class="src ui g-{p.kind}" lang="de">{p.de}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
    <p class="hint ui">Dotted last parts make a real word with the first part you chose.</p>

    <div class="stage" aria-live="polite">
      {#if firstPart && lastPart && compound}
        <p class="sum" lang="de">
          <span class="g-{firstPart.kind}">{firstPart.de}</span>
          <span class="op">+</span>
          {#if compound.link}<span class="link">-{compound.link}-</span><span class="op">+</span>{/if}
          <span class="g-{lastPart.kind} head">{lastPart.de}</span>
          <span class="op">=</span>
        </p>
        <p class="result" lang="de">
          <span class="art g-{genderOf(compound.de)}">{compound.de.split(' ')[0]}</span>
          <span class="cw">{firstPart.id}{#if compound.link}<span class="link">{compound.link}</span>{/if}<span class="g-{lastPart.kind}">{lastPart.id.toLowerCase()}</span></span>
          <PlayButton text={compound.de} />
        </p>
        <p class="en ui">{compound.en} · {GNAME[genderOf(compound.de)]}, like <span lang="de">{lastPart.de}</span></p>
        {#if compound.note}<p class="note"><Rich text={compound.note} /></p>{/if}
        {#if compound.link}<p class="note ui">Linking element <strong lang="de">-{compound.link}-</strong>: {compound.link === 's' ? 'very common after -ung, -heit, -keit, -schaft, -ion and -t (Arbeit, Geburt), and in a few others such as Lebens-.' : compound.link === 'n' ? 'typical after feminine nouns in -e (Straße → Straßen-).' : 'here the first part takes its plural form.'}</p>{/if}
      {:else if firstPart && lastPart}
        <p class="miss ui"><Icon name="x" size={16} /> <span lang="de">{firstPart.id} + {lastPart.id}</span> isn’t a word we know.</p>
        {#if suggestions.length}<p class="en ui">With <span lang="de">{firstPart.id}-</span> try: <span lang="de">{suggestions.map(word).join(', ')}</span>.</p>{/if}
      {/if}
    </div>
  {:else if tab === 1}
    <p class="ui lead">German writes compounds as one word, so they can grow and grow. Build the classic from its head outwards; the gender always comes from the last part.</p>
    <div class="stage long" aria-live="polite">
      <p class="add ui">+ <span lang="de" class="g-{genderOf(long.add)}">{long.add}</span></p>
      <p class="lw"><HiText text={long.de} tone={TONE[genderOf(long.de)]} size="lg" genders="hide" /></p>
      <p class="en ui">{long.en}</p>
      <PlayButton text={unmark(long.de)} />
      <PlayButton text={unmark(long.de)} slow />
    </div>
    <div class="ctrl">
      <button type="button" class="btn small" disabled={longStep === 0} onclick={() => (longStep -= 1)}><Icon name="back" size={15} />Back</button>
      <button type="button" class="btn small primary" disabled={longStep === LONG_STEPS.length - 1} onclick={() => (longStep += 1)}>Add a part<Icon name="arrow" size={15} /></button>
      <span class="count ui">{longStep + 1} / {LONG_STEPS.length}</span>
    </div>
    {#if longStep === LONG_STEPS.length - 1}
      <p class="note"><Rich text={LONG_NOTE.note} /></p>
    {/if}
  {:else}
    <p class="ui lead">Der, die or das? Look at the last part.</p>
    <Quiz items={quizItems} seed="compound-builder" count={8} shuffleOptions={false} />
  {/if}
</Shell>

<style>
  .lead {
    margin: 0 0 0.7rem;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .lbl {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
    margin-bottom: 0.3rem;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr));
    gap: 0.3rem;
  }
  .tile {
    display: grid;
    text-align: left;
    padding: 0.3rem 0.5rem;
    border: 1.5px solid var(--line-strong);
    border-radius: 10px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    line-height: 1.25;
  }
  .tile:hover {
    border-color: var(--mute);
  }
  .tile.fits {
    border-style: dotted;
    border-color: var(--jade);
  }
  .tile.on {
    border-style: solid;
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .w {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 1rem;
  }
  .src {
    font-size: 0.72rem;
  }
  .hint {
    margin: 0.4rem 0 0.7rem;
    font-size: 0.76rem;
    color: var(--mute);
  }
  .stage {
    background: var(--pn);
    border-radius: 12px;
    padding: 0.8rem 1rem;
    min-height: 7rem;
  }
  .sum {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.3rem;
    font-size: 1.05rem;
    font-weight: 560;
  }
  .op {
    color: var(--mute);
  }
  .head {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 0.2em;
  }
  .link {
    color: var(--gold);
    font-weight: 700;
  }
  .result {
    margin: 0.2rem 0 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    font-size: 1.9rem;
    font-weight: 600;
    line-height: 1.25;
  }
  .cw {
    overflow-wrap: anywhere;
  }
  .en {
    margin: 0.2rem 0 0;
    font-size: 0.86rem;
    color: var(--mute);
  }
  .note {
    margin: 0.5rem 0 0;
    font-size: 0.92rem;
  }
  .miss {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0;
    color: var(--bad);
    font-weight: 600;
  }
  .long {
    text-align: center;
  }
  .add {
    margin: 0;
    font-size: 0.9rem;
    color: var(--mute);
  }
  .lw {
    margin: 0.3rem 0 0;
    overflow-wrap: anywhere;
    hyphens: auto;
  }
  .lw :global(.hi) {
    overflow-wrap: anywhere;
  }
  .ctrl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.7rem;
  }
  .count {
    margin-left: auto;
    font-size: 0.78rem;
    color: var(--mute);
  }
  @media (max-width: 520px) {
    .cols {
      grid-template-columns: 1fr;
    }
    .result {
      font-size: 1.5rem;
    }
    .lw :global(.hi) {
      font-size: 1.15rem;
    }
  }
</style>

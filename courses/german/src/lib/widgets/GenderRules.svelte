<script lang="ts">
  /**
   * The endings that predict der, die, das, grouped by gender in the gender colours: tap one for
   * examples, exceptions and how reliable it is. Then a quick quiz: guess the article from the
   * ending, with a few exceptions mixed in.
   */
  import { GENDER_RULES, type GenderRule } from '$lib/de/gender';
  import { genderPool, genderRound, splitEnding, ARTICLE, type G, type GenderItem } from '$lib/de/gender-quiz';
  import { taught } from '$lib/de/lexicon';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Shell from './kit/Shell.svelte';

  const GENDERS: { g: G; name: string }[] = [
    { g: 'm', name: 'masculine' },
    { g: 'f', name: 'feminine' },
    { g: 'n', name: 'neuter' },
  ];
  const byGender = (g: G) => GENDER_RULES.filter((r) => r.gender === g);

  let tab = $state(0);
  let selEnding = $state(GENDER_RULES[0]!.ending);
  const sel = $derived<GenderRule>(GENDER_RULES.find((r) => r.ending === selEnding) ?? GENDER_RULES[0]!);
  const withArt = (noun: string, g: G) => `${ARTICLE[g]} ${noun}`;
  const exGender = (ex: string): G => (ex.startsWith('der ') ? 'm' : ex.startsWith('die ') ? 'f' : 'n');

  // Quiz
  const ROUNDS = 10;
  let pool: GenderItem[] = [];
  let items = $state<GenderItem[]>([]);
  let qi = $state(0);
  let pick = $state<G | null>(null);
  let score = $state(0);
  let nextBtn: HTMLButtonElement | undefined = $state();
  const item = $derived(items[qi]);
  const finished = $derived(items.length > 0 && qi >= items.length);
  const parts = $derived(item ? splitEnding(item.noun, item.rule) : null);

  function startQuiz() {
    if (!pool.length) pool = genderPool(taught());
    items = genderRound(pool, ROUNDS, Date.now() % 1e9);
    qi = 0;
    score = 0;
    pick = null;
  }
  function choose(g: G) {
    if (!item || pick) return;
    pick = g;
    const ok = g === item.gender;
    if (ok) score++;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    void speech.say(withArt(item.noun, item.gender));
    queueMicrotask(() => nextBtn?.focus());
  }
  function next() {
    qi++;
    pick = null;
    if (qi >= items.length) sfx('done', settings.data.sounds);
  }
  function key(e: KeyboardEvent) {
    if (tab !== 1 || !item || pick) return;
    const k = e.key.toLowerCase();
    const g = k === '1' || k === 'r' ? 'm' : k === '2' || k === 'e' ? 'f' : k === '3' || k === 's' ? 'n' : null;
    if (g && !(e.target instanceof HTMLInputElement)) choose(g);
  }
  $effect(() => {
    if (tab === 1 && !items.length) startQuiz();
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="wrap" onkeydown={key}>
  <Shell label="Gender from the ending" icon="lightbulb" tabs={['Endings', 'Guess']} bind:tab>
    {#if tab === 0}
      <p class="intro ui">The ending of a noun often gives its gender away. Tap an ending to see examples and the exceptions to watch.</p>
      <div class="cols">
        {#each GENDERS as { g, name } (g)}
          <section class="col g-{g}" aria-label="{ARTICLE[g]}: {name}">
            <h3><span class="art">{ARTICLE[g]}</span> <span class="gn ui">{name}</span></h3>
            <div class="chips">
              {#each byGender(g) as r (r.ending)}
                <button type="button" class="chip" class:on={selEnding === r.ending} aria-pressed={selEnding === r.ending} onclick={() => (selEnding = r.ending)}>
                  <span lang="de">{r.ending}</span>{#if r.strength === 'always'}<span class="always" title="Always" aria-label="always">✓</span>{/if}
                </button>
              {/each}
            </div>
          </section>
        {/each}
      </div>
      <div class="detail g-{sel.gender}" aria-live="polite">
        <p class="head">
          <span class="end" lang="de">{sel.ending}</span>
          <span class="arrow" aria-hidden="true">→</span>
          <span class="art">{ARTICLE[sel.gender]}</span>
          <span class="pill ui" class:sure={sel.strength === 'always'}>{sel.strength === 'always' ? 'always' : 'usually'}</span>
        </p>
        {#if sel.note}<p class="note ui">{sel.note[0]!.toUpperCase() + sel.note.slice(1)}.</p>{/if}
        <div class="ex">
          {#each sel.examples as e (e)}
            <button type="button" class="word" class:playing={speech.playing === withArt(e, sel.gender)} onclick={() => speech.say(withArt(e, sel.gender))}>
              <span class="a g-{sel.gender}">{ARTICLE[sel.gender]}</span>
              <span lang="de">{#if sel.ending.endsWith('-')}<b>{e.slice(0, sel.ending.length - 1)}</b>{e.slice(sel.ending.length - 1)}{:else}{e.slice(0, e.length - sel.ending.length + 1)}<b>{e.slice(e.length - sel.ending.length + 1)}</b>{/if}</span>
            </button>
          {/each}
        </div>
        {#if sel.exceptions?.length}
          <p class="exh ui"><Icon name="x" size={13} />Exceptions</p>
          <div class="ex">
            {#each sel.exceptions as e (e)}
              <button type="button" class="word odd" class:playing={speech.playing === e} onclick={() => speech.say(e)}>
                <span class="a g-{exGender(e)}">{e.split(' ')[0]}</span>
                <span lang="de">{e.split(' ').slice(1).join(' ')}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <p class="foot ui"><span class="always">✓</span> = no common exceptions. Compounds take the gender of their last part: <span lang="de">die Haus<b>tür</b></span>, <span lang="de">das Wohn<b>zimmer</b></span>.</p>
    {:else if finished}
      <div class="done" aria-live="polite">
        <p class="score ui"><strong>{score}</strong> / {items.length}</p>
        <p class="ui msg">{score === items.length ? 'Perfect, exceptions and all.' : 'The endings get you most of the way; the exceptions just have to be learnt.'}</p>
        <button class="btn primary" type="button" onclick={startQuiz}><Icon name="refresh" size={16} />Again</button>
      </div>
    {:else if item && parts}
      <div class="top ui"><span>Noun {qi + 1} of {items.length}</span><span class="pts">{score} right</span></div>
      <p class="ui instr">der, die or das? Look at the ending.</p>
      <p class="noun" lang="de">
        {#if pick}<span class="art g-{item.gender}">{ARTICLE[item.gender]}</span>{/if}
        {parts.before}<mark>{parts.ending}</mark>{parts.after}
      </p>
      <div class="choices" role="group" aria-label="Choose the article">
        {#each GENDERS as { g }, i (g)}
          <button
            type="button"
            class="choice g-{g}"
            class:right={pick !== null && g === item.gender}
            class:wrong={pick === g && g !== item.gender}
            disabled={pick !== null && g !== item.gender && g !== pick}
            aria-keyshortcuts={String(i + 1)}
            onclick={() => choose(g)}>{ARTICLE[g]}</button
          >
        {/each}
      </div>
      <div class="fb" aria-live="polite">
        {#if pick}
          <p class:ok={pick === item.gender}>
            <strong>{pick === item.gender ? 'Richtig!' : 'Nicht ganz.'}</strong>
            <span lang="de"><b>{withArt(item.noun, item.gender)}</b></span><PlayButton text={withArt(item.noun, item.gender)} small />
            <br />
            {#if item.exception}
              <span class="exc">An exception: <b lang="de">{item.rule.ending}</b> is usually <b lang="de">{ARTICLE[item.rule.gender]}</b>, but this one is <b lang="de">{ARTICLE[item.gender]}</b>.</span>
            {:else}
              <span><b lang="de">{item.rule.ending}</b> → <b lang="de">{ARTICLE[item.rule.gender]}</b>, {item.rule.strength === 'always' ? 'always' : 'usually'}.</span>
            {/if}
          </p>
          <button bind:this={nextBtn} class="btn small primary" type="button" onclick={next}>{qi + 1 < items.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>
        {:else}
          <p class="keys ui">Keys: <span class="kbd">1</span> der · <span class="kbd">2</span> die · <span class="kbd">3</span> das</p>
        {/if}
      </div>
    {/if}
  </Shell>
</div>

<style>
  .intro {
    margin: 0 0 0.8rem;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .g-m {
    --g: var(--g-m);
  }
  .g-f {
    --g: var(--g-f);
  }
  .g-n {
    --g: var(--g-n);
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
    gap: 0.6rem;
  }
  .col {
    border-radius: 12px;
    border: 1px solid var(--line);
    border-top: 3px solid var(--g);
    padding: 0.55rem 0.7rem 0.7rem;
    background: color-mix(in srgb, var(--g) 5%, var(--panel));
  }
  .col h3 {
    margin: 0 0 0.45rem;
    font-size: 1.25rem;
  }
  .art {
    color: var(--g);
    font-weight: 700;
  }
  .gn {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.2rem 0.55rem;
    border-radius: 8px;
    border: 1.5px solid color-mix(in srgb, var(--g) 35%, var(--line));
    background: var(--panel);
    color: var(--fg);
    font-family: var(--font-body);
    font-size: 0.98rem;
    font-weight: 600;
    cursor: pointer;
  }
  .chip:hover {
    border-color: var(--g);
  }
  .chip.on {
    background: var(--g);
    border-color: var(--g);
    color: var(--panel);
  }
  .always {
    font-family: var(--font-ui);
    font-size: 0.7rem;
    color: var(--jade);
  }
  .chip.on .always {
    color: inherit;
  }
  .detail {
    margin-top: 0.8rem;
    padding: 0.75rem 0.9rem;
    border-radius: 12px;
    background: var(--pn);
    border-left: 4px solid var(--g);
    min-height: 7rem;
  }
  .detail p {
    margin: 0;
  }
  .head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .end {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--g);
  }
  .arrow {
    color: var(--mute);
  }
  .head .art {
    font-size: 1.4rem;
  }
  .pill {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.05rem 0.5rem;
    border-radius: 999px;
    background: var(--gold-soft);
    color: var(--gold);
  }
  .pill.sure {
    background: var(--jade-soft);
    color: var(--jade);
  }
  .note {
    font-size: 0.86rem;
    color: var(--ink-2);
    margin-top: 0.2rem !important;
  }
  .ex {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.5rem;
  }
  .word {
    display: inline-flex;
    gap: 0.3rem;
    align-items: baseline;
    padding: 0.2rem 0.6rem;
    border-radius: 9px;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    font-family: var(--font-body);
    font-size: 1rem;
    cursor: pointer;
  }
  .word:hover {
    border-color: var(--accent);
  }
  .word.playing {
    background: var(--accent-soft);
  }
  .word .a {
    color: var(--g);
    font-weight: 650;
  }
  .word b {
    color: var(--g);
  }
  .detail .word b {
    color: var(--ink-2);
    text-decoration: underline 2px color-mix(in srgb, currentColor 40%, transparent);
    text-underline-offset: 0.18em;
  }
  .word.odd {
    border-style: dashed;
  }
  .exh {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.6rem !important;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .foot {
    margin: 0.6rem 0 0;
    font-size: 0.8rem;
    color: var(--mute);
  }
  .foot b {
    color: var(--ink-2);
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
  .instr {
    margin: 0.4rem 0 0.2rem;
    font-size: 0.9rem;
  }
  .noun {
    font-size: 2.2rem;
    font-weight: 600;
    margin: 0.2rem 0 0.7rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .noun .art {
    margin-right: 0.3rem;
  }
  mark {
    background: var(--gold-soft);
    color: inherit;
    border-bottom: 3px solid var(--gold);
    border-radius: 4px 4px 0 0;
    padding: 0 0.05em;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    max-width: 24rem;
  }
  .choice {
    padding: 0.6rem 0.3rem;
    border-radius: 12px;
    border: 2px solid color-mix(in srgb, var(--g) 45%, var(--line));
    background: var(--panel);
    color: var(--g);
    font-family: var(--font-body);
    font-size: 1.3rem;
    font-weight: 700;
    cursor: pointer;
  }
  .choice:hover:not(:disabled) {
    background: color-mix(in srgb, var(--g) 10%, var(--panel));
  }
  .choice.right {
    background: var(--g);
    border-color: var(--g);
    color: var(--panel);
  }
  .choice.wrong {
    border-style: dashed;
    opacity: 0.8;
    text-decoration: line-through;
  }
  .choice:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .fb {
    margin-top: 0.7rem;
    min-height: 2.4rem;
  }
  .fb p {
    margin: 0 0 0.5rem;
    line-height: 1.6;
  }
  .fb strong {
    color: var(--accent-ink);
  }
  .fb .ok strong {
    color: var(--jade);
  }
  .exc {
    color: var(--ink-2);
  }
  .keys {
    font-size: 0.78rem;
    color: var(--mute);
  }
  .done {
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

<script lang="ts">
  /**
   * Adjective endings: choose the article type, gender and case, and see the phrase with its
   * ending and the reason ("if the article does not show gender and case, the adjective must").
   * A grid shows every ending for the article type; the drill asks for random endings.
   */
  import { CASES, CASE_NAMES, GENDERS, GENDER_NAMES, adjectiveEnding, declensionName, type Case, type Gender } from '$lib/de/declension';
  import { ARTICLE_WORDS, accepted, pairsFor, phrase, randomChoice, type AdjArticle, type Choice } from './grammar/adjectives';
  import { mark, type Marked } from '$lib/de/check';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import Shell from './kit/Shell.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import UmlautKeys from '$lib/components/de/UmlautKeys.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let tab = $state(0);
  let choice = $state<Choice>({ type: 'ein', word: 'ein', g: 'm', c: 'dat', pair: 0 });
  const p = $derived(phrase(choice));

  const TYPES: { id: AdjArticle; label: string; sub: string }[] = [
    { id: 'der', label: 'der-word', sub: 'der, dieser' },
    { id: 'ein', label: 'ein-word', sub: 'ein, kein, mein' },
    { id: 'none', label: 'no article', sub: 'kalter Kaffee' },
  ];
  const ABBR: Record<Case, string> = { nom: 'nom.', acc: 'acc.', dat: 'dat.', gen: 'gen.' };

  function setType(t: AdjArticle) {
    choice = { ...choice, type: t, word: t === 'none' ? '' : ARTICLE_WORDS[t].includes(choice.word) ? choice.word : ARTICLE_WORDS[t][0]! };
  }
  /** Keep "-en" in one piece when the line wraps (non-breaking hyphen). */
  const nb = (t: string) => t.replace(/(^|\s)-(?=[a-zäöü])/g, '$1\u2011');

  // Drill
  const ROUND = 10;
  let seed = $state(Date.now() % 100000);
  let n = $state(0);
  let score = $state(0);
  let value = $state('');
  let result = $state<Marked | null>(null);
  let input: HTMLInputElement | undefined = $state();
  const q = $derived(phrase(randomChoice(seed + n * 7919)));
  const finished = $derived(n >= ROUND);

  function check(e?: Event) {
    e?.preventDefault();
    if (result || !value.trim()) return;
    const m = mark(value.trim(), accepted(q), { lenient: settings.data.lenientSpelling });
    result = m;
    const ok = m.verdict !== 'wrong';
    if (ok) score++;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    void speech.say(q.text);
  }
  function next() {
    n++;
    value = '';
    result = null;
    if (n >= ROUND) sfx('done', settings.data.sounds);
    else queueMicrotask(() => input?.focus());
  }
  function restart() {
    seed = Date.now() % 100000;
    n = 0;
    score = 0;
    value = '';
    result = null;
  }
</script>

{#snippet np(ph: typeof p, gap: boolean)}
  <span class="np" lang="de"
    >{#if ph.article}<span class="art">{ph.article.stem}<b>{ph.article.ending}</b></span>{' '}{/if}{#if gap}<span class="gap">{ph.base}<span class="blank">___</span></span>{:else}<span class="adj">{ph.adj.stem}<b>{ph.adj.ending}</b></span>{/if}{' '}<span class="noun"
      >{ph.noun.stem}{#if ph.noun.ending}<i>{ph.noun.ending}</i>{/if}</span
    ></span
  >
{/snippet}

<Shell label="Adjective endings" icon="brush" title="If the article doesn’t show it, the adjective must" tabs={['Explore', 'Drill']} bind:tab>
  {#if tab === 0}
    <div class="pickers">
      <div class="group">
        <span class="lbl ui" id="ae-type">Article</span>
        <div class="chips" role="radiogroup" aria-labelledby="ae-type">
          {#each TYPES as t (t.id)}
            <button type="button" role="radio" aria-checked={choice.type === t.id} class="chip ui" class:on={choice.type === t.id} onclick={() => setType(t.id)}>{t.label}</button>
          {/each}
        </div>
        {#if choice.type !== 'none'}
          <div class="chips words" role="radiogroup" aria-label="Which {choice.type}-word">
            {#each ARTICLE_WORDS[choice.type] as w (w)}
              <button type="button" role="radio" aria-checked={choice.word === w} class="chip small" class:on={choice.word === w} lang="de" onclick={() => (choice = { ...choice, word: w })}>{w}</button>
            {/each}
          </div>
        {/if}
      </div>
      <div class="group">
        <span class="lbl ui" id="ae-g">Gender</span>
        <div class="chips" role="radiogroup" aria-labelledby="ae-g">
          {#each GENDERS as g (g)}
            <button type="button" role="radio" aria-checked={choice.g === g} class="chip ui gender g-{g}" class:on={choice.g === g} onclick={() => (choice = { ...choice, g })}>{GENDER_NAMES[g]}</button>
          {/each}
        </div>
      </div>
      <div class="group">
        <span class="lbl ui" id="ae-c">Case</span>
        <div class="chips" role="radiogroup" aria-labelledby="ae-c">
          {#each CASES as c (c)}
            <button type="button" role="radio" aria-checked={choice.c === c} class="chip ui" class:on={choice.c === c} onclick={() => (choice = { ...choice, c })}>{CASE_NAMES[c].en}</button>
          {/each}
        </div>
      </div>
    </div>

    <div class="result" aria-live="polite">
      <div class="top">
        <p class="phrase"><span class="frame" lang="de">{p.before}</span> {@render np(p, false)}<span class="frame" lang="de">{p.after}</span> <PlayButton text={p.text} /></p>
        <button type="button" class="btn ghost small other" onclick={() => (choice = { ...choice, pair: choice.pair + 1 })} title="Another adjective and noun"><Icon name="refresh" size={14} /> Other noun</button>
      </div>
      <p class="en ui">“{p.en}”</p>
      <p class="why"><span class="tag ui">-{p.adj.ending}</span> <Rich text={nb(p.reason)} /></p>
      {#if choice.type === 'ein' && choice.g === 'pl' && choice.word === 'ein'}
        <p class="note ui"><Rich text={'{ein} has no plural, so this shows {keine}: every ein-word (kein, mein, dein…) takes the same endings.'} /></p>
      {/if}
    </div>

    <div class="gridwrap">
      <p class="lbl ui">All the endings {choice.type === 'none' ? 'with no article' : `after ${choice.type === 'der' ? 'der-words' : 'ein-words'}`} <span class="decl">({declensionName(choice.type)})</span></p>
      <div class="scroll">
        <table class="grid">
          <thead>
            <tr>
              <th><span class="sr-only">Case</span></th>
              {#each GENDERS as g (g)}<th class="ui g-{g}" scope="col">{g === 'pl' ? 'pl.' : `${g === 'm' ? 'masc' : g === 'f' ? 'fem' : 'neut'}.`}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each CASES as c (c)}
              <tr>
                <th class="ui" scope="row">{ABBR[c]}</th>
                {#each GENDERS as g (g)}
                  {@const e = adjectiveEnding(choice.type, c, g)}
                  <td>
                    <button
                      type="button"
                      class="end"
                      class:en={e === 'en'}
                      class:on={choice.c === c && choice.g === g}
                      aria-label="{CASE_NAMES[c].en} {GENDER_NAMES[g as Gender]}: -{e}"
                      aria-pressed={choice.c === c && choice.g === g}
                      onclick={() => (choice = { ...choice, c, g })}>-{e}</button
                    >
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="hint ui">
        {#if choice.type === 'none'}No article: the adjective takes the endings of {'der/die/das'} itself, except -en in the masculine and neuter genitive.{:else if choice.type === 'ein'}Like after der-words, except where {'ein'} has no ending: there the adjective shows the gender (-er, -es).{:else}After der-words: -e in the five singular places where the article is der, die or das; -en everywhere else.{/if}
      </p>
    </div>
  {:else}
    <div class="drill">
      {#if finished}
        <p class="done ui"><strong>{score} / {ROUND}</strong> {score === ROUND ? 'Perfect!' : score >= 7 ? 'Well done.' : 'Keep at it: the grid in Explore shows every ending.'}</p>
        <button type="button" class="btn primary" onclick={restart}>Again</button>
      {:else}
        <div class="head ui"><span>{n + 1} / {ROUND}</span><span>Score {score}</span></div>
        <p class="phrase drillq"><span class="frame" lang="de">{q.before}</span> {@render np(q, !result)}<span class="frame" lang="de">{q.after}</span></p>
        <p class="en ui">“{q.en}”</p>
        <form class="row" onsubmit={check}>
          <input
            bind:this={input}
            bind:value
            class="ui"
            class:right={result?.verdict === 'right'}
            class:almost={result?.verdict === 'almost'}
            class:wrong={result?.verdict === 'wrong'}
            lang="de"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            aria-label="The adjective {q.base} with its ending"
            placeholder="{q.base}…"
            readonly={!!result}
          />
          {#if !result}<button class="btn" disabled={!value.trim()}>Check</button>{:else}<button type="button" class="btn primary" onclick={next}>Next <Icon name="arrow" size={14} /></button>{/if}
        </form>
        {#if !result}<UmlautKeys target={input} oninput={(v) => (value = v)} />{/if}
        <div class="feedback" aria-live="polite">
          {#if result}
            <p class="verdict ui" class:ok={result.verdict !== 'wrong'}>
              <strong lang="de">{result.verdict === 'wrong' ? 'Nicht ganz.' : 'Richtig!'}</strong>
              <span lang="de">{q.adj.stem}{q.adj.ending}</span>
              <PlayButton text={q.text} small />
            </p>
            <p class="why"><Rich text={nb(q.reason)} /></p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</Shell>

<style>
  .pickers {
    display: grid;
    gap: 0.6rem;
  }
  .group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.6rem;
  }
  .lbl {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
    min-width: 3.8rem;
    margin: 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chip {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.25rem 0.7rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
  .chip.small {
    font-family: var(--font-body);
    font-size: 0.92rem;
    padding: 0.15rem 0.6rem;
  }
  .chip.on {
    background: var(--fg);
    border-color: var(--fg);
    color: var(--bg);
  }
  .chip.gender.on {
    background: color-mix(in srgb, currentColor 14%, var(--panel));
    border-color: currentColor;
  }
  .chip.gender.on.g-m {
    color: var(--g-m);
  }
  .chip.gender.on.g-f {
    color: var(--g-f);
  }
  .chip.gender.on.g-n {
    color: var(--g-n);
  }
  .chip.gender.on.g-pl {
    color: var(--g-pl);
  }
  .words {
    padding-left: 0.4rem;
    border-left: 2px solid var(--line);
  }
  .result {
    margin: 1rem 0 0.4rem;
    padding: 0.9rem 0.9rem 0.7rem;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--line);
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.2rem 0.6rem;
  }
  .phrase {
    margin: 0;
    font-size: 1.45rem;
    line-height: 1.4;
  }
  .frame {
    color: var(--ink-2);
    font-weight: 450;
  }
  .np {
    font-weight: 600;
  }
  .art b {
    color: var(--ink-2);
    font-weight: inherit;
    text-decoration: underline;
    text-decoration-color: var(--line-strong);
    text-underline-offset: 0.18em;
  }
  .adj b {
    color: var(--accent-ink);
    background: var(--accent-soft);
    border-radius: 4px;
    padding: 0 0.06em;
    font-weight: 800;
  }
  .noun i {
    font-style: normal;
    color: var(--accent-ink);
  }
  .gap .blank {
    color: var(--accent-ink);
    letter-spacing: -0.05em;
  }
  .other {
    margin-left: auto;
    font-size: 0.78rem;
  }
  .en {
    margin: 0.2rem 0 0;
    color: var(--mute);
    font-size: 0.9rem;
  }
  .why {
    margin: 0.6rem 0 0;
    font-size: 0.95rem;
    line-height: 1.55;
  }
  .tag {
    display: inline-block;
    background: var(--accent);
    color: #fff;
    border-radius: 6px;
    padding: 0 0.4rem;
    font-weight: 700;
    font-size: 0.82rem;
    margin-right: 0.2rem;
  }
  .note {
    font-size: 0.85rem;
    color: var(--ink-2);
    margin: 0.4rem 0 0;
  }
  .gridwrap {
    margin-top: 0.9rem;
  }
  .decl {
    text-transform: none;
    letter-spacing: 0;
    font-weight: 500;
  }
  .scroll {
    overflow-x: auto;
  }
  .grid {
    display: table;
    width: auto;
    border-collapse: separate;
    border-spacing: 0.2rem;
    margin: 0.3rem 0 0;
  }
  .grid th,
  .grid td {
    border: none;
    padding: 0;
    text-align: center;
    vertical-align: middle;
  }
  .grid th {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0 0.3rem;
    color: var(--mute);
  }
  .grid th.g-m {
    color: var(--g-m);
  }
  .grid th.g-f {
    color: var(--g-f);
  }
  .grid th.g-n {
    color: var(--g-n);
  }
  .grid th.g-pl {
    color: var(--g-pl);
  }
  .end {
    width: 3.6rem;
    height: 2.1rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--gold-soft);
    color: var(--fg);
    font-family: var(--font-body);
    font-weight: 650;
    font-size: 1rem;
    cursor: pointer;
  }
  .end.en {
    background: var(--panel);
    color: var(--mute);
    font-weight: 500;
  }
  .end.on {
    outline: 2.5px solid var(--accent);
    outline-offset: -1px;
    color: var(--accent-ink);
    font-weight: 750;
  }
  .hint {
    font-size: 0.82rem;
    color: var(--mute);
    margin: 0.4rem 0 0;
  }
  .head {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--mute);
    margin-bottom: 0.5rem;
  }
  .drillq {
    font-size: 1.35rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.7rem 0 0.45rem;
  }
  .row input {
    flex: 1;
    min-width: 0;
    font-size: 1.1rem;
    padding: 0.5rem 0.75rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  .row input.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .row input.almost {
    border-color: var(--gold);
    background: var(--gold-soft);
  }
  .row input.wrong {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  .feedback {
    min-height: 3rem;
  }
  .verdict {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0.5rem 0 0;
  }
  .verdict strong {
    color: var(--accent-ink);
  }
  .verdict.ok strong {
    color: var(--jade);
  }
  .verdict span {
    font-family: var(--font-body);
    font-size: 1.1rem;
    font-weight: 650;
  }
  .done {
    font-size: 1.05rem;
  }
  @media (max-width: 480px) {
    .phrase {
      font-size: 1.2rem;
    }
    .lbl {
      min-width: 100%;
    }
  }
</style>

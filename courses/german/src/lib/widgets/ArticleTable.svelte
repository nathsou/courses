<script lang="ts">
  /**
   * A declension table: articles (or personal pronouns) by case and gender. Cells that differ
   * from the nominative are highlighted; tapping one speaks a little phrase ("mit dem Mann").
   * "Recall" hides the forms and turns the cells into inputs.
   */
  import { CASES, CASE_NAMES, GENDERS, GENDER_NAMES, joined, parseCases, pronoun, type Case, type Gender, type PronounCase } from '$lib/de/declension';
  import { KINDS, TABLE_KINDS, PERSON_LABELS, PERSON_GLOSS, cell, pronounPhrase, pronounChanged, type TableKind } from './grammar/articles';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import { mark, type Verdict } from '$lib/de/check';
  import Shell from './kit/Shell.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';

  let { kind = 'definite', cases }: { kind?: TableKind | 'personal'; cases?: string } = $props();

  const personal = $derived(kind === 'personal');
  const info = $derived(personal ? null : KINDS[TABLE_KINDS.includes(kind as TableKind) ? (kind as TableKind) : 'definite']);
  const caseList = $derived(parseCases(cases, personal ? ['nom', 'acc', 'dat'] : CASES));
  let word = $state<string | null>(null);
  const current = $derived(word && info?.words.includes(word) ? word : (info?.words[0] ?? 'der'));
  let reflexive = $state(false);
  let tab = $state(0);
  let said = $state<string | null>(null);

  const ABBR: Record<Case, string> = { nom: 'Nom.', acc: 'Acc.', dat: 'Dat.', gen: 'Gen.' };
  type Col = { id: PronounCase; label: string; sub: string };
  const pronounCols = $derived<Col[]>([
    ...caseList.map((c) => ({ id: c as PronounCase, label: ABBR[c], sub: CASE_NAMES[c].en })),
    ...(reflexive
      ? [
          { id: 'reflAcc' as const, label: 'sich', sub: 'reflexive acc.' },
          { id: 'reflDat' as const, label: 'sich', sub: 'reflexive dat.' },
        ]
      : []),
  ]);

  function play(phrase: string) {
    said = phrase;
    void speech.say(phrase);
  }

  // Recall mode: one answer per cell key.
  let answers = $state<Record<string, string>>({});
  let verdicts = $state<Record<string, Verdict> | null>(null);
  const key = (r: string, c: string) => `${r}:${c}`;
  const expected = $derived.by(() => {
    const out: Record<string, string> = {};
    if (personal) {
      for (let p = 0; p < 9; p++) for (const col of pronounCols) out[key(String(p), col.id)] = pronoun(p, col.id);
    } else {
      for (const c of caseList)
        for (const g of GENDERS) {
          const a = cell(kindId(), current, c, g).article;
          if (a) out[key(c, g)] = joined(a);
        }
    }
    return out;
  });
  function kindId(): TableKind {
    return TABLE_KINDS.includes(kind as TableKind) ? (kind as TableKind) : 'definite';
  }
  const score = $derived(verdicts ? Object.values(verdicts).filter((v) => v !== 'wrong').length : 0);
  const total = $derived(Object.keys(expected).length);

  function check() {
    const v: Record<string, Verdict> = {};
    for (const [k, a] of Object.entries(expected)) v[k] = mark(answers[k] ?? '', a).verdict;
    verdicts = v;
    const right = Object.values(v).filter((x) => x !== 'wrong').length;
    sfx(right === total ? 'done' : right > total / 2 ? 'right' : 'wrong', settings.data.sounds);
  }
  function retry() {
    if (verdicts) for (const [k, v] of Object.entries(verdicts)) if (v === 'wrong') answers[k] = '';
    verdicts = null;
  }
  function reset() {
    answers = {};
    verdicts = null;
  }
  $effect(() => {
    void current;
    void reflexive;
    void kind;
    reset();
  });

  const title = $derived(personal ? 'Personal pronouns' : info!.title);
  const showNounNote = $derived(!personal && (caseList.includes('dat') || caseList.includes('gen')));
</script>

{#snippet input(k: string, label: string)}
  {@const v = verdicts?.[k]}
  <span class="slot">
    <input
      class="ui"
      class:right={v === 'right'}
      class:almost={v === 'almost'}
      class:wrong={v === 'wrong'}
      lang="de"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label={label}
      readonly={!!verdicts}
      bind:value={answers[k]}
    />
    {#if v && v !== 'right'}<span class="fix" lang="de">{expected[k]}</span>{/if}
  </span>
{/snippet}

<Shell label="Declension table" icon="exam" {title} tabs={['Table', 'Recall']} bind:tab>
  {#if info && info.words.length > 1}
    <div class="words ui" role="radiogroup" aria-label="Which word">
      {#each info.words as w (w)}
        <button type="button" role="radio" aria-checked={current === w} class="chip" class:on={current === w} lang="de" onclick={() => (word = w)}>{w}</button>
      {/each}
    </div>
  {/if}
  {#if personal}
    <label class="refl ui"><input type="checkbox" bind:checked={reflexive} /> Show the reflexive pronouns (sich)</label>
  {/if}

  <div class="scroll">
    {#if personal}
      <table class="tbl personal">
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">Person</span></th>
            {#each pronounCols as col (col.id)}
              <th scope="col" class="ui"><span class="h">{col.label}</span><span class="sub">{col.sub}</span></th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each PERSON_LABELS as p, i (i)}
            <tr>
              <th scope="row" class="ui"><span class="h" lang="de">{p}</span><span class="sub">{PERSON_GLOSS[i]}</span></th>
              {#each pronounCols as col (col.id)}
                {@const form = pronoun(i, col.id)}
                {@const changed = pronounChanged(i, col.id)}
                <td class:changed={changed && tab === 0}>
                  {#if tab === 0}
                    <button type="button" class="cell" onclick={() => play(pronounPhrase(i, col.id))} aria-label="{p}, {col.sub}: {form}. Play “{pronounPhrase(i, col.id)}”">
                      <span class="art" lang="de">{form}</span>
                    </button>
                  {:else}
                    {@render input(key(String(i), col.id), `${p}, ${col.sub}`)}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    {:else if info}
      <table class="tbl">
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">Case</span></th>
            {#each GENDERS as g (g)}
              <th scope="col" class="ui g-{g}"><span class="h"><span class="long">{GENDER_NAMES[g]}</span><span class="short" aria-hidden="true">{g === 'pl' ? 'pl.' : `${g === 'm' ? 'masc' : g === 'f' ? 'fem' : 'neut'}.`}</span></span></th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each caseList as c (c)}
            <tr>
              <th scope="row" class="ui"><span class="h"><span class="long">{CASE_NAMES[c].en}</span><span class="short" aria-hidden="true">{ABBR[c]}</span></span><span class="sub long">{CASE_NAMES[c].role}</span></th>
              {#each GENDERS as g (g)}
                {@const x = cell(kindId(), current, c, g)}
                <td class:changed={x.changed && tab === 0}>
                  {#if tab === 0}
                    <button type="button" class="cell" onclick={() => play(x.phrase)} aria-label="{CASE_NAMES[c].en} {GENDER_NAMES[g as Gender]}: {x.article ? joined(x.article) : 'no article'} {joined(x.noun)}. Play “{x.phrase}”">
                      <span class="art g-{g}" lang="de">{#if x.article}{x.article.stem}<b>{x.article.ending}</b>{:else}–{/if}</span>
                      <span class="noun" lang="de">{x.noun.stem}{#if x.noun.ending}<mark>{x.noun.ending}</mark>{/if}</span>
                    </button>
                  {:else if x.article}
                    <span class="recall">{@render input(key(c, g), `${CASE_NAMES[c].en} ${GENDER_NAMES[g as Gender]}`)}<span class="noun" lang="de">{joined(x.noun)}</span></span>
                  {:else}
                    <span class="recall"><span class="none">–</span><span class="noun" lang="de">{joined(x.noun)}</span></span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  {#if tab === 0}
    <p class="said ui" aria-live="polite">
      {#if said}<PlayButton text={said} small /> <span lang="de" class="de">{said}</span>{:else}<span class="hint">Tap a form to hear it in a phrase. Shaded cells differ from the nominative.</span>{/if}
    </p>
    <div class="notes ui">
      {#if personal}
        <p>The accusative and dative change almost every pronoun. {reflexive ? 'The reflexive pronoun is the ordinary one except in the third person and with Sie, where it is always sich.' : ''}</p>
        {#if caseList.includes('gen')}<p><Rich text={'The genitive pronouns ({meiner, deiner}…) are rare and old-fashioned; you may meet them in older texts and set phrases such as {statt meiner} (“instead of me”).'} /></p>{/if}
      {:else if info}
        <p><Rich text={info.note} /></p>
        {#if showNounNote}
          <p>
            {#if caseList.includes('dat')}<Rich text={'The noun changes too: the dative plural adds -n ({den Kindern}), unless the plural already ends in -n or -s ({den Frauen}, {den Autos}).'} />{/if}
            {#if caseList.includes('gen')}<Rich text={'Masculine and neuter nouns add -es or -s in the genitive ({des Mannes}, {des Pullovers}); feminine nouns never change.'} />{/if}
          </p>
        {/if}
      {/if}
    </div>
  {:else}
    <div class="actions ui" aria-live="polite">
      {#if !verdicts}
        <button type="button" class="btn primary small" onclick={check}>Check</button>
        <span class="hint">Fill in every {personal ? 'pronoun' : 'article'}, then check.</span>
      {:else}
        <strong class:good={score === total}>{score} / {total}</strong>
        {#if score < total}<button type="button" class="btn small" onclick={retry}>Try the wrong ones again</button>{/if}
        <button type="button" class="btn ghost small" onclick={reset}>Clear</button>
      {/if}
    </div>
  {/if}
</Shell>

<style>
  .words {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.8rem;
  }
  .chip {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 560;
    cursor: pointer;
  }
  .chip.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent-ink);
  }
  .refl {
    display: flex;
    gap: 0.45rem;
    align-items: center;
    font-size: 0.85rem;
    color: var(--ink-2);
    margin-bottom: 0.7rem;
  }
  .scroll {
    overflow-x: auto;
    margin: 0 -0.2rem;
    padding: 0 0.2rem;
  }
  .tbl {
    display: table;
    width: 100%;
    border-collapse: separate;
    border-spacing: 0.25rem;
    margin: 0;
    font-size: 1rem;
    min-width: 30rem;
  }
  .tbl.personal {
    min-width: 0;
  }
  .short {
    display: none;
  }
  @media (max-width: 560px) {
    .tbl {
      min-width: 17rem;
      border-spacing: 0.18rem;
    }
    .tbl .long {
      display: none;
    }
    .tbl .short {
      display: inline;
    }
    .cell {
      padding: 0.3rem 0.4rem;
    }
    .art {
      font-size: 1rem;
    }
    .noun {
      font-size: 0.78rem;
    }
    thead th {
      padding: 0 0.3rem 0.15rem;
    }
  }
  .tbl th,
  .tbl td {
    border: none;
    padding: 0;
    vertical-align: middle;
    text-align: left;
  }
  thead th {
    padding: 0 0.4rem 0.2rem;
    text-transform: none;
    letter-spacing: 0;
  }
  th .h {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  th .sub {
    display: block;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--mute);
    text-transform: none;
    letter-spacing: 0;
  }
  thead th.g-m .h {
    color: var(--g-m);
  }
  thead th.g-f .h {
    color: var(--g-f);
  }
  thead th.g-n .h {
    color: var(--g-n);
  }
  thead th.g-pl .h {
    color: var(--g-pl);
  }
  tbody th {
    padding-right: 0.4rem;
    white-space: nowrap;
    color: var(--ink-2);
  }
  tbody th .h {
    color: var(--ink-2);
  }
  .personal tbody th .h {
    font-family: var(--font-body);
    text-transform: none;
    letter-spacing: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  td {
    background: var(--bg);
    border-radius: 9px;
  }
  td.changed {
    background: var(--gold-soft);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 45%, transparent);
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    min-height: 2.9rem;
    border: none;
    background: none;
    color: var(--fg);
    padding: 0.35rem 0.55rem;
    border-radius: 9px;
    cursor: pointer;
    text-align: left;
    line-height: 1.25;
  }
  .personal .cell {
    min-height: 2.4rem;
    justify-content: center;
  }
  .cell:hover {
    background: color-mix(in srgb, var(--accent) 9%, transparent);
  }
  .art {
    font-family: var(--font-body);
    font-weight: 650;
    font-size: 1.08rem;
  }
  .art b {
    font-weight: inherit;
  }
  .changed .art b {
    font-weight: 800;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 0.18em;
  }
  .personal .art {
    color: var(--fg);
  }
  .noun {
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .noun mark {
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-weight: 700;
    border-radius: 3px;
  }
  .recall {
    display: flex;
    flex-direction: column;
    padding: 0.3rem 0.4rem;
    gap: 0.1rem;
  }
  .personal td .slot {
    padding: 0.3rem 0.4rem;
  }
  .slot {
    display: flex;
    flex-direction: column;
  }
  .slot input {
    width: 100%;
    min-width: 4.2rem;
    font-size: 1rem;
    padding: 0.3rem 0.45rem;
    border-radius: 7px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  .slot input.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .slot input.almost {
    border-color: var(--gold);
    background: var(--gold-soft);
  }
  .slot input.wrong {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  .fix {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--jade);
  }
  .none {
    color: var(--mute);
    padding: 0.3rem 0.1rem;
  }
  .said {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.2rem;
    margin: 0.7rem 0 0.2rem;
    font-size: 0.88rem;
  }
  .said .de {
    font-family: var(--font-body);
    font-size: 1.1rem;
    font-weight: 560;
  }
  .hint {
    color: var(--mute);
  }
  .notes {
    font-size: 0.86rem;
    color: var(--ink-2);
    line-height: 1.55;
  }
  .notes p {
    margin: 0.4rem 0 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.8rem;
    font-size: 0.88rem;
  }
  .actions strong {
    font-size: 1.05rem;
    color: var(--accent-ink);
  }
  .actions strong.good {
    color: var(--jade);
  }
</style>

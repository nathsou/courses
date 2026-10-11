<script lang="ts">
  /**
   * Relative pronouns: choose the noun (gender, number) and the pronoun's job in its own clause
   * (case); see der/den/dem/dessen… in a full sentence with the verb at the end. Table and quiz.
   */
  import { REL_NOUNS, REL_ROLES, REL_SENTENCES, REL_TABLE, ARTICLE_TABLE, REL_OPTIONS, REL_QUIZ, type RelGender, type RelCase } from './data/relative-pronouns';
  import Shell from './kit/Shell.svelte';
  import HiText from './kit/HiText.svelte';
  import Quiz from './kit/Quiz.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import { unmark, type Tone } from './kit/marks';

  let tab = $state(0);
  let noun = $state<RelGender>('m');
  let roleId = $state('dat');

  const TONE: Record<RelGender, Tone> = { m: 'blue', f: 'red', n: 'green', pl: 'purple' };
  const GENDER: Record<RelGender, string> = { m: 'masculine', f: 'feminine', n: 'neuter', pl: 'plural' };
  const CASES: RelCase[] = ['nom', 'acc', 'dat', 'gen'];
  const CASE_NAME: Record<RelCase, string> = { nom: 'nominative', acc: 'accusative', dat: 'dative', gen: 'genitive' };
  const GENDERS: RelGender[] = ['m', 'f', 'n', 'pl'];
  const SHORT: Record<RelGender, string> = { m: 'masc.', f: 'fem.', n: 'neut.', pl: 'pl.' };

  const role = $derived(REL_ROLES.find((r) => r.id === roleId)!);
  const sentence = $derived(REL_SENTENCES.find((s) => s.noun === noun && s.role === roleId)!);
  const pronoun = $derived(REL_TABLE[role.kind][noun]);
  const differs = (c: RelCase, g: RelGender) => REL_TABLE[c][g] !== ARTICLE_TABLE[c][g];

  function pickCell(c: RelCase, g: RelGender) {
    noun = g;
    if (role.kind !== c) roleId = REL_ROLES.find((r) => r.kind === c)!.id;
  }

  const quizItems = REL_QUIZ.map((q) => ({ ...q, options: REL_OPTIONS }));
</script>

<Shell label="Relative pronouns" icon="sparkle" tabs={['Explore', 'Table', 'Quiz']} bind:tab>
  {#if tab === 0}
    <div class="pick">
      <div class="group">
        <span class="lbl ui" id="rp-noun">The noun</span>
        <div class="seg" role="radiogroup" aria-labelledby="rp-noun">
          {#each REL_NOUNS as n (n.id)}
            <button type="button" role="radio" aria-checked={noun === n.id} class="chip g-{n.id}" class:on={noun === n.id} onclick={() => (noun = n.id)} lang="de">{n.de}</button>
          {/each}
        </div>
      </div>
      <div class="group">
        <span class="lbl ui" id="rp-role">Its job in the relative clause</span>
        <div class="seg" role="radiogroup" aria-labelledby="rp-role">
          {#each REL_ROLES as r (r.id)}
            <button type="button" role="radio" aria-checked={roleId === r.id} class="chip ui role" class:on={roleId === r.id} onclick={() => (roleId = r.id)}>{r.label}</button>
          {/each}
        </div>
      </div>
    </div>

    <div class="result" aria-live="polite">
      <div class="big">
        <span class="pron g-{noun}" lang="de">{pronoun}</span>
        <span class="tags ui"><span>{GENDER[noun]}</span><span>{CASE_NAME[role.kind]}</span></span>
      </div>
      <p class="sent"><HiText text={sentence.de} tones={[TONE[noun], 'gold']} size="lg" /><PlayButton text={unmark(sentence.de)} /></p>
      <p class="en ui">{sentence.en}</p>
      <p class="why"><Rich text={role.explain} /></p>
      <p class="rule ui"><strong>Gender and number</strong> come from the noun it refers back to; <strong>case</strong> from its job in its own clause. A comma opens the clause, and its verb goes <span class="verb">to the end</span>.</p>
    </div>
  {:else if tab === 1}
    <p class="cap ui">Tap a cell to see it in a sentence.</p>
    <div class="scroll">
      <table class="tbl" aria-label="Relative pronouns by case and gender">
                <thead>
          <tr><th></th>{#each GENDERS as g (g)}<th scope="col" class="ui g-{g}"><span class="long">{GENDER[g]}</span><span class="short">{SHORT[g]}</span></th>{/each}</tr>
        </thead>
        <tbody>
          {#each CASES as c (c)}
            <tr>
              <th scope="row" class="ui"><span class="long">{CASE_NAME[c]}</span><span class="short">{c}.</span></th>
              {#each GENDERS as g (g)}
                <td>
                  <button
                    type="button"
                    class="cell g-{g}"
                    class:cur={c === role.kind && g === noun}
                    class:diff={differs(c, g)}
                    aria-label="{REL_TABLE[c][g]}: {CASE_NAME[c]} {GENDER[g]}{differs(c, g) ? ', differs from the article' : ''}"
                    onclick={() => pickCell(c, g)}
                    lang="de">{REL_TABLE[c][g]}</button
                  >
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="note ui">Underlined forms differ from the definite article: the whole genitive row (<em lang="de">dessen, deren</em> instead of <em lang="de">des, der</em>) and the dative plural <em lang="de">denen</em> (not <em lang="de">den</em>). Everything else is simply the article.</p>
    <p class="sent small"><HiText text={sentence.de} tones={[TONE[noun], 'gold']} size="md" play /></p>
  {:else}
    <p class="ui intro">Fill the gap with the right relative pronoun.</p>
    <Quiz items={quizItems} seed="relative-pronouns" count={8} shuffleOptions={false} />
  {/if}
</Shell>

<style>
  .pick {
    display: grid;
    gap: 0.7rem;
  }
  .lbl {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
    margin-bottom: 0.3rem;
  }
  .seg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .chip {
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.98rem;
    line-height: 1.3;
  }
  .chip.role {
    font-family: var(--font-ui);
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .chip:hover {
    border-color: var(--mute);
  }
  .chip.on {
    border-color: currentColor;
    background: color-mix(in srgb, currentColor 10%, var(--panel));
  }
  .chip.role.on {
    color: var(--accent-ink);
  }
  .result {
    margin-top: 1rem;
    padding: 0.9rem 1rem;
    background: var(--pn);
    border-radius: 12px;
  }
  .big {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.4rem 0.8rem;
  }
  .pron {
    font-size: 2.4rem;
    font-weight: 650;
    line-height: 1.1;
  }
  .tags {
    display: inline-flex;
    gap: 0.3rem;
  }
  .tags span {
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: 0.05rem 0.55rem;
    color: var(--ink-2);
    background: var(--panel);
  }
  .sent {
    margin: 0.5rem 0 0.1rem;
  }
  .sent.small {
    margin-top: 0.4rem;
  }
  .en {
    margin: 0;
    color: var(--mute);
    font-size: 0.9rem;
  }
  .why {
    margin: 0.6rem 0 0.4rem;
    font-size: 0.98rem;
  }
  .rule {
    margin: 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .verb {
    color: var(--gold);
    font-weight: 600;
  }
  .scroll {
    overflow-x: auto;
    container-type: inline-size;
  }
  .tbl {
    border-collapse: collapse;
    width: 100%;
    margin: 0;
  }
  .short {
    display: none;
  }
  .cap {
    font-size: 0.82rem;
    color: var(--mute);
    margin: 0 0 0.4rem;
  }
  th {
    font-size: 0.76rem;
    font-weight: 600;
    text-align: left;
    padding: 0.3rem 0.4rem;
    color: var(--mute);
  }
  thead th {
    text-align: center;
  }
  td {
    padding: 0.15rem;
    text-align: center;
  }
  .cell {
    width: 100%;
    min-height: 2.4rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    font-family: var(--font-body);
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
  }
  .cell.diff {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 0.2em;
  }
  .cell.cur {
    border-color: currentColor;
    background: color-mix(in srgb, currentColor 12%, var(--panel));
    box-shadow: 0 0 0 1px currentColor;
  }
  .note {
    font-size: 0.82rem;
    color: var(--ink-2);
    margin: 0.7rem 0 0;
  }
  .intro {
    margin: 0 0 0.6rem;
    font-size: 0.88rem;
    color: var(--mute);
  }
  @container (max-width: 30rem) {
    .long {
      display: none;
    }
    .short {
      display: inline;
    }
    .tbl {
      table-layout: fixed;
    }
    .tbl th:first-child {
      width: 2.5rem;
    }
    .cell {
      font-size: 0.8rem;
      padding: 0;
    }
    th {
      padding: 0.2rem 0.15rem;
      font-size: 0.68rem;
    }
    td {
      padding: 0.1rem;
    }
  }
</style>

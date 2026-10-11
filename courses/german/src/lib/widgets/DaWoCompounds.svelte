<script lang="ts">
  /**
   * Verbs with prepositions: for a thing, Worauf? – Darauf; for a person, Auf wen? – Auf sie;
   * the da-compound pointing ahead to a clause; the linking r (dar-auf, wo-mit). Quiz: type it.
   */
  import { DAWO_VERBS, DAWO_EXPLAIN, DAWO_PREPS, DAWO_QUIZ, type DaWoLine } from './data/da-wo-compounds';
  import Shell from './kit/Shell.svelte';
  import HiText from './kit/HiText.svelte';
  import Quiz from './kit/Quiz.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';

  type Mode = 'thing' | 'person' | 'clause';
  const MODES: { id: Mode; label: string }[] = [
    { id: 'thing', label: 'a thing' },
    { id: 'person', label: 'a person' },
    { id: 'clause', label: 'a clause' },
  ];

  let tab = $state(0);
  let verbId = $state(DAWO_VERBS[0]!.id);
  let mode = $state<Mode>('thing');

  const verb = $derived(DAWO_VERBS.find((v) => v.id === verbId)!);
  const line = $derived(mode === 'clause' ? null : verb[mode]);
  const clause = $derived(verb.clause);
  const isLine = (l: DaWoLine | { none: true; note: string } | null): l is DaWoLine => !!l && !('none' in l);
  const vowel = (p: string) => /^[aeiouäöü]/i.test(p);
</script>

<Shell label="da- and wo-compounds" icon="chat" tabs={['Explore', 'Quiz']} bind:tab>
  {#if tab === 0}
    <div class="verbs" role="radiogroup" aria-label="Verb and preposition">
      {#each DAWO_VERBS as v (v.id)}
        <button type="button" role="radio" aria-checked={verbId === v.id} class="chip" class:on={verbId === v.id} onclick={() => (verbId = v.id)}>
          <span lang="de">{v.de}</span><span class="case ui" title={v.kind === 'acc' ? 'accusative' : 'dative'}>+{v.kind === 'acc' ? 'A' : 'D'}</span>
        </button>
      {/each}
    </div>

    <div class="head">
      <p class="gloss ui"><strong lang="de">{verb.de}</strong> (+ {verb.kind === 'acc' ? 'accusative' : 'dative'}): {verb.en}</p>
      <div class="seg ui" role="radiogroup" aria-label="What comes after the preposition">
        {#each MODES as m (m.id)}
          <button type="button" role="radio" aria-checked={mode === m.id} class:on={mode === m.id} onclick={() => (mode = m.id)}>{m.label}</button>
        {/each}
      </div>
    </div>

    <div class="stage" aria-live="polite">
      <p class="kind ui">{DAWO_EXPLAIN[mode].title}</p>
      {#if mode !== 'clause'}
        {#if isLine(line)}
          <p class="s"><HiText text={line.stmt} tone={mode === 'thing' ? 'blue' : 'purple'} size="md" play /></p>
          <div class="qa">
            <p class="q"><span class="who ui">Q</span><HiText text={line.ask} tone="accent" size="md" play /></p>
            <p class="a"><span class="who ui">A</span><HiText text={line.reply} tone="jade" size="md" play /></p>
          </div>
        {:else if line}
          <p class="none"><Rich text={line.note} /></p>
        {/if}
      {:else if 'none' in clause}
        <p class="none"><Rich text={clause.note} /></p>
      {:else}
        <p class="s"><HiText text={clause.de} tone="jade" size="md" play /></p>
        <p class="en ui">{clause.en}</p>
      {/if}
      <p class="explain"><Rich text={DAWO_EXPLAIN[mode].explain} /></p>
    </div>

    <div class="r">
      <p class="kind ui">The linking r</p>
      <div class="builds" lang="de">
        {#each [['wo', verb.wo], ['da', verb.da]] as [head, whole] (head)}
          <p class="build">
            <span class="part">{head}</span>{#if vowel(verb.prep)}<span class="link">r</span>{/if}<span class="part p">{verb.prep}</span>
            <span class="eq">→</span> <strong>{whole}</strong>
          </p>
        {/each}
      </div>
      <p class="rule ui">Before a vowel, an <span class="lk">r</span> keeps the two vowels apart: <em lang="de">dar·auf, wor·an</em>, but <em lang="de">da·mit, wo·für</em>.</p>
      <ul class="grid" lang="de">
        {#each DAWO_PREPS as p (p.prep)}
          <li class:cur={p.prep === verb.prep}>
            <span>da{#if vowel(p.prep)}<b class="lk">r</b>{/if}{p.prep}</span>
            <span class="wo">wo{#if vowel(p.prep)}<b class="lk">r</b>{/if}{p.prep}</span>
          </li>
        {/each}
      </ul>
    </div>
  {:else}
    <p class="ui intro">Type the missing words: a da- or wo-compound for things, preposition + pronoun for people.</p>
    <Quiz items={DAWO_QUIZ} seed="da-wo-compounds" count={8} />
  {/if}
</Shell>

<style>
  .verbs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.22rem 0.65rem;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.92rem;
    font-weight: 560;
  }
  .chip:hover {
    border-color: var(--mute);
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .case {
    font-size: 0.66rem;
    font-weight: 700;
    color: var(--mute);
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin: 0.9rem 0 0.6rem;
  }
  .gloss {
    margin: 0;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .gloss strong {
    font-family: var(--font-body);
    font-size: 1.05rem;
    color: var(--fg);
  }
  .seg {
    display: inline-flex;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: 2px;
  }
  .seg button {
    border: none;
    background: none;
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
    color: var(--ink-2);
  }
  .seg button.on {
    background: var(--fg);
    color: var(--bg);
  }
  .stage {
    background: var(--pn);
    border-radius: 12px;
    padding: 0.8rem 1rem;
  }
  .kind {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  .s {
    margin: 0.3rem 0 0;
  }
  .qa {
    margin-top: 0.5rem;
    display: grid;
    gap: 0.2rem;
  }
  .q,
  .a {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .who {
    flex: none;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--mute);
    width: 1rem;
  }
  .en {
    margin: 0.1rem 0 0;
    font-size: 0.88rem;
    color: var(--mute);
  }
  .none {
    margin: 0.4rem 0 0;
    padding: 0.5rem 0.7rem;
    border-left: 3px solid var(--gold);
    background: var(--gold-soft);
    border-radius: 0 8px 8px 0;
  }
  .explain {
    margin: 0.7rem 0 0;
    padding-top: 0.6rem;
    border-top: 1px solid var(--line);
    font-size: 0.95rem;
  }
  .r {
    margin-top: 0.9rem;
  }
  .builds {
    display: flex;
    flex-wrap: wrap;
    gap: 0 2rem;
    margin: 0.3rem 0 0.2rem;
  }
  .build {
    margin: 0;
    font-size: 1.2rem;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.15rem;
  }
  .part {
    padding: 0 0.25rem;
    border-radius: 6px;
    background: var(--pn);
  }
  .part.p {
    color: var(--g-m);
  }
  .link,
  .lk {
    color: var(--accent-ink);
    font-weight: 700;
  }
  .link {
    padding: 0 0.15rem;
  }
  .eq {
    color: var(--mute);
    margin: 0 0.25rem;
  }
  .rule {
    margin: 0 0 0.5rem;
    font-size: 0.84rem;
    color: var(--ink-2);
  }
  .grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0.25rem;
    font-size: 0.92rem;
  }
  .grid li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.4rem;
    padding: 0.15rem 0.5rem;
    border: 1px solid var(--line);
    border-radius: 8px;
  }
  .grid li.cur {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .grid b {
    font-weight: 700;
  }
  .wo {
    color: var(--mute);
  }
  .intro {
    margin: 0 0 0.6rem;
    font-size: 0.88rem;
    color: var(--mute);
  }
</style>

<!--
  The tool chooser (chapter 30): a few questions about what is to be checked, and the matching tools, best first,
  each with the chapter where the course builds its idea and, when it has one, its section in the Rosetta appendix.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { choose, type Answers, type Design, type Lang, type Target, type Want } from './tools';

  let { title }: { title?: string } = $props();

  let target = $state<Target | undefined>('code');
  let lang = $state<Lang | undefined>(undefined);
  let want = $state<Want | undefined>(undefined);
  let design = $state<Design | undefined>(undefined);

  const answers = $derived<Answers>({ target, lang: target === 'code' ? lang : undefined, want: target === 'code' ? want : undefined, design: target === 'design' ? design : undefined });
  const result = $derived(choose(answers));

  const TARGETS: [Target, string][] = [
    ['code', 'Code I write or maintain'],
    ['design', 'A design: a protocol, an algorithm, a data model'],
    ['hardware', 'A hardware circuit'],
    ['math', 'Anything else: mathematics, a language, a compiler'],
  ];
  const LANGS: [Lang, string][] = [
    ['c', 'C'],
    ['rust', 'Rust'],
    ['java', 'Java'],
    ['ada', 'Ada'],
    ['other', 'A language built for verification'],
  ];
  const WANTS: [Want, string][] = [
    ['proof', 'A proof against contracts I write'],
    ['sound', 'No run-time errors, proved automatically'],
    ['bugs', 'Bugs found automatically, few false alarms'],
    ['bounded', 'Every input up to a bound, no annotations'],
  ];
  const DESIGNS: [Design, string][] = [
    ['protocol', 'A concurrent or distributed protocol'],
    ['param', 'A protocol, for any number of nodes'],
    ['data', 'A data model: relations and constraints'],
  ];
</script>

<figure class="tc">
  {#if title}<h4 class="ui ttl">{title}</h4>{/if}
  <div class="cols">
    <div class="qs ui">
      <fieldset>
        <legend>What are you checking?</legend>
        {#each TARGETS as [v, l] (v)}<label><input type="radio" name="tc-target" value={v} bind:group={target} /> {l}</label>{/each}
      </fieldset>
      {#if target === 'code'}
        <fieldset>
          <legend>In which language?</legend>
          {#each LANGS as [v, l] (v)}<label><input type="radio" name="tc-lang" value={v} bind:group={lang} /> {l}</label>{/each}
        </fieldset>
        <fieldset>
          <legend>What do you want from the tool?</legend>
          {#each WANTS as [v, l] (v)}<label><input type="radio" name="tc-want" value={v} bind:group={want} /> {l}</label>{/each}
        </fieldset>
      {:else if target === 'design'}
        <fieldset>
          <legend>What kind of design?</legend>
          {#each DESIGNS as [v, l] (v)}<label><input type="radio" name="tc-design" value={v} bind:group={design} /> {l}</label>{/each}
        </fieldset>
      {/if}
    </div>
    <div class="res" aria-live="polite">
      {#if result.relaxed}<p class="ui note">No tool here matches every answer. These match {result.relaxed === 'want' ? 'the language' : 'the kind of target'}; the course’s chapters say what each one can and cannot promise.</p>{/if}
      <ol>
        {#each result.tools as t, i (t.id)}
          <li class:top={i === 0}>
            <p class="th"><b>{t.name}</b> <span class="fam ui">{t.family}</span></p>
            <p class="bl">{t.blurb}</p>
            <p class="links ui">
              The idea in this course: {#each t.chapters as c, k (c.slug)}{k ? ', ' : ''}<a href="{base}/chapters/{c.slug}/">chapter {c.label}</a>{/each}{#if t.rosetta}. Side by side with Vouch: <a href="{base}/appendices/rosetta/#{t.rosetta}">Rosetta</a>{/if}.
            </p>
          </li>
        {/each}
      </ol>
    </div>
  </div>
</figure>

<style>
  .tc {
    margin: 1.8rem 0;
    padding: 0.9rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--pn);
  }
  .ttl {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.4fr);
    gap: 0.9rem;
    align-items: start;
  }
  @media (max-width: 760px) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .qs {
    display: grid;
    gap: 0.6rem;
  }
  fieldset {
    margin: 0;
    padding: 0.45rem 0.7rem 0.55rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--panel);
    font-size: 0.86rem;
  }
  legend {
    padding: 0 0.3rem;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  label {
    display: flex;
    gap: 0.45rem;
    align-items: baseline;
    padding: 0.12rem 0;
  }
  .note {
    margin: 0 0 0.5rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--gold);
    border-radius: var(--radius-sm);
    background: var(--gold-soft);
    font-size: 0.82rem;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.45rem;
  }
  li {
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--line-strong);
    border-left: 4px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--panel);
  }
  li.top {
    border-left-color: var(--seal);
  }
  li p {
    margin: 0.15rem 0;
  }
  .th {
    font-size: 0.98rem;
  }
  .fam {
    margin-left: 0.3rem;
    font-size: 0.72rem;
    color: var(--mute);
  }
  .bl {
    font-size: 0.9rem;
  }
  .links {
    font-size: 0.78rem;
    color: var(--ink-2);
  }
</style>

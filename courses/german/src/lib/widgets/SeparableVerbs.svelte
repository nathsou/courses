<script lang="ts">
  /**
   * One separable verb through seven structures: statement, question, imperative, with a modal,
   * perfect, subordinate clause and zu-infinitive. The prefix is highlighted wherever it lands.
   */
  import { SEP_VERBS, STRUCTURES, type Structure } from './data/separable-verbs';
  import { pieces } from './grammar/separable';
  import Shell from './kit/Shell.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';

  let vid = $state(SEP_VERBS[0]!.id);
  let sid = $state<Structure>('present');
  const verb = $derived(SEP_VERBS.find((v) => v.id === vid) ?? SEP_VERBS[0]!);
  const structure = $derived(STRUCTURES.find((s) => s.id === sid)!);
  const sentence = $derived(verb.sentences[sid]);
  const split = (v: string, p: string) => `${p}·${v.slice(p.length)}`;
  const ruleText = $derived(
    sid === 'perfect'
      ? `${structure.rule} {${verb.pp}} goes with {${verb.aux}}${verb.why ? `: ${verb.why}.` : ', like most verbs.'}`
      : sid === 'zu'
        ? `${structure.rule} {${verb.prefix}zu${verb.verb.slice(verb.prefix.length)}}`
        : structure.rule,
  );
</script>

{#snippet hi(text: string, s: Structure, big: boolean)}
  <span class="hi" class:big lang="de"
    >{#each pieces(text, verb, s) as p, i (i)}{#if p.k === 'text'}{p.t}{:else}<span class="p-{p.k}">{p.t}</span>{/if}{/each}</span
  >
{/snippet}

<Shell label="Separable verbs" icon="arrow" title="Where does the prefix go?">
  <div class="group">
    <span class="lbl ui" id="sv-verb">Verb</span>
    <div class="chips" role="radiogroup" aria-labelledby="sv-verb">
      {#each SEP_VERBS as v (v.id)}
        <button type="button" role="radio" aria-checked={vid === v.id} class="chip de" class:on={vid === v.id} lang="de" onclick={() => (vid = v.id)}><span class="pre">{v.prefix}</span>{v.verb.slice(v.prefix.length)}</button>
      {/each}
    </div>
  </div>
  <p class="gloss ui"><span lang="de" class="de">{split(verb.verb, verb.prefix)}</span> {verb.gloss} · perfect with {verb.aux}</p>

  <div class="group">
    <span class="lbl ui" id="sv-str">Structure</span>
    <div class="chips" role="radiogroup" aria-labelledby="sv-str">
      {#each STRUCTURES as s (s.id)}
        <button type="button" role="radio" aria-checked={sid === s.id} class="chip ui" class:on={sid === s.id} onclick={() => (sid = s.id)}>{s.label}</button>
      {/each}
    </div>
  </div>

  <div class="stage" aria-live="polite">
    <p class="sentence">{@render hi(sentence.de, sid, true)} <PlayButton text={sentence.de} /></p>
    <p class="en ui">“{sentence.en}”</p>
    <p class="rule ui"><Rich text={ruleText} /></p>
  </div>

  <details class="all">
    <summary class="ui">All seven at once</summary>
    <ul>
      {#each STRUCTURES as s (s.id)}
        <li class:cur={s.id === sid}>
          <button type="button" class="row" onclick={() => (sid = s.id)}>
            <span class="slabel ui">{s.label}</span>
            {@render hi(verb.sentences[s.id].de, s.id, false)}
          </button>
        </li>
      {/each}
    </ul>
  </details>
  <p class="key ui"><span class="p-prefix">prefix</span> <span class="p-stem">verb</span> <span class="p-infix">ge / zu</span> <span class="p-aux">auxiliary or modal</span></p>
</Shell>

<style>
  .group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.6rem;
    margin-bottom: 0.55rem;
  }
  .lbl {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
    min-width: 4.6rem;
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
    padding: 0.22rem 0.7rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }
  .chip.de {
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 560;
  }
  .chip .pre {
    color: var(--accent-ink);
    font-weight: 750;
  }
  .chip.on {
    background: var(--fg);
    border-color: var(--fg);
    color: var(--bg);
  }
  .chip.on .pre {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
  .gloss {
    margin: -0.15rem 0 0.7rem;
    font-size: 0.85rem;
    color: var(--mute);
  }
  .gloss .de {
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--fg);
    font-size: 1rem;
  }
  .stage {
    margin: 0.7rem 0 0.6rem;
    padding: 0.85rem 0.9rem 0.7rem;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--line);
  }
  .sentence {
    margin: 0;
  }
  .hi {
    font-weight: 560;
  }
  .hi.big {
    font-size: 1.4rem;
    line-height: 1.5;
  }
  .p-prefix {
    color: var(--accent-ink);
    background: var(--accent-soft);
    border-radius: 4px;
    font-weight: 750;
    box-shadow: inset 0 -2px 0 var(--accent);
  }
  .p-stem {
    color: var(--jade);
    font-weight: 700;
  }
  .p-infix {
    color: var(--gold);
    font-weight: 750;
    text-decoration: underline wavy;
    text-underline-offset: 0.2em;
  }
  .p-aux {
    color: var(--ink-2);
    font-weight: 700;
    text-decoration: underline dotted;
    text-underline-offset: 0.2em;
  }
  .en {
    margin: 0.35rem 0 0;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .rule {
    margin: 0.55rem 0 0;
    font-size: 0.88rem;
    color: var(--ink-2);
    line-height: 1.55;
  }
  .all summary {
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink-2);
  }
  .all ul {
    list-style: none;
    padding: 0;
    margin: 0.4rem 0 0;
  }
  .all li {
    margin: 0;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.1rem 0.7rem;
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    color: var(--fg);
    padding: 0.3rem 0.4rem;
    border-radius: 8px;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 1rem;
  }
  .row:hover,
  .cur .row {
    background: var(--pn);
  }
  .slabel {
    width: 8.5rem;
    flex: none;
    font-size: 0.75rem;
    color: var(--mute);
  }
  .key {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.9rem;
    font-size: 0.75rem;
    margin: 0.7rem 0 0;
  }
  @media (max-width: 480px) {
    .hi.big {
      font-size: 1.2rem;
    }
    .lbl {
      min-width: 100%;
    }
  }
</style>

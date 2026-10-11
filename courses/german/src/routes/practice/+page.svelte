<script lang="ts">
  /** The practice arcade: every game and drill in one place, independent of the lessons. */
  import type { Component } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import GenderBlitz from '$lib/practice/GenderBlitz.svelte';
  import VerbDrill from '$lib/practice/VerbDrill.svelte';
  import WordBlitz from '$lib/practice/WordBlitz.svelte';
  import Dictation from '$lib/practice/Dictation.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  /** Lesson widgets that double as practice tools (shown when present). */
  const widgets = import.meta.glob<{ default: Component<Record<string, unknown>> }>('/src/lib/widgets/*.svelte', { eager: true });
  const widget = (name: string) => widgets[`/src/lib/widgets/${name}.svelte`]?.default;

  type Game = { id: string; title: string; de: string; icon: string; text: string; best?: string; C?: Component<Record<string, unknown>>; props?: Record<string, unknown> };
  const GAMES: Game[] = [
    { id: 'gender', title: 'Der-die-das blitz', de: 'der?', icon: 'flame', text: 'Sixty seconds of articles, with the ending rule after every slip.', best: 'gender-blitz', C: GenderBlitz as Component<Record<string, unknown>> },
    { id: 'verbs', title: 'Verb drill', de: 'ich bin', icon: 'keyboard', text: 'A verb, a person, a tense: type the form. Tenses follow your level.', best: 'verbs', C: VerbDrill as Component<Record<string, unknown>> },
    { id: 'blitz', title: 'Word blitz', de: 'schnell!', icon: 'cards', text: 'Sixty seconds of meanings, read or heard, from a level or your deck.', best: 'blitz', C: WordBlitz as Component<Record<string, unknown>> },
    { id: 'dictation', title: 'Dictation', de: 'Diktat', icon: 'speaker', text: 'Hear a sentence from the lessons, type it, compare word by word.', C: Dictation as Component<Record<string, unknown>> },
    { id: 'endings', title: 'Adjective endings', de: 'mit dem alten', icon: 'sparkle', text: 'Article type, gender, case: the ending and why, then a drill.', C: widget('AdjectiveEndings') },
    { id: 'cases', title: 'Case machine', de: 'den Mann', icon: 'shuffle', text: 'Give nouns roles; watch the articles change and the word order move.', C: widget('CaseMachine'), props: { cases: 'all' } },
    { id: 'tables', title: 'Article tables', de: 'dem, der', icon: 'book', text: 'Every declension table, with a hide-and-recall mode.', C: widget('ArticleTable') },
    { id: 'conjugator', title: 'Conjugator', de: 'fahren', icon: 'book', text: 'Every tense of every verb in the course.', C: widget('Conjugator') },
    { id: 'prepositions', title: 'Wo or wohin?', de: 'auf den Tisch', icon: 'map', text: 'The cat, the box and the two-way prepositions.', C: widget('PrepositionScene') },
    { id: 'numbers', title: 'Numbers', de: 'einundzwanzig', icon: 'sparkle', text: 'Numbers built from their parts, and a listening quiz.', C: widget('NumberExplorer'), props: { max: 1000000 } },
    { id: 'clock', title: 'The clock', de: 'halb drei', icon: 'clock', text: 'Set the clock; read the time both ways; listening quiz.', C: widget('ClockTime') },
    { id: 'order', title: 'Word order', de: 'Verb zwei', icon: 'shuffle', text: 'The sentence fields: the verb second, the verb last.', C: widget('WordOrder') },
    { id: 'genders', title: 'Gender rules', de: '-ung, -chen', icon: 'lightbulb', text: 'The endings that predict der, die and das.', C: widget('GenderRules') },
    { id: 'sounds', title: 'Sounds', de: 'ü, ch, r', icon: 'mic', text: 'Every German sound, with minimal pairs to train your ear.', C: widget('SoundBoard') },
    { id: 'map', title: 'Town map', de: 'links, rechts', icon: 'map', text: 'Follow directions through a small German town.', C: widget('TownMap') },
  ];
  const available = GAMES.filter((g) => g.C);
  const current = $derived(page.url.hash.slice(1) || null);
  const game = $derived(available.find((g) => g.id === current));
  const bestOf = (prefix?: string) => (prefix ? Math.max(-1, ...Object.entries(progress.data.best).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v)) : -1);
</script>

<svelte:head><title>Practice · Auf Deutsch</title></svelte:head>

<div class="page">
  <h1>Practice</h1>
  <p class="ui lead">Short games and tools that train one thing each. Five minutes of any of them is time well spent.</p>

  <div class="grid">
    {#each available as g (g.id)}
      {@const b = bestOf(g.best)}
      <a class="game card" id={g.id} class:on={current === g.id} href="#{g.id}" onclick={(e) => { e.preventDefault(); goto(`#${g.id}`, { replaceState: true, noScroll: true }); }}>
        <span class="gzh" lang="de">{g.de}</span>
        <span class="gt">{g.title}</span>
        <span class="gd ui">{g.text}</span>
        {#if b >= 0}<span class="best ui">Best: {b}</span>{/if}
      </a>
    {/each}
  </div>

  {#if game?.C}
    <section class="stage" aria-label={game.title}>
      <h2><Icon name={game.icon} size={20} /> {game.title}</h2>
      {#key game.id}<game.C {...game.props ?? {}} />{/key}
    </section>
  {/if}
</div>

<style>
  .page {
    padding: 2.2rem clamp(1rem, 4vw, 3.5rem) 4rem;
    max-width: 60rem;
  }
  h1 {
    margin: 0 0 0.3rem;
  }
  .lead {
    color: var(--ink-2);
    margin: 0 0 1.2rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 12.5rem), 1fr));
    gap: 0.6rem;
  }
  .game {
    position: relative;
    display: grid;
    align-content: start;
    gap: 0.2rem;
    padding: 0.9rem 1rem;
    color: var(--fg);
    text-decoration: none;
    transition: border-color 120ms, transform 120ms;
  }
  .game:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }
  .game.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .gzh {
    font-size: 1.3rem;
    font-style: italic;
    color: var(--accent);
    line-height: 1.2;
  }
  .gt {
    font-weight: 650;
  }
  .gd {
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .best {
    position: absolute;
    top: 0.7rem;
    right: 0.8rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--gold);
  }
  .stage {
    margin-top: 1.8rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    max-width: 46rem;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.4rem;
    margin: 0 0 0.4rem;
  }
</style>

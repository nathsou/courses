<script lang="ts">
  /** Every word the course teaches, by level: search, filter, listen, add to the review deck. */
  import { base } from '$app/paths';
  import { settings } from '$lib/state/settings.svelte';
  import { deck } from '$lib/srs/deck.svelte';
  import { taught, headword, bare, LEVELS, type Level, type Entry } from '$lib/de/lexicon';
  import { transliterate } from '$lib/de/check';
  import { lessonBySlug, LESSONS } from '$content/outline';
  import { speech } from '$lib/audio/speech.svelte';
  import { State } from 'ts-fsrs';
  import Icon from '$lib/components/ui/Icon.svelte';

  let level = $state<Level | 'all'>('A1');
  let query = $state('');
  let pos = $state<'all' | 'n' | 'v' | 'a' | 'x'>('all');
  let status = $state<'all' | 'new' | 'deck' | 'known'>('all');
  let limit = $state(200);

  const order = new Map(LESSONS.map((l, i) => [l.slug, i]));
  const words = $derived(
    taught(level === 'all' ? undefined : level).sort(([a, x], [b, y]) => (order.get(x.s!) ?? 0) - (order.get(y.s!) ?? 0) || bare(a).localeCompare(bare(b), 'de')),
  );
  const stateOf = $derived.by(() => {
    void deck.version;
    const m = new Map<string, 'deck' | 'known'>();
    for (const c of Object.values(deck.data.cards)) if (c.kind === 'read') m.set(c.word, c.card.state === State.Review ? 'known' : 'deck');
    return m;
  });
  const norm = (s: string) => transliterate(s.toLowerCase()).replace(/\s+/g, ' ');
  const filtered = $derived.by(() => {
    const q = norm(query.trim());
    return words.filter(([k, e]) => {
      const st = stateOf.get(k) ?? 'new';
      if (status !== 'all' && st !== status) return false;
      if (pos !== 'all' && e.p !== pos) return false;
      if (!q) return true;
      return norm(k).includes(q) || norm(e.g).includes(q) || (e.pl ? norm(e.pl).includes(q) : false);
    });
  });
  const missing = $derived(words.filter(([k]) => !stateOf.has(k)).length);
  const POS: Record<Entry['p'], string> = { n: 'nouns', v: 'verbs', a: 'adjectives', x: 'other' };

  function addAll() {
    const n = deck.add(
      words.filter(([k]) => !stateOf.has(k)).map(([k]) => k),
      level === 'all' ? 'word list' : level,
    );
    alert(`${n} words added to your review deck. New cards are introduced ${settings.data.newPerDay} a day.`);
  }
</script>

<svelte:head><title>Word list · Auf Deutsch</title></svelte:head>

<div class="page">
  <h1>Word list</h1>
  <p class="ui lead">Every word the course teaches, in lesson order, in dictionary notation: nouns with their article and plural, irregular verbs with their principal parts. Tap a word to hear it.</p>

  <div class="controls ui">
    <div class="tabs" role="radiogroup" aria-label="Level">
      {#each [...LEVELS, 'all' as const] as l (l)}
        <button role="radio" aria-checked={level === l} class:on={level === l} onclick={() => ((level = l), (limit = 200))}>{l === 'all' ? 'All' : l}</button>
      {/each}
    </div>
    <input type="search" bind:value={query} placeholder="Search German or English" aria-label="Search" />
    <select bind:value={pos} aria-label="Part of speech">
      <option value="all">All kinds</option>
      {#each Object.entries(POS) as [p, label] (p)}<option value={p}>{label}</option>{/each}
    </select>
    <select bind:value={status} aria-label="Status">
      <option value="all">All words</option>
      <option value="new">Not in my deck</option>
      <option value="deck">In my deck</option>
      <option value="known">Learned</option>
    </select>
  </div>
  <p class="ui summary">
    {filtered.length} of {words.length} words.
    {#if missing > 0}<button class="btn small" onclick={addAll}><Icon name="plus" size={14} />Add the {missing} missing {level === 'all' ? '' : level} words to my deck</button>{/if}
  </p>

  <ul class="list">
    {#each filtered.slice(0, limit) as [k, e] (k)}
      {@const st = stateOf.get(k)}
      {@const hw = headword(k, e)}
      {@const l = e.s ? lessonBySlug(e.s) : undefined}
      <li>
        <button class="row" onclick={() => speech.say(k)}>
          <span class="w" lang="de">{#if e.p === 'n' && e.a}<span class="g-{e.a}">{hw.head}</span>{:else}{hw.head}{/if}<span class="x">{hw.extra}</span></span>
          <span class="g">{e.g}</span>
          <span class="st ui {st ?? 'new'}">{st === 'known' ? 'learned' : st === 'deck' ? 'in deck' : ''}</span>
        </button>
        {#if l}<a class="src ui" href="{base}/learn/{l.slug}/" title="Lesson {l.number}: {l.title}">L{l.number}</a>{/if}
      </li>
    {/each}
  </ul>
  {#if filtered.length > limit}<button class="btn" onclick={() => (limit += 400)}>Show more</button>{/if}
</div>

<style>
  .page {
    padding: 2.2rem clamp(1rem, 4vw, 3.5rem) 4rem;
    max-width: 52rem;
  }
  h1 {
    margin: 0 0 0.3rem;
  }
  .lead {
    color: var(--ink-2);
    margin: 0 0 1rem;
    font-size: 0.92rem;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .tabs {
    display: inline-flex;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: 2px;
  }
  .tabs button {
    border: none;
    background: none;
    border-radius: 999px;
    padding: 0.3rem 0.85rem;
    font-weight: 650;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--mute);
  }
  .tabs button.on {
    background: var(--accent);
    color: #fff;
  }
  input[type='search'],
  select {
    padding: 0.45rem 0.7rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    font-size: 0.9rem;
  }
  input[type='search'] {
    flex: 1;
    min-width: 12rem;
  }
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    font-size: 0.85rem;
    color: var(--mute);
  }
  .list {
    list-style: none;
    margin: 0.5rem 0 1rem;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .list li {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--line);
  }
  .row {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) auto;
    gap: 0.3rem 0.8rem;
    align-items: baseline;
    padding: 0.45rem 0.4rem;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    color: var(--fg);
    font-family: var(--font-body);
  }
  .row:hover {
    background: var(--pn);
  }
  .w {
    font-size: 1.08rem;
    font-weight: 620;
  }
  .x {
    font-weight: 400;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .g {
    font-size: 0.92rem;
    color: var(--ink-2);
  }
  .src {
    display: grid;
    place-items: center;
    min-width: 2.2rem;
    font-size: 0.72rem;
    color: var(--mute);
    text-decoration: none;
  }
  .src:hover {
    color: var(--accent-ink);
  }
  .st {
    font-size: 0.72rem;
    font-weight: 650;
    border-radius: 999px;
    padding: 0 0.45rem;
  }
  .st.deck {
    background: var(--gold-soft);
    color: var(--gold);
  }
  .st.known {
    background: var(--jade-soft);
    color: var(--jade);
  }
  @media (max-width: 600px) {
    .row {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .g {
      grid-column: 1;
    }
  }
</style>

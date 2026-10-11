<script lang="ts">
  /** The word card: meaning, gender and plural, verb forms, level, audio, and "add to review". */
  import { lookup, headword, bare, GENDER_NAMES, type Entry } from '$lib/de/lexicon';
  import { deck } from '$lib/srs/deck.svelte';
  import { popover } from './popover.svelte';
  import PlayButton from './PlayButton.svelte';
  import Icon from '../ui/Icon.svelte';
  import { wordCardPosition } from './position';
  import { verbTable, PERSONS } from '$lib/de/verbs';

  let card: HTMLElement | undefined = $state();
  const t = $derived(popover.token);
  const keys = $derived((t?.k ?? []).filter((k) => lookup(k)));
  let pick = $state(0);
  $effect(() => {
    void t;
    pick = 0;
    showTable = false;
  });
  const key = $derived(keys[pick] ?? keys[0]);
  const entry = $derived<Entry | undefined>(key ? lookup(key) : undefined);
  const hw = $derived(key && entry ? headword(key, entry) : null);
  const isForm = $derived(!!t && !!key && bare(key) !== t.t && key !== t.t);
  const inDeck = $derived(key ? deck.has(key) : false);
  let showTable = $state(false);
  const table = $derived(key && entry?.p === 'v' ? verbTable(key) : undefined);

  let pos = $state({ left: 8, top: 8 });
  $effect(() => {
    if (!popover.anchor || !card) return;
    void showTable;
    void pick;
    pos = wordCardPosition(popover.anchor, { width: card.offsetWidth, height: card.offsetHeight }, { width: innerWidth, height: innerHeight });
    card.focus({ preventScroll: true });
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && popover.token) popover.close(true);
  }
  function onDown(e: PointerEvent) {
    if (popover.token && card && !card.contains(e.target as Node)) popover.close();
  }
  function onScroll(e: Event) {
    if (!popover.token || (e.target instanceof Node && card?.contains(e.target))) return;
    // A scroll-into-view event can arrive after the click that opened the card.
    const now = popover.opener?.getBoundingClientRect();
    const anchor = popover.anchor;
    if (!now || !anchor || Math.abs(now.top - anchor.top) > 0.5 || Math.abs(now.left - anchor.left) > 0.5) popover.close();
  }
  const POS: Record<Entry['p'], string> = { n: 'noun', v: 'verb', a: 'adjective / adverb', x: '' };
</script>

<svelte:window onkeydown={onKey} onpointerdown={onDown} onscroll={onScroll} onresize={() => popover.close()} />

{#if t}
  <div bind:this={card} class="wordcard card ui" role="dialog" aria-label="Word: {t.t}" tabindex="-1" style="left: {pos.left}px; top: {pos.top}px">
    <div class="head">
      <span class="hw" lang="de">
        {#if hw && entry?.p === 'n' && entry.a}
          <span class="g-{entry.a}">{hw.head}</span>{hw.extra}
        {:else if hw}
          {hw.head}<span class="extra">{hw.extra}</span>
        {:else}
          {t.t}
        {/if}
      </span>
      <div class="audio">
        <PlayButton text={key ?? t.t} />
        <PlayButton text={key ?? t.t} slow />
        <button type="button" class="btn small ghost" aria-label="Close word card" onclick={() => popover.close(true)}><Icon name="x" size={16} /></button>
      </div>
    </div>
    {#if isForm}<p class="form">“<span lang="de">{t.t}</span>” is a form of this word.</p>{/if}
    {#if entry}
      <p class="gloss">{entry.g}</p>
      <p class="meta">
        {#if entry.p === 'n' && entry.a}<span class="pos g-{entry.a}">{GENDER_NAMES[entry.a]}{entry.a === 'pl' ? ' only' : ''}</span>{:else if POS[entry.p]}<span class="pos">{POS[entry.p]}</span>{/if}
        {#if entry.p === 'n' && entry.pl}<span>plural <b lang="de">die {entry.pl}</b></span>{:else if entry.p === 'n' && entry.pl === null}<span>no plural</span>{/if}
        {#if entry.gs}<span>genitive <b lang="de">des {entry.gs}</b> (n-noun)</span>{/if}
        {#if entry.v}<span lang="de"><b>{entry.v[0]}</b> · <b>{entry.v[1]}</b> · <b>{entry.v[3] === 's' ? 'ist' : entry.v[3] === 'hs' ? 'hat/ist' : 'hat'} {entry.v[2]}</b></span>{/if}
        {#if entry.c}<span lang="de"><b>{entry.c[0]}</b> · <b>{entry.c[1]}</b></span>{/if}
      </p>
      {#if table}
        <button class="btn small ghost tbtn" aria-expanded={showTable} onclick={() => (showTable = !showTable)}><Icon name="book" size={14} />Present tense</button>
        {#if showTable}
          <table class="conj" lang="de">
            <tbody>
              {#each [0, 1, 2] as i (i)}
                <tr><td class="p">{PERSONS[i]}</td><td>{table.pres[i]}</td><td class="p">{PERSONS[i + 3]}</td><td>{table.pres[i + 3]}</td></tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/if}
    {:else}
      <p class="gloss muted">Not in the course dictionary.</p>
    {/if}
    {#if keys.length > 1}
      <p class="also">Or: {#each keys as k, i (k)}{#if i !== pick}<button class="chip" onclick={() => (pick = i)} lang="de">{k}</button>{/if}{/each}</p>
    {/if}
    <div class="foot">
      {#if entry?.l}<span class="lvl" title="The course teaches this at {entry.l}">{entry.l}</span>{/if}
      <span class="spacer"></span>
      {#if inDeck}
        <span class="in"><Icon name="check" size={15} /> In your review deck</span>
      {:else if entry && key}
        <button class="btn small" onclick={() => deck.add([key], 'word card')}><Icon name="plus" size={15} /> Add to review</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .wordcard {
    position: fixed;
    z-index: 80;
    width: min(21rem, calc(100vw - 16px));
    padding: 0.9rem 1rem 0.8rem;
    box-shadow: var(--shadow-lg);
    font-size: 0.9rem;
    line-height: 1.45;
    max-height: calc(100dvh - 16px);
    overflow: auto;
    overflow-wrap: anywhere;
  }
  .wordcard:focus {
    outline: none;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .hw {
    min-width: 0;
    font-family: var(--font-body);
    font-size: 1.45rem;
    font-weight: 650;
    line-height: 1.2;
    padding-top: 0.2rem;
  }
  .extra {
    font-weight: 450;
    font-size: 0.95rem;
    color: var(--ink-2);
  }
  .audio {
    display: flex;
    flex: none;
    align-items: center;
  }
  .form {
    margin: 0.2rem 0 0;
    font-size: 0.8rem;
    color: var(--mute);
  }
  .gloss {
    margin: 0.35rem 0 0;
    font-size: 0.98rem;
  }
  .muted {
    color: var(--mute);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.8rem;
    margin: 0.35rem 0 0;
    color: var(--ink-2);
    font-size: 0.82rem;
  }
  .pos {
    font-weight: 650;
  }
  .pos[class*='g-'] {
    color: var(--g, inherit);
  }
  .tbtn {
    margin-top: 0.4rem;
    padding-left: 0;
  }
  .conj {
    border-collapse: collapse;
    font-size: 0.85rem;
    margin: 0.2rem 0 0;
  }
  .conj td {
    padding: 0.1rem 0.5rem 0.1rem 0;
  }
  .conj .p {
    color: var(--mute);
  }
  .also {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: var(--mute);
  }
  .chip {
    border: 1px solid var(--line-strong);
    background: var(--pn);
    border-radius: 999px;
    padding: 0 0.5rem;
    margin: 0 0.15rem;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .spacer {
    flex: 1;
  }
  .lvl {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.45rem;
    border-radius: 999px;
    background: var(--gold-soft);
    color: var(--gold);
  }
  .in {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--jade);
    font-weight: 600;
    font-size: 0.82rem;
  }
</style>

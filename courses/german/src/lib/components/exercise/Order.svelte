<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * Build the German sentence from tiles. Word order is where German grammar lives: the verb in
   * second place, the participle at the end, the verb last after weil. Tiles are shown in lower
   * case (except nouns and names) so the capital does not give the first word away, and every
   * accepted order counts.
   */
  import type { Order } from '$lib/exercises/types';
  import { Sequence } from '$lib/exercises/sequence.svelte';
  import { scramble } from '$lib/exercises/shuffle';
  import { settings } from '$lib/state/settings.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import Steps from './Steps.svelte';
  import Feedback from './Feedback.svelte';
  import De from '../de/De.svelte';
  import { dict } from '$lib/de/lexicon';

  let { data, id, report }: { data: Order; id: string; report: (ok: boolean) => void } = $props();
  const seq = new Sequence(untrack(() => data.items.length));
  const item = $derived(data.items[seq.index]!);
  const punct = $derived(/[.!?]$/.exec(item.de)?.[0] ?? '');
  const clean = (s: string) => s.replace(/[.!?]$/, '').split(/\s+/).map((t) => t.replace(/_/g, ' '));
  /** The first word in lower case unless it is a noun or name ("Heute" → "heute", "Anna" stays). */
  const lowerFirst = (t: string) => {
    const l = t.charAt(0).toLowerCase() + t.slice(1);
    return l !== t && dict.forms(l.split(' ')[0]!)?.length ? l : t;
  };
  const answer = $derived(clean(item.de).map((t, i) => (i === 0 ? lowerFirst(t) : t)));
  const norm = (ts: string[]) => ts.map((t, i) => (i === 0 ? lowerFirst(t) : t)).join('|');
  const accepted = $derived([item.de, ...(item.also ?? [])].map((s) => norm(clean(s))));
  type Tile = { k: number; t: string };
  const tiles = $derived<Tile[]>(scramble([...answer, ...(item.extra ?? []).map((x) => x.replace(/_/g, ' '))], `${id}:${seq.index}:${seq.round}`).map((t, k) => ({ k, t })));
  let placed = $state<Tile[]>([]);
  let last = $state<boolean | null>(null);
  const bank = $derived(tiles.filter((t) => !placed.some((p) => p.k === t.k)));
  const sentence = $derived(placed.length ? (() => { const s = placed.map((p) => p.t).join(' '); return s.charAt(0).toUpperCase() + s.slice(1) + punct; })() : '');

  $effect(() => {
    void seq.index;
    void seq.round;
    placed = [];
    last = null;
  });

  function add(t: Tile) {
    if (seq.settled) return;
    placed = [...placed, t];
    last = null;
  }
  function remove(t: Tile) {
    if (seq.settled) return;
    placed = placed.filter((p) => p.k !== t.k);
    last = null;
  }
  function check() {
    const ok = accepted.includes(norm(placed.map((p) => p.t)));
    seq.attempt(ok);
    last = ok;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    if (ok) void speech.say(sentence);
  }
  function reveal() {
    const used = new Set<number>();
    placed = answer.map((t) => {
      const tile = tiles.find((x) => x.t === t && !used.has(x.k))!;
      used.add(tile.k);
      return tile;
    });
    last = null;
  }
</script>

<Steps {seq} {report} canReveal={last === false} onreveal={reveal}>
  <p class="en">“{item.en}”</p>
  <div class="answer" class:ok={seq.settled} aria-label="Your sentence">
    {#if seq.settled}
      <span class="done"><De text={sentence} size="md" /></span>
    {:else}
    {#each placed as t, i (t.k)}
      <button class="tile placed" onclick={() => remove(t)} disabled={seq.settled}><De text={i === 0 ? t.t.charAt(0).toUpperCase() + t.t.slice(1) : t.t} size="md" plain genders="hide" play={false} /></button>
    {:else}
      <span class="placeholder ui">Tap the tiles in order</span>
    {/each}
    {/if}
  </div>
  <div class="bank" aria-label="Tiles">
    {#each bank as t (t.k)}
      <button class="tile" onclick={() => add(t)} disabled={seq.settled}><De text={t.t} size="md" plain genders="hide" play={false} /></button>
    {/each}
  </div>
  {#snippet feedback()}
    {#if seq.settled}
      <Feedback ok={last ?? false} explain={item.explain} />
    {:else if last === false}
      <Feedback ok={false} text="Not that order. Tap a tile to take it back." />
    {:else}
      <button class="btn" disabled={placed.length < answer.length} onclick={check}>Check</button>
    {/if}
  {/snippet}
</Steps>

<style>
  .en {
    margin: 0 0 0.7rem;
    font-size: 1.05rem;
    font-style: italic;
  }
  .answer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    min-height: 3.6rem;
    padding: 0.45rem;
    border-bottom: 2px solid var(--line-strong);
    margin-bottom: 0.9rem;
    align-items: center;
  }
  .answer.ok {
    border-color: var(--jade);
  }
  .placeholder {
    color: var(--mute);
    font-size: 0.85rem;
    padding-left: 0.3rem;
  }
  .bank {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    min-height: 3rem;
  }
  .tile {
    padding: 0.2rem 0.65rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    border-bottom-width: 3px;
    background: var(--panel);
    cursor: pointer;
    transition: transform 80ms, border-color 100ms;
  }
  .tile:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .tile:active:not(:disabled) {
    transform: translateY(2px);
  }
  .done {
    padding: 0.2rem 0.3rem;
  }
  .tile.placed {
    background: var(--pn);
  }
  .tile:disabled {
    cursor: default;
  }
</style>

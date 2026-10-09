<script lang="ts">
  /**
   * Writing practice with words from your deck (or HSK 1): trace characters over an outline, or
   * see a word's meaning and write it from memory.
   */
  import { deck } from '$lib/srs/deck.svelte';
  import { hskWords, lookup } from '$lib/zh/lexicon';
  import { settings } from '$lib/state/settings.svelte';
  import { shuffle } from '$lib/exercises/shuffle';
  import { readJSON, writeJSON } from '$lib/state/storage';
  import Exercise from '$lib/components/exercise/Exercise.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  const KEY = 'mandarin:write-practice';
  let mode = $state<'trace' | 'memory'>(readJSON<{ mode: 'trace' | 'memory' }>(KEY, { mode: 'trace' }).mode);
  function setMode(m: 'trace' | 'memory') {
    mode = m;
    writeJSON(KEY, { mode: m });
  }

  let round = $state(0);
  const isHan = (c: string) => /\p{Script=Han}/u.test(c);
  const data = $derived.by(() => {
    void round;
    const seed = Date.now() % 1e6;
    const mine = Object.values(deck.data.cards).map((c) => c.word).filter((w) => [...w].every(isHan) && lookup(w));
    const hsk1 = hskWords(settings.data.list, 1).map((w) => w.w).filter((w) => [...w].every(isHan));
    if (mode === 'memory') {
      const words = [...new Set(mine.length >= 5 ? mine : [...mine, ...hsk1])].filter((w) => [...w].length <= 3);
      return { title: 'Five words from memory', recall: shuffle(words, seed).slice(0, 5) };
    }
    const chars = [...new Set(mine.flatMap((w) => [...w]))];
    const pool = chars.length >= 8 ? chars : [...new Set([...chars, ...hsk1.flatMap((w) => [...w])])];
    return { title: 'Five characters', chars: shuffle(pool, seed).slice(0, 5).join('') };
  });
</script>

<div class="modes ui" role="radiogroup" aria-label="Writing mode">
  <button role="radio" aria-checked={mode === 'trace'} class="btn small" class:primary={mode === 'trace'} onclick={() => setMode('trace')}><Icon name="brush" size={14} />Trace characters</button>
  <button role="radio" aria-checked={mode === 'memory'} class="btn small" class:primary={mode === 'memory'} onclick={() => setMode('memory')}><Icon name="eye" size={14} />Words from memory</button>
</div>
{#key data}
  <Exercise kind="write" id="practice/write" {data} />
{/key}
<button class="btn" onclick={() => round++}><Icon name="shuffle" size={15} />{mode === 'memory' ? 'Five different words' : 'Five different characters'}</button>

<style>
  .modes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.8rem;
  }
</style>

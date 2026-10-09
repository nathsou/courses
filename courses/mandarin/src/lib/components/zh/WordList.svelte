<script lang="ts">
  /** New words for a lesson section: tap to hear; glosses from the dictionary unless given. */
  import { lookup } from '$lib/zh/lexicon';
  import { speech } from '$lib/audio/speech.svelte';
  import Zh from './Zh.svelte';
  import Icon from '../ui/Icon.svelte';
  import CharBuild from './CharBuild.svelte';
  import { build } from '$lib/zh/components';
  import { settings } from '$lib/state/settings.svelte';
  import { onDestroy } from 'svelte';

  let { items }: { items: { w: string; g?: string }[] } = $props();
  /** The first sense of a gloss, cut at a comma only when it runs long. */
  const firstSense = (g = '') => {
    const sense = g.split(';')[0]!.trim();
    return sense.length > 40 ? sense.split(',')[0]!.trim() : sense;
  };
  const rows = $derived(
    items.map((it) => {
      const plainWord = it.w.replace(/\[[^\]]*\]/g, '');
      const chars = [...plainWord].filter((c) => /\p{Script=Han}/u.test(c));
      return {
        ...it,
        gloss: it.g ?? lookup(plainWord)?.g ?? '',
        // A word's characters and what each means on its own: 米饭 = 米 rice + 饭 meal.
        chars: chars.map((ch) => ({ ch, gloss: firstSense(lookup(ch)?.g), built: !!build(ch) })),
      };
    }),
  );
  const showParts = $derived(settings.data.charParts);
  const anyParts = $derived(rows.some((r) => r.chars.some((c) => c.built)));
  let playingAll = $state(false);
  let run = 0;
  function stop() { run++; playingAll = false; speech.stop(); }
  onDestroy(() => { if (playingAll) stop(); });

  async function playAll() {
    const id = ++run;
    playingAll = true;
    for (const r of rows) {
      if (id !== run) return;
      await speech.say(r.w);
      await new Promise((res) => setTimeout(res, 350));
    }
    if (id === run) playingAll = false;
  }
</script>

<div class="words card">
  <div class="bar ui">
    <span class="label">New words</span>
    <span class="tools">
      {#if anyParts}
        <button class="btn small ghost" aria-pressed={showParts} onclick={() => settings.set('charParts', !showParts)} title="Show how each character is built">
          <Icon name="eye" size={14} />Character parts
        </button>
      {/if}
      <button class="btn small ghost" onclick={() => (playingAll ? stop() : playAll())}>
        <Icon name={playingAll ? 'stop' : 'play'} size={14} />
        {playingAll ? 'Stop' : 'Hear them all'}
      </button>
    </span>
  </div>
  <ul>
    {#each rows as r (r.w)}
      <li>
        <span class="w"><Zh text={r.w} size="md" play={false} /></span>
        <span class="g">{r.gloss}</span>
        {#if r.chars.length > 1 && !showParts}
          <span class="split ui">
            {#each r.chars as c, i (i)}{#if i > 0}<span class="plus"> + </span>{/if}<span class="zh-font" lang="zh-CN">{c.ch}</span> {c.gloss}{/each}
          </span>
        {:else if showParts && r.chars.some((c) => c.built)}
          <span class="split ui">
            {#each r.chars as c, i (i)}
              <span class="char">
                {#if r.chars.length > 1}<span class="cg"><span class="zh-font" lang="zh-CN">{c.ch}</span> {c.gloss}</span>{/if}
                {#if c.built}<CharBuild ch={c.ch} head={r.chars.length === 1} compact />{/if}
              </span>
            {/each}
          </span>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .words {
    margin: 1.5rem 0;
    padding: 0.4rem 0 0.6rem;
    overflow: hidden;
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.2rem 0.6rem 0.2rem 1rem;
  }
  .label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.35rem 1rem;
    border-top: 1px solid var(--line);
    min-width: 0;
    margin: 0;
    flex-wrap: wrap;
    min-height: 3.5rem;
  }
  .w {
    flex: none;
  }
  .g {
    font-size: 0.92rem;
    color: var(--ink-2);
    line-height: 1.35;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.3rem;
  }
  .split {
    flex-basis: 100%;
    display: grid;
    gap: 0.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: -0.2rem 0 0.2rem;
  }
  .split .zh-font {
    font-size: 1.05rem;
  }
  .plus {
    color: var(--mute);
  }
  .char {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.1rem 0.5rem;
  }
  .cg {
    font-weight: 600;
    color: var(--fg);
  }
</style>

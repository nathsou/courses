<script lang="ts">
  /**
   * German text: every word opens its word card on tap (meaning, gender, plural, verb forms,
   * audio), and nouns are coloured by gender when the learner wants that help. Use
   * `genders="hide"` where the colour would give the answer away, and `plain` for text that
   * should not open word cards (answer options, tiles).
   */
  import { annotate, entryFor } from '$lib/de/lexicon';
  import { speech } from '$lib/audio/speech.svelte';
  import { popover } from './popover.svelte';
  import PlayButton from './PlayButton.svelte';

  let {
    text,
    size = 'inline',
    genders = 'auto',
    plain = false,
    play,
  }: {
    text: string;
    size?: 'inline' | 'md' | 'lg' | 'xl' | 'hero';
    genders?: 'auto' | 'hide';
    plain?: boolean;
    /** Show a play button for the whole text (default: for inline sentences of 4+ words). */
    play?: boolean;
  } = $props();

  const tokens = $derived(annotate(text));
  const words = $derived(tokens.filter((t) => t.w).length);
  const showPlay = $derived(play ?? (size === 'inline' && words >= 4));
  const gender = (i: number) => {
    const e = entryFor(tokens[i]!)?.[1];
    return e?.p === 'n' && e.a ? `n-${e.a}` : '';
  };

  function openWord(e: Event, i: number) {
    if (plain) return;
    const t = tokens[i]!;
    e.stopPropagation();
    popover.open(t, e.currentTarget as HTMLElement);
    void speech.say(t.t);
  }

  function key(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openWord(e, i);
    }
  }
</script>

<span class="de {size}" class:no-g={genders === 'hide'} lang="de"
  ><!-- svelte-ignore a11y_no_noninteractive_tabindex -->{#each tokens as t, i (i)}{#if t.w}<span
        class="word {gender(i)}"
        class:plain
        role={plain ? undefined : 'button'}
        tabindex={plain ? undefined : 0}
        onclick={(e) => openWord(e, i)}
        onkeydown={(e) => key(e, i)}
        class:playing={speech.playing === t.t}>{t.t}</span
      >{:else}{t.t}{/if}{/each}{#if showPlay}<PlayButton text={text} small />{/if}</span
>

<style>
  .de {
    font-style: normal;
    font-weight: 560;
  }
  .md {
    font-size: 1.2rem;
  }
  .lg {
    font-size: 1.6rem;
    line-height: 1.4;
  }
  .xl {
    font-size: 2.3rem;
    line-height: 1.3;
  }
  .hero {
    font-size: clamp(2.6rem, 9vw, 4.2rem);
    line-height: 1.15;
  }
  .word {
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 120ms;
    text-decoration: underline dotted color-mix(in srgb, currentColor 30%, transparent);
    text-underline-offset: 0.22em;
    text-decoration-thickness: 1px;
  }
  .word.plain {
    cursor: inherit;
    text-decoration: none;
  }
  .word:focus-visible,
  .word.playing {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }
  /* Hover effects only where there is a real pointer: on iOS a :hover rule turns the first tap
     into a hover, so buttons containing German would need two taps. */
  @media (hover: hover) {
    .word:not(.plain):hover {
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
  }
  /* Gender colours, switchable from the help dial. */
  :global(:root[data-genders='on']) .de:not(.no-g) .n-m {
    color: var(--g-m);
  }
  :global(:root[data-genders='on']) .de:not(.no-g) .n-f {
    color: var(--g-f);
  }
  :global(:root[data-genders='on']) .de:not(.no-g) .n-n {
    color: var(--g-n);
  }
  :global(:root[data-genders='on']) .de:not(.no-g) .n-pl {
    color: var(--g-pl);
  }
</style>

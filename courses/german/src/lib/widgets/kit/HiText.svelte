<script lang="ts">
  /**
   * German with coloured spans: `{…}` marks span 0, 1, … (see marks.ts). `tones` gives each span a
   * colour; `on` limits which spans are lit (the rest read as plain text), and `focus` makes one
   * span stand out. Every word still opens its word card.
   */
  import De from '$lib/components/de/De.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import { segments, unmark, type Tone } from './marks';

  let {
    text,
    tones = [],
    tone = 'accent',
    on,
    focus = -1,
    size = 'inline',
    play = false,
    genders = 'hide',
    strike = false,
  }: {
    text: string;
    /** Colour for each span, by index; spans beyond the list use `tone`. */
    tones?: (Tone | undefined)[];
    tone?: Tone;
    /** Spans to light up (default: all). */
    on?: number[];
    focus?: number;
    size?: 'inline' | 'md' | 'lg';
    play?: boolean;
    genders?: 'auto' | 'hide';
    /** Show lit spans struck through (for words that disappear). */
    strike?: boolean;
  } = $props();

  const segs = $derived(segments(text));
  const lit = (i: number) => i >= 0 && (!on || on.includes(i));
</script>

<span class="hi {size}" lang="de"
  >{#each segs as s, k (k)}{#if lit(s.i)}<mark class="hl t-{tones[s.i] ?? tone}" class:focus={focus === s.i} class:dim={focus >= 0 && focus !== s.i} class:strike
        ><De text={s.t} {genders} play={false} /></mark
      >{:else}<De text={s.t} {genders} play={false} />{/if}{/each}{#if play}<PlayButton text={unmark(text)} small />{/if}</span
>

<style>
  .hi {
    line-height: 1.75;
  }
  .md {
    font-size: 1.15rem;
  }
  .lg {
    font-size: 1.4rem;
    line-height: 1.6;
  }
  .hl {
    --hl: var(--accent-ink);
    color: var(--hl);
    background: color-mix(in srgb, var(--hl) 13%, transparent);
    border-bottom: 2px solid color-mix(in srgb, var(--hl) 60%, transparent);
    border-radius: 4px 4px 1px 1px;
    padding: 0 0.12em;
    margin: 0 -0.02em;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    transition: background-color 200ms, opacity 200ms;
  }
  .hl.focus {
    background: color-mix(in srgb, var(--hl) 24%, transparent);
    border-bottom-color: var(--hl);
  }
  .hl.dim {
    opacity: 0.72;
  }
  .hl.strike {
    text-decoration: line-through;
    text-decoration-thickness: 2px;
  }
  .t-accent {
    --hl: var(--accent-ink);
  }
  .t-jade {
    --hl: var(--jade);
  }
  .t-gold {
    --hl: var(--gold);
  }
  .t-blue {
    --hl: var(--g-m);
  }
  .t-red {
    --hl: var(--g-f);
  }
  .t-green {
    --hl: var(--g-n);
  }
  .t-purple {
    --hl: var(--g-pl);
  }
  .t-mute {
    --hl: var(--mute);
  }
  @media (prefers-reduced-motion: reduce) {
    .hl {
      transition: none;
    }
  }
</style>

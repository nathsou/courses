<script lang="ts">
  /**
   * Text from exercise YAML. English with {German} runs annotated, **bold** and *italic*
   * supported, ___ as a gap. With `de`, the whole string is German (word cards, gender colours).
   * Without it, a string is treated as German when it looks German (see isGerman).
   */
  import De from '../de/De.svelte';
  import { isGerman } from '$lib/de/lexicon';
  let {
    text,
    size = 'inline',
    plain = false,
    genders = 'auto',
    de,
  }: { text: string; size?: 'inline' | 'md' | 'lg'; plain?: boolean; genders?: 'auto' | 'hide'; de?: boolean } = $props();
  const RUN = /(\{[^{}]+\}|\*\*[^*]+\*\*|\*[^*]+\*|_{3,})/g;
  const whole = $derived(de ?? isGerman(String(text ?? '')));
  const parts = $derived(String(text ?? '').split(RUN).filter((p) => p !== ''));
</script>

{#if whole && !String(text).includes('___')}<De {text} {size} {plain} {genders} play={false} />{:else}{#each parts as p, i (i)}{#if p.startsWith('{')}<De text={p.slice(1, -1)} {size} {plain} {genders} play={false} />{:else if p.startsWith('**')}<strong>{p.slice(2, -2)}</strong>{:else if p.startsWith('*')}<em>{p.slice(1, -1)}</em>{:else if /^_{3,}$/.test(p)}<span class="gap">＿＿</span>{:else if whole}<De text={p} {size} {plain} {genders} play={false} />{:else}{p}{/if}{/each}{/if}

<style>
  .gap {
    display: inline-block;
    min-width: 2.6em;
    border-bottom: 2px solid var(--accent);
    color: transparent;
    margin: 0 0.15em;
  }
</style>

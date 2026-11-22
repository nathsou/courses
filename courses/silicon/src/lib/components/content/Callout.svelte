<script lang="ts" module>
  import type { IconName } from '../ui/Icon.svelte';

  const KINDS: Record<string, { label: string; icon: IconName; hue: string; on: string }> = {
    check: { label: 'Check yourself', icon: 'check', hue: 'var(--ok)', on: 'var(--fx-cream)' },
    note: { label: 'Note', icon: 'note', hue: 'var(--fx-blue)', on: 'var(--fx-cream)' },
    info: { label: 'Info', icon: 'info', hue: 'var(--fx-blue)', on: 'var(--fx-cream)' },
    tip: { label: 'Tip', icon: 'tip', hue: 'var(--fx-yellow)', on: 'var(--fx-ink)' },
    warning: { label: 'Caution', icon: 'warning', hue: 'var(--fx-red)', on: 'var(--fx-cream)' },
    fab: { label: 'In the fab', icon: 'lab', hue: 'var(--ac)', on: 'var(--fx-ink)' },
    know: { label: 'How do we know?', icon: 'eye', hue: 'var(--fx-blue)', on: 'var(--fx-cream)' },
    scale: { label: 'Sense of scale', icon: 'ruler', hue: 'var(--fg)', on: 'var(--bg)' },
    software: { label: 'In software terms', icon: 'code', hue: 'var(--series-4)', on: 'var(--fx-cream)' },
    source: { label: 'In their words', icon: 'quote', hue: 'var(--mute)', on: 'var(--bg)' },
    challenge: { label: 'Challenge', icon: 'challenge', hue: 'var(--fx-yellow)', on: 'var(--fx-ink)' },
    exercises: { label: 'Exercises', icon: 'exercises', hue: 'var(--fx-blue)', on: 'var(--fx-cream)' },
    definition: { label: 'Definition', icon: 'definition', hue: 'var(--fg)', on: 'var(--bg)' },
    key: { label: 'Key idea', icon: 'key', hue: 'var(--fx-red)', on: 'var(--fx-cream)' },
    question: { label: 'Think about it', icon: 'question', hue: 'var(--fx-yellow)', on: 'var(--fx-ink)' },
    aside: { label: 'Aside', icon: 'aside', hue: 'var(--mute)', on: 'var(--bg)' },
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../ui/Icon.svelte';

  let { kind = 'note', title, children }: { kind?: string; title?: string; children?: Snippet } = $props();
  const k = $derived(KINDS[kind] ?? KINDS.note!);
</script>

<aside class="callout" data-kind={kind} style:--hue={k.hue} style:--on-hue={k.on}>
  <header class="ui">
    <span class="icon"><Icon name={k.icon} size={16} /></span>
    <span class="label">{k.label}</span>
    {#if title}<span class="title">{title}</span>{/if}
  </header>
  <div class="body">{@render children?.()}</div>
</aside>

<style>
  .callout {
    margin: 1.9rem 0;
    padding: 0.9rem 1.2rem 0.3rem;
    background: var(--pn);
    border-left: 3px solid var(--hue);
    border-radius: 0 var(--radius) var(--radius) 0;
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }
  .icon {
    display: inline-flex;
    padding: 0.2rem;
    border-radius: 50%;
    background: var(--hue);
    color: var(--on-hue);
  }
  .label {
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 600;
    font-size: 0.72rem;
    color: var(--ink);
  }
  .title {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--ink);
  }
  .title::before {
    content: '·';
    margin-right: 0.5rem;
    color: var(--ink-3);
  }
  .body {
    font-size: 1.04rem;
  }
  .body :global(p) {
    margin: 0 0 0.75rem;
  }
  .body :global(ol),
  .body :global(ul) {
    margin: 0 0 0.75rem;
    padding-left: 1.3rem;
  }
</style>

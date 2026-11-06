<!-- A card program shown (and runnable) in the text, from a ```deck block. -->
<script lang="ts">
  import CardEditor from '../engine/CardEditor.svelte';
  let { src, caption }: { src: string; caption?: string } = $props();
  // svelte-ignore state_referenced_locally
  let value = $state(src);
</script>

<figure class="deck">
  <CardEditor bind:value rows={Math.min(16, src.split('\n').length + 1)} />
  {#if caption}<figcaption class="ui">{caption}</figcaption>{/if}
</figure>

<style>
  .deck {
    margin: 1.75rem 0;
    padding: 0.8rem 1rem 0.9rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface);
  }
  figcaption {
    margin-top: 0.5rem;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
</style>

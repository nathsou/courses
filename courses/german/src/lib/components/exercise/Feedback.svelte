<script lang="ts">
  /** Right/wrong feedback line; explanations may contain {German}. */
  import Rich from './Rich.svelte';
  let { ok, text = '', explain, almost = false }: { ok: boolean | null; text?: string; explain?: string; almost?: boolean } = $props();
</script>

{#if ok !== null}
  <p class="fb" class:ok class:bad={!ok} class:almost>
    <strong lang="de">{ok ? (almost ? 'Fast!' : 'Richtig!') : 'Nicht ganz.'}</strong>
    {#if text}<Rich {text} de={false} />{/if}
    {#if explain}<span class="ex"><Rich text={explain} de={false} /></span>{/if}
  </p>
{/if}

<style>
  .fb {
    margin: 0;
  }
  .fb strong {
    font-size: 1rem;
    margin-right: 0.2rem;
  }
  .ok strong {
    color: var(--jade);
  }
  .almost strong {
    color: var(--gold);
  }
  .bad strong {
    color: var(--accent-ink);
  }
  .ex {
    display: block;
    color: var(--ink-2);
    margin-top: 0.15rem;
  }
</style>

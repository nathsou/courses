<script lang="ts">
  import { base } from '$app/paths';
  import { tick } from 'svelte';
  import { findEntry } from '$lib/content/registry';
  import { settings } from '$lib/state/settings.svelte';
  import { localiseIn } from '$lib/components/exercise/localise.svelte';
  let { items }: { items: { id: string; term: string; definition: string; chapter?: string }[] } = $props();
  let q = $state('');
  const shown = $derived(items.filter((g) => !q || `${g.term} ${g.definition}`.toLowerCase().includes(q.toLowerCase())));
  let el: HTMLElement | undefined = $state();
  // Note names, chords and terms in the entries follow the reader's settings, including entries shown again after filtering.
  $effect(() => {
    void shown;
    void settings.noteNames;
    void settings.terms;
    void settings.accentedRe;
    tick().then(() => el && localiseIn(el));
  });
</script>

<div class="glossary wide ui" bind:this={el}>
  <input class="search" type="search" placeholder="Filter {items.length} terms…" bind:value={q} aria-label="Filter glossary" />
  <dl>
    {#each shown as g (g.id)}
      {@const ch = g.chapter ? (findEntry('chapter', g.chapter) ?? findEntry('appendix', g.chapter)) : undefined}
      <dt id="term-{g.id}">{g.term}</dt>
      <dd>
        {@html g.definition}
        {#if ch?.available}<a class="where" href="{base}{ch.href}">{ch.kind === 'appendix' ? 'Appendix' : 'Chapter'} {ch.number}</a>{/if}
      </dd>
    {/each}
  </dl>
</div>

<style>
  .glossary {
    margin: 1.5rem 0;
    font-size: 0.9rem;
  }
  dl {
    display: grid;
    grid-template-columns: minmax(8rem, 13rem) 1fr;
    gap: 0.5rem 1.25rem;
    margin: 0;
  }
  dt {
    font-weight: 650;
  }
  dd {
    margin: 0;
    color: var(--ink-2);
    line-height: 1.5;
  }
  .where {
    font-size: 0.78rem;
    margin-left: 0.4rem;
    white-space: nowrap;
  }
  @media (max-width: 640px) {
    dl {
      grid-template-columns: 1fr;
    }
    dd {
      margin-bottom: 0.4rem;
    }
  }
</style>

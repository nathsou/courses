<script lang="ts">
  // TEMPORARY harness (to be deleted): renders one of the grammar widgets, lazily.
  import type { Component } from 'svelte';
  import { page } from '$app/state';
  const modules = import.meta.glob<{ default: Component<Record<string, unknown>> }>([
    '/src/lib/widgets/ArticleTable.svelte', '/src/lib/widgets/CaseMachine.svelte', '/src/lib/widgets/AdjectiveEndings.svelte', '/src/lib/widgets/WordOrder.svelte',
    '/src/lib/widgets/SeparableVerbs.svelte', '/src/lib/widgets/PerfectBuilder.svelte', '/src/lib/widgets/Conjugator.svelte', '/src/lib/widgets/ConnectorLab.svelte',
  ]);
  const only = $derived(page.url.searchParams.get('only') ?? 'ArticleTable');
  const props = $derived(Object.fromEntries([...page.url.searchParams].filter(([k]) => k !== 'only')));
  const load = $derived(modules[`/src/lib/widgets/${only}.svelte`]?.());
</script>

<div class="gallery prose">
  <h1>{only}</h1>
  {#await load then m}{#if m}<m.default {...props} />{/if}{/await}
</div>

<style>
  .gallery {
    padding: 2rem clamp(1rem, 4vw, 3.5rem) 4rem;
  }
</style>

<script lang="ts">
  /**
   * Development gallery: every widget with its default props, for checking layout and behaviour
   * (npm run dev, then /dev/widgets/; ?only=WordOrder shows one). Not linked from the course, so
   * the static build does not include it.
   */
  import type { Component } from 'svelte';
  import { page } from '$app/state';
  const modules = import.meta.glob<{ default: Component }>('/src/lib/widgets/*.svelte', { eager: true });
  const only = $derived(page.url.searchParams.get('only'));
  const widgets = $derived(
    Object.entries(modules)
      .map(([path, m]) => ({ name: path.split('/').pop()!.replace('.svelte', ''), C: m.default }))
      .filter((w) => !only || w.name === only),
  );
</script>

<div class="gallery prose">
  <h1>Widgets</h1>
  {#each widgets as w (w.name)}
    <h2 id={w.name}>{w.name}</h2>
    <w.C />
  {/each}
</div>

<style>
  .gallery {
    padding: 2rem clamp(1rem, 4vw, 3.5rem) 4rem;
  }
</style>

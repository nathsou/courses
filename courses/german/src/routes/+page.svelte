<script lang="ts">
  import { base } from '$app/paths';
  import { PARTS } from '$content/outline';
  import { hasLesson } from '$lib/content/lessons';
</script>

<svelte:head><title>Auf Deutsch</title></svelte:head>

<div class="map">
  <h1>Auf Deutsch</h1>
  {#each PARTS as p (p.id)}
    <h2>{p.level} · {p.de}</h2>
    <ul>
      {#each p.lessons as l (l.slug)}
        <li>{#if hasLesson(l.slug)}<a href="{base}/learn/{l.slug}/">{l.title}</a>{:else}{l.title}{/if}</li>
      {/each}
    </ul>
  {/each}
</div>

<style>
  .map {
    padding: 2rem;
  }
</style>

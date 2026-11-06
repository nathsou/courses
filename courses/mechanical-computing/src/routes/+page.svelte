<script lang="ts">
  import { base } from '$app/paths';
  import { PARTS, APPENDICES, COURSE_TITLE, COURSE_SUBTITLE } from '$content/outline';
  import { ALL_ENTRIES } from '$lib/content/registry';
  const available = new Set(ALL_ENTRIES.filter((e) => e.available).map((e) => `${e.kind}:${e.slug}`));
  const first = ALL_ENTRIES.find((e) => e.available);
</script>

<svelte:head><title>{COURSE_TITLE}</title></svelte:head>
<div class="home">
  <h1>{COURSE_TITLE}</h1>
  <p>{COURSE_SUBTITLE}</p>
  {#if first}<a href="{base}{first.href}">Start</a>{/if}
  {#each PARTS as part (part.id)}<h3>{part.title}</h3>{#each part.chapters as c (c.slug)}<p>{#if available.has(`chapter:${c.slug}`)}<a href="{base}/chapters/{c.slug}/">{c.title}</a>{:else}{c.title}{/if}</p>{/each}{/each}
  {#each APPENDICES as a (a.slug)}<p>{a.title}</p>{/each}
</div>

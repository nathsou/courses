<script lang="ts">
  import { base } from '$app/paths';
  import { chapters } from '$lib/outline';
  import Interactive from '$lib/components/Interactive.svelte';
  import Question from '$lib/components/Question.svelte';
  import Notebook from '$lib/components/Notebook.svelte';
  import VideoReference from '$lib/components/VideoReference.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const chapter = $derived(data.chapter);
  const previous = $derived(chapters[chapter.number-2]);
  const next = $derived(chapters[chapter.number]);
</script>
<svelte:head><title>{chapter.title} — Human Evolution</title><meta name="description" content={chapter.question}/></svelte:head>
<article class="article">
  <header class="chapter-header"><span class="eyebrow">Lecture {String(chapter.number).padStart(2,'0')} / 06 · {chapter.subtitle}</span><h1>{chapter.title}</h1><p class="chapter-question">{chapter.question}</p><div class="chapter-info"><span>≈ {chapter.minutes} minutes with activities</span><span>Three reading sessions</span></div><p class="chapter-original">Based on <span lang="fr">{chapter.original}</span> · Jean-Jacques Hublin · {chapter.date}</p></header>
  {#key chapter.slug}
    {#each chapter.blocks as block}
      {#if block.kind === 'text'}<div class="prose">{@html block.html}</div>
      {:else if block.kind === 'figure'}<Interactive id={block.id}/>
      {:else if block.kind === 'question'}<Question id={block.id}/>
      {:else}<VideoReference {chapter} start={block.start} end={block.end} label={block.label}/>{/if}
    {/each}
    <Notebook slug={chapter.slug} prompt={chapter.question}/>
  {/key}
  <nav class="chapter-navigation" aria-label="Previous and next chapters"><a href={previous?`${base}/ch/${previous.slug}/`:`${base}/`}><small>← {previous?'Previous lecture':'Course opening'}</small>{previous?.title??'The human energy puzzle'}</a><a href={next?`${base}/ch/${next.slug}/`:`${base}/resources/`}><small>{next?'Next lecture':'Further reading'} →</small>{next?.title??'Sources & field glossary'}</a></nav>
</article>

<!-- Engraving reference: every feature the engraver supports, for review by eye. Not linked from the course. -->
<script lang="ts">
  import Score from '$lib/notation/Score.svelte';
  import { GALLERY } from '$lib/notation/gallery';
</script>

<svelte:head><title>Engraving reference</title><meta name="robots" content="noindex" /></svelte:head>

<div class="gallery">
  <h1>Engraving reference</h1>
  {#each GALLERY as g (g.title)}
    <section>
      <h2 class="ui">{g.title}</h2>
      <Score src={g.src} caption={g.title} label={g.title} />
    </section>
  {/each}
</div>

<style>
  .gallery {
    max-width: 60rem;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
  }
  h2 {
    font-size: 0.85rem;
    margin: 2rem 0 0;
    color: var(--mute);
  }
</style>

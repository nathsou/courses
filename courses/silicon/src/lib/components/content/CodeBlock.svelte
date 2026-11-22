<!-- A design in the course's HDL, shown with highlighting (```hdl blocks). -->
<script lang="ts">
  import { highlightHdl } from '$lib/eda/highlight';
  let { src, caption }: { src: string; caption?: string } = $props();
  const html = $derived(highlightHdl(src.replace(/\n$/, '')));
</script>

<figure class="code">
  <pre class="hdl-code"><code>{@html html}</code></pre>
  {#if caption}<figcaption class="ui">{caption}</figcaption>{/if}
</figure>

<style>
  .code {
    margin: 1.4rem 0;
  }
  figcaption {
    margin-top: 0.4rem;
    font-size: 0.84rem;
    color: var(--ink-2);
  }
</style>

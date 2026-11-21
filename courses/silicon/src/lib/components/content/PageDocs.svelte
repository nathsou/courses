<!-- Makes the page's references and glossary available to citations and glossary terms. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setPageDocs, type PageDocs } from './context';

  let { docs, children }: { docs: PageDocs; children: Snippet } = $props();
  setPageDocs({
    get references() {
      return docs.references;
    },
    get glossary() {
      return docs.glossary;
    },
  });
</script>

{@render children()}
